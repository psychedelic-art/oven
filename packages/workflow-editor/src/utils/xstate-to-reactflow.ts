import type { Node, Edge } from '@xyflow/react';
import type { WorkflowDefinition } from '@oven/module-workflows/types';

/**
 * Convert an XState workflow definition back into ReactFlow nodes and edges.
 * Used when loading an existing workflow into the visual editor.
 */
export function xStateToReactFlow(definition: WorkflowDefinition): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let y = 0;
  const stateNames = Object.keys(definition.states);
  const statePositions = new Map<string, { x: number; y: number }>();

  // Layout: simple vertical layout with spacing
  for (let i = 0; i < stateNames.length; i++) {
    const name = stateNames[i];
    statePositions.set(name, { x: 300, y: i * 150 });
  }

  for (const [stateName, stateDef] of Object.entries(definition.states)) {
    const position = statePositions.get(stateName) ?? { x: 300, y: y };
    y += 150;

    // Determine node type
    let nodeType = 'apiCall';
    const data: Record<string, any> = { label: stateName };

    if (stateName === definition.initial && !stateDef.invoke && !stateDef.loop) {
      nodeType = 'trigger';
      data.triggerEvent = ''; // Will be set from workflow.triggerEvent
      // Load payload schema from definition
      if (definition.payloadSchema) {
        data.payloadSchema = definition.payloadSchema;
      }
    } else if (stateDef.loop) {
      // Loop node — reconstruct as forEach or whileLoop
      const loop = stateDef.loop;
      if (loop.type === 'forEach') {
        nodeType = 'forEach';
        data.collection = loop.collection ?? '';
        data.itemVariable = loop.itemVariable ?? 'item';
        data.indexVariable = loop.indexVariable ?? 'index';
        data.maxIterations = loop.maxIterations ?? 100;
        data.timeoutMs = loop.timeoutMs ?? 50000;
        data.parallelBatchSize = loop.parallelBatchSize ?? 0;
      } else if (loop.type === 'while') {
        nodeType = 'whileLoop';
        data.maxIterations = loop.maxIterations ?? 100;
        data.timeoutMs = loop.timeoutMs ?? 50000;
        if (loop.condition?.params) {
          data.key = (loop.condition.params as any).key ?? '';
          data.operator = (loop.condition.params as any).operator ?? '==';
          data.value = (loop.condition.params as any).value ?? '';
        }
      }
    } else if (stateDef.type === 'final') {
      nodeType = 'end';
    } else if (stateDef.invoke) {
      const src = stateDef.invoke.src;
      if (src === 'core.transform') {
        nodeType = 'transform';
        data.mapping = stateDef.invoke.input?.mapping ?? {};
      } else if (src === 'core.emit') {
        nodeType = 'eventEmit';
        data.eventName = stateDef.invoke.input?.event ?? '';
        data.payload = stateDef.invoke.input?.payload ?? {};
      } else if (src === 'core.delay') {
        nodeType = 'delay';
        data.ms = stateDef.invoke.input?.ms ?? 1000;
      } else if (src === 'core.setVariable') {
        nodeType = 'setVariable';
        data.variableName = stateDef.invoke.input?.name ?? '';
        data.variableValue = stateDef.invoke.input?.value ?? '';
      } else if (src === 'core.sql') {
        nodeType = 'sqlQuery';
        data.query = stateDef.invoke.input?.query ?? '';
        data.params = stateDef.invoke.input?.params ?? [];
      } else {
        nodeType = 'apiCall';
        data.nodeTypeId = src;
        data.inputMapping = stateDef.invoke.input ?? {};
      }
    } else if (stateDef.always) {
      // Check if it's a condition (has guards) or just a pass-through
      const transitions = Array.isArray(stateDef.always)
        ? stateDef.always
        : [stateDef.always];
      const hasGuards = transitions.some((t) => t.guard);

      if (hasGuards) {
        nodeType = 'condition';
        const guardedTransition = transitions.find((t) => t.guard);
        if (guardedTransition?.guard?.params) {
          data.key = (guardedTransition.guard.params as any).key ?? '';
          data.operator = (guardedTransition.guard.params as any).operator ?? '==';
          data.value = (guardedTransition.guard.params as any).value ?? '';
        }
      } else {
        // Simple pass-through (like trigger)
        if (stateName === definition.initial) {
          nodeType = 'trigger';
          if (definition.payloadSchema) {
            data.payloadSchema = definition.payloadSchema;
          }
        }
      }
    }

    nodes.push({
      id: stateName,
      type: nodeType,
      position,
      data,
    });

    // Generate edges from transitions
    if (stateDef.invoke) {
      if (stateDef.invoke.onDone) {
        const target =
          typeof stateDef.invoke.onDone === 'string'
            ? stateDef.invoke.onDone
            : stateDef.invoke.onDone.target;
        edges.push({
          id: `${stateName}-done-${target}`,
          source: stateName,
          target,
          sourceHandle: 'output',
          label: 'done',
        });
      }
      if (stateDef.invoke.onError) {
        const target =
          typeof stateDef.invoke.onError === 'string'
            ? stateDef.invoke.onError
            : stateDef.invoke.onError.target;
        edges.push({
          id: `${stateName}-error-${target}`,
          source: stateName,
          target,
          sourceHandle: 'error',
          label: 'error',
          style: { stroke: '#ef4444' },
        });
      }
    }

    if (stateDef.always) {
      const transitions = Array.isArray(stateDef.always)
        ? stateDef.always
        : [stateDef.always];

      for (let i = 0; i < transitions.length; i++) {
        const t = transitions[i];
        const hasGuard = !!t.guard;
        const handleId = hasGuard ? 'true' : i === transitions.length - 1 ? 'false' : 'true';

        edges.push({
          id: `${stateName}-always-${t.target}-${i}`,
          source: stateName,
          target: t.target,
          sourceHandle: handleId,
          label: hasGuard ? 'true' : transitions.length > 1 ? 'false' : undefined,
          style: !hasGuard && transitions.length > 1 ? { strokeDasharray: '5 5' } : undefined,
        });
      }
    }

    if (stateDef.on) {
      for (const [eventName, transition] of Object.entries(stateDef.on)) {
        if (Array.isArray(transition)) {
          for (const t of transition) {
            edges.push({
              id: `${stateName}-on-${eventName}-${t.target}`,
              source: stateName,
              target: t.target,
              label: eventName,
            });
          }
        } else {
          edges.push({
            id: `${stateName}-on-${eventName}-${transition.target}`,
            source: stateName,
            target: transition.target,
            label: eventName,
          });
        }
      }
    }
  }

  return { nodes, edges };
}
