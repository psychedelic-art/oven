import type { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { aiTools } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-tools (F-05-02).
// Keep this array explicit — do NOT reach for Object.keys(aiTools).
const ALLOWED_SORTS = [
  'id',
  'name',
  'slug',
  'category',
  'handler',
  'isSystem',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

// Built-in tools that are always available
const BUILT_IN_TOOLS = [
  { name: 'ai.embed', slug: 'ai-embed', category: 'embedding', description: 'Generate text embeddings', isSystem: true },
  { name: 'ai.embedMany', slug: 'ai-embed-many', category: 'embedding', description: 'Generate embeddings for multiple texts', isSystem: true },
  { name: 'ai.generateText', slug: 'ai-generate-text', category: 'generation', description: 'Generate text from a prompt', isSystem: true },
  { name: 'ai.streamText', slug: 'ai-stream-text', category: 'generation', description: 'Stream text generation via SSE', isSystem: true },
  { name: 'ai.generateImage', slug: 'ai-generate-image', category: 'generation', description: 'Generate images from a prompt', isSystem: true },
  { name: 'ai.generateObject', slug: 'ai-generate-object', category: 'generation', description: 'Generate structured objects from a prompt and schema', isSystem: true },
];

// GET /api/ai/tools — List all registered AI tools
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiTools, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  const conditions: any[] = [];
  if (params.filter.category) {
    conditions.push(eq(aiTools.category, params.filter.category as string));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(aiTools.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [dbTools, countResult] = await Promise.all([
    db.select().from(aiTools).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiTools).where(where),
  ]);

  // Merge built-in tools with database tools
  const dbSlugs = new Set(dbTools.map((t) => t.slug));
  const builtInToInclude = BUILT_IN_TOOLS.filter((t) => !dbSlugs.has(t.slug));
  const allTools = [...builtInToInclude, ...dbTools];
  const totalCount = countResult[0].count + builtInToInclude.length;

  return listResponse(allTools, 'ai-tools', params, totalCount);
}
