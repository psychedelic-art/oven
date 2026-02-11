#!/usr/bin/env npx tsx
/**
 * CLI for compiling workflow definitions into standalone TypeScript code.
 *
 * Usage:
 *   oven-compile-workflow --input workflow.json --output generated/my-workflow.ts
 *   oven-compile-workflow --from-api 5 --api-url http://localhost:3000 --output src/workflows/flow.ts
 *   oven-compile-workflow --input workflow.json  # prints to stdout
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { compileWorkflow, type CompilerOptions } from '../src/compiler';
import type { WorkflowDefinition } from '@oven/module-workflows/types';

// ─── Arg Parsing ────────────────────────────────────────────────

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = 'true';
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const short: Record<string, string> = { i: 'input', o: 'output', h: 'help' };
      const key = short[arg[1]] ?? arg[1];
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        result[key] = next;
        i++;
      } else {
        result[key] = 'true';
      }
    }
  }
  return result;
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Usage: oven-compile-workflow [options]

Options:
  --input, -i      Path to workflow definition JSON file
  --from-api       Fetch workflow from API by ID (e.g., --from-api 5)
  --api-url        Base API URL (default: http://localhost:3000)
  --output, -o     Output path for generated .ts file (default: stdout)
  --strategy       Execution strategy: network | direct | none (default: network)
  --comments       Include comments (default: true)
  --static         Resolve $.path statically where possible

Examples:
  oven-compile-workflow -i workflow.json -o generated/my-workflow.ts
  oven-compile-workflow --from-api 5 --api-url http://localhost:3000 -o src/workflows/flow.ts
  oven-compile-workflow -i workflow.json  # prints to stdout
`);
    process.exit(0);
  }

  let definition: WorkflowDefinition;

  if (args.input) {
    // Read from file
    const filePath = resolve(process.cwd(), args.input);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      // Support both raw definition and full workflow record
      definition = data.definition ?? data;
    } catch (err) {
      console.error(`Error reading input file: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  } else if (args['from-api']) {
    // Fetch from API
    const baseUrl = args['api-url'] ?? 'http://localhost:3000';
    const workflowId = args['from-api'];
    try {
      const res = await fetch(`${baseUrl}/api/workflows/${workflowId}`);
      if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      definition = data.definition ?? data;
    } catch (err) {
      console.error(`Error fetching workflow: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  } else {
    console.error('Error: Must specify --input or --from-api');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Validate definition
  if (!definition.states || !definition.initial) {
    console.error('Error: Invalid workflow definition — missing states or initial');
    process.exit(1);
  }

  // Compile
  const options: CompilerOptions = {
    includeComments: args.comments !== 'false',
    strategyMode: (args.strategy as CompilerOptions['strategyMode']) ?? 'network',
    staticResolve: args.static === 'true',
  };

  const code = compileWorkflow(definition, options);

  // Output
  if (args.output) {
    const outputPath = resolve(process.cwd(), args.output);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, code, 'utf-8');
    console.log(`Compiled workflow "${definition.id}" → ${outputPath}`);
    console.log(`  States: ${Object.keys(definition.states).length}`);
    console.log(`  Output: ${code.length} bytes`);
  } else {
    // Print to stdout
    process.stdout.write(code);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
