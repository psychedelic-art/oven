import '@/lib/modules';
import '@/lib/db';
import { NextResponse } from 'next/server';
import { registry } from '@oven/module-registry';
import { getTableName } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';

export async function GET() {
  const schema = registry.getComposedSchema();

  const tables = Object.values(schema)
    .map((table) => {
      try {
        return getTableName(table as Table);
      } catch {
        return null;
      }
    })
    .filter((name): name is string => name !== null)
    .sort();

  const resources = registry
    .getAllResources()
    .map((r) => r.name)
    .sort();

  return NextResponse.json({ tables, resources });
}
