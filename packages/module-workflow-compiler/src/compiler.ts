import Handlebars from 'handlebars';
import type { WorkflowDefinition, WorkflowStateDefinition } from '@oven/module-workflows/types';
import { topologicalSortStates, sanitizeIdentifier, resolvePathToJs, buildInputObject } from './utils';
import { registerHelpers } from './helpers';
import {
  workflowTemplate,
  importsTemplate,
  apiCallTemplate,
  conditionTemplate,
  setVariableTemplate,
  delayTemplate,
  transformTemplate,
  sqlQueryTemplate,
  forEachTemplate,
  whileLoopTemplate,
  eventEmitTemplate,
  endTemplate,
  passTemplate,
} from './templates';

// ─── Types ──────────────────────────────────────────────────────

export interface CompilerOptions {
  /** Include comments describing each step (default: true) */
  includeComments?: boolean;
  /** Execution strategy mode: network, direct, or none (default: network) */
  strategyMode?: 'network' | 'direct' | 'none';
  /** Attempt to resolve $.path expressions statically (default: false) */
  staticResolve?: boolean;
  /** Output file path (CLI mode only) */
  outputPath?: string;
}

interface StepData {
  template: string;
  label: string;
  stateName: string;
  [key: string]: unknown;
}

// ─── Compiler ───────────────────────────────────────────────────

/**
 * Compile a workflow definition into standalone TypeScript code.
 *
 * @param definition - The workflow definition from the DB
 * @param options - Compiler options
 * @returns Generated TypeScript code as a string
 */
export function compileWorkflow(
  definition: WorkflowDefinition,
  options: CompilerOptions = {}
): string {
  const {
    includeComments = true,
  } = options;

  // Create a fresh Handlebars instance
  const hbs = Handlebars.create();
  registerHelpers(hbs);

  // Register partials
  hbs.registerPartial('imports', importsTemplate);
  hbs.registerPartial('apiCall', apiCallTemplate);
  hbs.registerPartial('condition', conditionTemplate);
  hbs.registerPartial('setVariable', setVariableTemplate);
  hbs.registerPartial('delay', delayTemplate);
  hbs.registerPartial('transform', transformTemplate);
  hbs.registerPartial('sqlQuery', sqlQueryTemplate);
  hbs.registerPartial('forEach', forEachTemplate);
  hbs.registerPartial('whileLoop', whileLoopTemplate);
  hbs.registerPartial('eventEmit', eventEmitTemplate);
  hbs.registerPartial('end', endTemplate);
  hbs.registerPartial('pass', passTemplate);

  // Topologically sort states
  const sortedStates = topologicalSortStates(definition);

  // Build steps array
  const steps: StepData[] = [];

  for (const stateName of sortedStates) {
    const stateDef = definition.states[stateName];
    if (!stateDef) continue;

    const step = buildStepData(stateName, stateDef, definition, includeComments);
    if (step) {
      steps.push(step);
    }
  }

  // Compile and render
  const template = hbs.compile(workflowTemplate, { noEscape: true });
  const code = template({
    slug: definition.id,
    timestamp: new Date().toISOString(),
    stateCount: sortedStates.length,
    steps,
  });

  // Clean up extra blank lines
  return code.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * Build template data for a single state.
 */
function buildStepData(
  stateName: string,
  stateDef: WorkflowStateDefinition,
  definition: WorkflowDefinition,
  includeComments: boolean
): StepData | null {
  const varName = sanitizeIdentifier(stateName);

  // Skip the initial trigger state (it's just a pass-through)
  if (stateName === definition.initial && !stateDef.invoke && !stateDef.loop) {
    // It's the trigger — just a pass-through
    return null;
  }

  // Final state
  if (stateDef.type === 'final') {
    return {
      template: 'end',
      label: stateName,
      stateName,
    };
  }

  // Loop states
  if (stateDef.loop) {
    const loop = stateDef.loop;

    if (loop.type === 'forEach') {
      return {
        template: 'forEach',
        label: stateName,
        stateName,
        collectionCode: resolvePathToJs(loop.collection ?? ''),
        itemVariable: loop.itemVariable ?? 'item',
        indexVariable: loop.indexVariable ?? 'index',
        maxIterations: loop.maxIterations ?? 100,
        timeoutMs: loop.timeoutMs ?? 50000,
        parallel: (loop.parallelBatchSize ?? 0) > 0,
        batchSize: loop.parallelBatchSize ?? 0,
      };
    }

    if (loop.type === 'while') {
      const cond = loop.condition?.params as Record<string, unknown> | undefined;
      const key = resolvePathToJs(`$.${cond?.key ?? ''}`);
      const operator = (cond?.operator as string) ?? '==';
      const value = JSON.stringify(cond?.value ?? '');

      let conditionCode: string;
      if (operator === 'contains') {
        conditionCode = `String(${key}).includes(${value})`;
      } else if (operator === 'exists') {
        conditionCode = `${key} !== undefined && ${key} !== null`;
      } else {
        conditionCode = `${key} ${operator} ${value}`;
      }

      return {
        template: 'whileLoop',
        label: stateName,
        stateName,
        conditionCode,
        maxIterations: loop.maxIterations ?? 100,
        timeoutMs: loop.timeoutMs ?? 50000,
      };
    }
  }

  // Invoke states
  if (stateDef.invoke) {
    const src = stateDef.invoke.src;
    const input = stateDef.invoke.input ?? {};

    // Delay
    if (src === 'core.delay') {
      return {
        template: 'delay',
        label: stateName,
        stateName,
        ms: input.ms ?? 1000,
      };
    }

    // Set Variable
    if (src === 'core.setVariable') {
      return {
        template: 'setVariable',
        label: stateName,
        stateName,
        variableName: sanitizeIdentifier(String(input.name ?? '')),
        valueCode: resolvePathToJs(input.value),
      };
    }

    // Transform
    if (src === 'core.transform') {
      const mapping = (input.mapping as Record<string, unknown>) ?? {};
      return {
        template: 'transform',
        label: stateName,
        stateName,
        mappingCode: buildInputObject(mapping),
      };
    }

    // Emit Event
    if (src === 'core.emit') {
      return {
        template: 'eventEmit',
        label: stateName,
        stateName,
        eventNameCode: JSON.stringify(input.event ?? ''),
        payloadCode: buildInputObject((input.payload as Record<string, unknown>) ?? {}),
      };
    }

    // SQL Query
    if (src === 'core.sql') {
      const params = Array.isArray(input.params)
        ? `[${(input.params as unknown[]).map((p) => resolvePathToJs(p)).join(', ')}]`
        : '[]';
      return {
        template: 'sqlQuery',
        label: stateName,
        stateName,
        queryCode: JSON.stringify(input.query ?? ''),
        paramsCode: params,
      };
    }

    // API Call (default for module endpoints)
    // Parse route/method from the src identifier
    const parts = src.split('.');
    const moduleName = parts[0] ?? 'unknown';

    return {
      template: 'apiCall',
      label: stateName,
      stateName,
      varName,
      src,
      comment: includeComments ? `API: ${src}` : undefined,
      route: '', // Will be resolved at runtime by strategy
      method: 'POST',
      module: moduleName,
      inputsCode: buildInputObject(input),
    };
  }

  // Condition (always transitions with guards)
  if (stateDef.always) {
    const transitions = Array.isArray(stateDef.always) ? stateDef.always : [stateDef.always];
    const hasGuards = transitions.some((t) => t.guard);

    if (hasGuards) {
      const guardedTransition = transitions.find((t) => t.guard);
      const cond = guardedTransition?.guard?.params as Record<string, unknown> | undefined;
      const key = resolvePathToJs(`$.${cond?.key ?? ''}`);
      const operator = (cond?.operator as string) ?? '==';
      const value = JSON.stringify(cond?.value ?? '');

      let conditionCode: string;
      if (operator === 'contains') {
        conditionCode = `String(${key}).includes(${value})`;
      } else if (operator === 'exists') {
        conditionCode = `${key} !== undefined && ${key} !== null`;
      } else {
        conditionCode = `${key} ${operator} ${value}`;
      }

      return {
        template: 'condition',
        label: stateName,
        stateName,
        conditionCode,
        trueTarget: guardedTransition?.target ?? '',
        falseTarget: transitions.find((t) => !t.guard)?.target ?? '',
      };
    }
  }

  // Default: pass-through
  return {
    template: 'pass',
    label: stateName,
    stateName,
  };
}
