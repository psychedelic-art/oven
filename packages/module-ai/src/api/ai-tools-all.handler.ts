import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@oven/module-registry/db';
import { registry } from '@oven/module-registry';
import { aiTools } from '../schema';

// GET /api/ai/tools/all — Aggregate tools from ALL modules
export async function GET(_request: NextRequest) {
  const db = getDb();

  // 1. Get all AI tools from DB
  const dbTools = await db.select().from(aiTools);

  // 2. Get all module action schemas
  const modules = registry.getAll();
  const moduleTools: Record<string, unknown[]> = {};

  for (const mod of modules) {
    const chat = (mod as any).chat;
    if (chat?.actionSchemas?.length > 0) {
      moduleTools[mod.name] = chat.actionSchemas.map((schema: any) => ({
        name: schema.name,
        description: schema.description,
        parameters: schema.parameters,
        returns: schema.returns,
        endpoint: schema.endpoint,
        requiredPermissions: schema.requiredPermissions,
        source: 'module',
        module: mod.name,
      }));
    }
  }

  // 3. Separate system vs custom AI tools
  const aiSystemTools = dbTools.filter(t => t.isSystem).map(t => ({
    ...t, source: 'system', module: 'ai',
  }));
  const customTools = dbTools.filter(t => !t.isSystem).map(t => ({
    ...t, source: 'custom', module: 'ai',
  }));

  // 4. Build grouped response
  const grouped: Record<string, unknown[]> = {
    ai: [...aiSystemTools, ...customTools],
    ...moduleTools,
  };

  const totalTools = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  return NextResponse.json({
    ...grouped,
    _meta: {
      totalTools,
      modules: Object.keys(grouped),
      aiSystemCount: aiSystemTools.length,
      aiCustomCount: customTools.length,
      moduleActionCount: Object.values(moduleTools).reduce((sum, arr) => sum + arr.length, 0),
    },
  });
}
