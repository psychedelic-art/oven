import '@/lib/modules';
import '@/lib/db';
import { NextResponse } from 'next/server';
import { registry } from '@oven/module-registry';

export async function GET() {
  const modules = registry.getAll().map((mod) => ({
    name: mod.name,
    dependencies: mod.dependencies ?? [],
    resources: mod.resources.map((r) => r.name),
    apiRoutes: Object.keys(mod.apiHandlers),
    events: {
      emits: mod.events?.emits ?? [],
      listens: Object.keys(mod.events?.listeners ?? {}),
      schemas: mod.events?.schemas ?? {},
    },
    tableCount: Object.keys(mod.schema).length,
  }));

  return NextResponse.json(modules);
}
