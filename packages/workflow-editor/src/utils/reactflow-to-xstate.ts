import type { Node, Edge } from '@xyflow/react';
import type { WorkflowDefinition, WorkflowStateDefinition, PayloadProperty } from '@oven/module-workflows/types';

/**
 * Convert ReactFlow nodes and edges into an XState-compatible workflow definition.
 *
 * Node types map to state definitions:
 * - "trigger" → initial state (auto-transitions to first connected node)
 * - "apiCall" → invoke state (calls a module API endpoint)
 * - "condition" → always transitions with guards (true/false branches)
 * - "transform" → invoke state (core.transform)
 * - "eventEmit" → invoke state (core.emit)
 * - "delay" → invoke state (core.delay)
 * - "setVariable" → invoke state (core.setVariable)
 * - "sqlQuery" → invoke state (core.sql)
 * - "end" → final state
 */
export function reactFlowToXState(
  nodes: Node[],
  edges: Edge[],
  workflowId: string
): WorkflowDefinition {
  const states: Record<string, WorkflowStateDefinition> = {};

  // Find the trigger node (entry point)
  const triggerNode = nodes.find((n) => n.type === 'trigger');
  const initialState = triggerNode ? triggerNode.id : nodes[0]?.id ?? 'start';

  // Extract payload schema from trigger node
  const triggerData = (triggerNode?.data ?? {}) as Record<string, any>;
  const payloadSchema: PayloadProperty[] | undefined = triggerData.payloadSchema;

  for (const node of nodes) {
    const outEdges = edges.filter((e) => e.source === node.id);
    const data = (node.data ?? {}) as Record<string, any>;

    switch (node.type) {
      case 'trigger': {
        // Trigger auto-transitions to the first connected node
        const nextNode = outEdges[0]?.target;
        if (nextNode) {
          states[node.id] = {
            always: { target: nextNode },
          };
        } else {
          states[node.id] = { type: 'final' };
        }
        break;
      }

      case 'apiCall': {
        const nextEdge = outEdges.find((e) => e.sourceHandle !== 'error');
        const errorEdge = outEdges.find((e) => e.sourceHandle === 'error');

        states[node.id] = {
          invoke: {
            src: data.nodeTypeId ?? 'unknown',
            input: data.inputMapping ?? {},
            onDone: nextEdge?.target
              ? { target: nextEdge.target }
              : undefined,
            onError: errorEdge?.target
              ? { target: errorEdge.target }
              : undefined,
          },
        };
        break;
      }

      case 'condition': {
        // Condition node has true/false outputs
        const trueEdge = outEdges.find((e) => e.sourceHandle === 'true');
        const falseEdge = outEdges.find((e) => e.sourceHandle === 'false');

        const transitions: any[] = [];

        if (trueEdge) {
          transitions.push({
            target: trueEdge.target,
            guard: {
              type: 'condition',
              params: {
                key: data.key ?? '',
                operator: data.operator ?? '==',
                value: data.value ?? '',
              },
            },
          });
        }

        if (falseEdge) {
          // Default fallback (no guard)
          transitions.push({
            target: falseEdge.target,
          });
        }

        states[node.id] = {
          always: transitions,
        };
        break;
      }

      case 'transform': {
        const nextEdge = outEdges[0];
        states[node.id] = {
          invoke: {
            src: 'core.transform',
            input: { mapping: data.mapping ?? {} },
            onDone: nextEdge?.target ? { target: nextEdge.target } : undefined,
          },
        };
        break;
      }

      case 'eventEmit': {
        const nextEdge = outEdges[0];
        states[node.id] = {
          invoke: {
            src: 'core.emit',
            input: {
              event: data.eventName ?? '',
              payload: data.payload ?? {},
            },
            onDone: nextEdge?.target ? { target: nextEdge.target } : undefined,
          },
        };
        break;
      }

      case 'delay': {
        const nextEdge = outEdges[0];
        states[node.id] = {
          invoke: {
            src: 'core.delay',
            input: { ms: data.ms ?? 1000 },
            onDone: nextEdge?.target ? { target: nextEdge.target } : undefined,
          },
        };
        break;
      }

      case 'setVariable': {
        const nextEdge = outEdges[0];
        states[node.id] = {
          invoke: {
            src: 'core.setVariable',
            input: {
              name: data.variableName ?? '',
              value: data.variableValue ?? '',
            },
            onDone: nextEdge?.target ? { target: nextEdge.target } : undefined,
          },
        };
        break;
      }

      case 'sqlQuery': {
        const nextEdge = outEdges.find((e) => e.sourceHandle !== 'error');
        const errorEdge = outEdges.find((e) => e.sourceHandle === 'error');
        states[node.id] = {
          invoke: {
            src: 'core.sql',
            input: {
              query: data.query ?? '',
              params: data.params ?? [],
            },
            onDone: nextEdge?.target ? { target: nextEdge.target } : undefined,
            onError: errorEdge?.target ? { target: errorEdge.target } : undefined,
          },
        };
        break;
      }

      case 'forEach': {
        const nextEdge = outEdges.find((e) => e.sourceHandle !== 'error');
        const errorEdge = outEdges.find((e) => e.sourceHandle === 'error');
        states[node.id] = {
          loop: {
            type: 'forEach',
            collection: data.collection ?? '',
            itemVariable: data.itemVariable ?? 'item',
            indexVariable: data.indexVariable ?? 'index',
            maxIterations: data.maxIterations ?? 100,
            timeoutMs: data.timeoutMs ?? 50000,
            parallelBatchSize: data.parallelBatchSize ?? 0,
            bodyStates: {},
            bodyInitial: '',
          },
          invoke: {
            src: 'core.forEach',
            onDone: nextEdge?.target ? { target: nextEdge.target } : undefined,
            onError: errorEdge?.target ? { target: errorEdge.target } : undefined,
          },
        };
        break;
      }

      case 'whileLoop': {
        const nextEdge = outEdges.find((e) => e.sourceHandle !== 'error');
        const errorEdge = outEdges.find((e) => e.sourceHandle === 'error');
        states[node.id] = {
          loop: {
            type: 'while',
            condition: {
              type: 'condition',
              params: {
                key: data.key ?? '',
                operator: data.operator ?? '==',
                value: data.value ?? '',
              },
            },
            maxIterations: data.maxIterations ?? 100,
            timeoutMs: data.timeoutMs ?? 50000,
            bodyStates: {},
            bodyInitial: '',
          },
          invoke: {
            src: 'core.whileLoop',
            onDone: nextEdge?.target ? { target: nextEdge.target } : undefined,
            onError: errorEdge?.target ? { target: errorEdge.target } : undefined,
          },
        };
        break;
      }

      case 'end': {
        states[node.id] = { type: 'final' };
        break;
      }

      default: {
        // Unknown node type — treat as pass-through
        const nextEdge = outEdges[0];
        if (nextEdge) {
          states[node.id] = {
            always: { target: nextEdge.target },
          };
        } else {
          states[node.id] = { type: 'final' };
        }
      }
    }
  }

  const definition: WorkflowDefinition = {
    id: workflowId,
    initial: initialState,
    states,
  };

  // Include payload schema if defined
  if (payloadSchema && payloadSchema.length > 0) {
    definition.payloadSchema = payloadSchema;
  }

  return definition;
}
