import { NextRequest, NextResponse } from 'next/server';
import { nodeRegistry } from '../node-registry';

/**
 * GET /api/node-types
 * Returns the complete catalog of available workflow node types.
 * Used by the visual workflow editor to populate the node palette.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const module = url.searchParams.get('module');
  const category = url.searchParams.get('category');

  let nodes = nodeRegistry.getAll();

  if (module) {
    nodes = nodes.filter((n) => n.module === module);
  }
  if (category) {
    nodes = nodes.filter((n) => n.category === category);
  }

  // Group by module for easier palette rendering
  const grouped = url.searchParams.get('grouped') === 'true';
  if (grouped) {
    return NextResponse.json(nodeRegistry.getGrouped());
  }

  return NextResponse.json(nodes);
}
