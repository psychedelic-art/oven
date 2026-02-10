import '@/lib/modules';
import '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { registry, eventBus } from '@oven/module-registry';

export async function GET() {
  return NextResponse.json({
    emitters: registry.getAllEmittedEvents(),
    listeners: registry.getAllListenedEvents(),
    registeredEvents: eventBus.getRegisteredEvents(),
    recentLog: eventBus.getLog(20),
    schemas: registry.getAllEventSchemas(),
  });
}

export async function POST(request: NextRequest) {
  const { event, payload } = await request.json();

  if (!event || typeof event !== 'string') {
    return NextResponse.json({ error: 'event field required' }, { status: 400 });
  }

  await eventBus.emit(event, payload ?? {});

  return NextResponse.json({
    fired: event,
    payload: payload ?? {},
    log: eventBus.getLog(5),
  });
}
