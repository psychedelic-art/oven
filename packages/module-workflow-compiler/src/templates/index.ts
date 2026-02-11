/**
 * Handlebars templates for workflow code generation.
 * Embedded as strings to avoid filesystem dependencies at runtime.
 */

export const workflowTemplate = `{{> imports}}

/**
 * Auto-generated workflow: {{slug}}
 * Generated at: {{timestamp}}
 * States: {{stateCount}}
 */
export async function executeWorkflow_{{sanitize slug}}(
  payload: Record<string, unknown>,
  strategy: { executeApiCall: (config: { route: string; method: string; module: string }, input: Record<string, unknown>) => Promise<Record<string, unknown>> }
): Promise<Record<string, unknown>> {
  let context: Record<string, unknown> = { ...payload };

{{#each steps}}
{{> (lookup this "template") this}}

{{/each}}
  return context;
}
`;

export const importsTemplate = `// ─── Auto-Generated Workflow Code ───────────────────────────────
// Do not edit manually. Re-generate from the workflow editor.
`;

export const apiCallTemplate = `{{#if comment}}  // {{comment}}
{{/if}}  // Step: {{label}} ({{src}})
  {
    const input = {{{inputsCode}}};
    const {{varName}}_result = await strategy.executeApiCall(
      { route: '{{route}}', method: '{{method}}', module: '{{module}}' },
      input
    );
    context = { ...context, ...{{varName}}_result, {{varName}}_output: {{varName}}_result };
  }
`;

export const conditionTemplate = `  // Step: {{label}} (Condition)
  if ({{conditionCode}}) {
    // Condition passed → continue to {{trueTarget}}
  }{{#if falseTarget}} else {
    // Condition failed → continue to {{falseTarget}}
  }{{/if}}
`;

export const setVariableTemplate = `  // Step: {{label}} (Set Variable)
  {
    const _varValue = {{{valueCode}}};
    context = { ...context, {{variableName}}: _varValue };
  }
`;

export const delayTemplate = `  // Step: {{label}} (Delay)
  await new Promise(resolve => setTimeout(resolve, {{ms}}));
`;

export const transformTemplate = `  // Step: {{label}} (Transform)
  {
    const _transformed = {{{mappingCode}}};
    context = { ...context, ..._transformed };
  }
`;

export const sqlQueryTemplate = `  // Step: {{label}} (SQL Query)
  {
    const _query = {{{queryCode}}};
    const _params = {{{paramsCode}}};
    // Note: SQL execution requires a database connection
    // const _result = await db.execute(sql.raw(_query));
    // context = { ...context, rows: _result.rows, rowCount: _result.rows.length };
    console.log('[SQL]', _query, _params);
  }
`;

export const forEachTemplate = `  // Step: {{label}} (ForEach Loop)
  {
    const _collection = {{{collectionCode}}} as unknown[];
    if (Array.isArray(_collection)) {
      const _results: unknown[] = [];
      {{#if parallel}}
      // Parallel execution in batches of {{batchSize}}
      for (let _batch = 0; _batch < _collection.length; _batch += {{batchSize}}) {
        const _chunk = _collection.slice(_batch, _batch + {{batchSize}});
        const _batchResults = await Promise.all(
          _chunk.map(async (_item, _i) => {
            const _iterContext = { ...context, {{itemVariable}}: _item, {{indexVariable}}: _batch + _i };
            // Loop body would execute here
            return _iterContext;
          })
        );
        _results.push(..._batchResults);
      }
      {{else}}
      // Sequential execution
      for (let _i = 0; _i < Math.min(_collection.length, {{maxIterations}}); _i++) {
        context.{{itemVariable}} = _collection[_i];
        context.{{indexVariable}} = _i;
        // Loop body would execute here
        _results.push(context.{{itemVariable}});
      }
      {{/if}}
      context = { ...context, results: _results, iterationCount: _results.length };
    }
  }
`;

export const whileLoopTemplate = `  // Step: {{label}} (While Loop)
  {
    let _iterCount = 0;
    const _maxIter = {{maxIterations}};
    const _deadline = Date.now() + {{timeoutMs}};
    while (_iterCount < _maxIter && Date.now() < _deadline) {
      if (!({{conditionCode}})) break;
      // Loop body would execute here
      _iterCount++;
    }
    context = { ...context, iterationCount: _iterCount };
  }
`;

export const eventEmitTemplate = `  // Step: {{label}} (Emit Event)
  {
    const _eventName = {{{eventNameCode}}};
    const _eventPayload = {{{payloadCode}}};
    // eventBus.emit(_eventName, _eventPayload);
    console.log('[Event]', _eventName, _eventPayload);
  }
`;

export const endTemplate = `  // End state: {{label}}
  // Workflow complete
`;

export const passTemplate = `  // Step: {{label}} (Pass-through)
`;
