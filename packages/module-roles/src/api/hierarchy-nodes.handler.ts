import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, isNull, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { hierarchyNodes } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);
  const url = request.nextUrl;

  // Special mode: tree — returns full tree structure
  if (url.searchParams.get('mode') === 'tree') {
    const allNodes = await db.select().from(hierarchyNodes).orderBy(asc(hierarchyNodes.name));
    const tree = buildTree(allNodes);
    return NextResponse.json(tree);
  }

  const orderCol = (hierarchyNodes as any)[params.sort] ?? hierarchyNodes.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(hierarchyNodes).orderBy(orderFn);

  if (params.filter.type) {
    query = query.where(eq(hierarchyNodes.type, params.filter.type as string));
  }
  if (params.filter.parentId) {
    query = query.where(eq(hierarchyNodes.parentId, params.filter.parentId as number));
  }
  if (params.filter.roots) {
    query = query.where(isNull(hierarchyNodes.parentId));
  }
  if (params.filter.q) {
    query = query.where(ilike(hierarchyNodes.name, `%${params.filter.q}%`));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(hierarchyNodes),
  ]);

  return listResponse(data, 'hierarchy-nodes', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const [result] = await db.insert(hierarchyNodes).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}

// Build tree from flat list
function buildTree(nodes: any[]): any[] {
  const nodeMap = new Map<number, any>();
  const roots: any[] = [];

  // First pass: index all nodes
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // Second pass: build parent-child relationships
  for (const node of nodes) {
    const mapped = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(mapped);
    } else {
      roots.push(mapped);
    }
  }

  return roots;
}
