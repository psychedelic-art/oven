import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Returns the capabilities discovered from the module registry.
 * Each registered module that has a `chat` block (description + capabilities + actionSchemas)
 * is returned so the chat system knows what tools and actions are available.
 *
 * TODO: Sprint 4A.4 — integrate with capability-discovery engine that reads registry.getAll()
 */
export async function GET(_request: NextRequest) {
  // Placeholder — will be wired to capability-discovery in Sprint 4A.4
  return NextResponse.json({
    modules: [],
    commands: [],
    skills: [],
    mcpTools: [],
  });
}
