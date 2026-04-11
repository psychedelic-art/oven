import { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { files } from '../schema';

// GET /api/files — List files
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (files as any)[params.sort] ?? files.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(files.filename, `%${params.filter.q}%`));
  }
  if (params.filter.folder) {
    conditions.push(eq(files.folder, params.filter.folder as string));
  }
  if (params.filter.tenantId) {
    conditions.push(eq(files.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.mimeType) {
    conditions.push(ilike(files.mimeType, `%${params.filter.mimeType as string}%`));
  }
  if (params.filter.sourceModule) {
    conditions.push(eq(files.sourceModule, params.filter.sourceModule as string));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(files).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(files).where(where),
  ]);

  return listResponse(data, 'files', params, countResult[0].count);
}
