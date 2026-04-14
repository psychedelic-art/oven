import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock DB layer ──────────────────────────────────────────
// The handler imports getDb from module-registry; we swap it for a fake
// that returns controlled session + message fixtures.

const mockSessions = [
  {
    id: 42,
    title: 'My Chat Session',
    tenantId: 1,
    agentId: 7,
    status: 'active',
    createdAt: new Date('2026-04-01T10:00:00Z'),
    updatedAt: new Date('2026-04-01T12:00:00Z'),
  },
];

const mockMessages = [
  {
    id: 1,
    sessionId: 42,
    role: 'user',
    content: [{ type: 'text', text: 'Hello there' }],
    createdAt: new Date('2026-04-01T10:00:00Z'),
  },
  {
    id: 2,
    sessionId: 42,
    role: 'assistant',
    content: [{ type: 'text', text: 'Hi! How can I help?' }],
    createdAt: new Date('2026-04-01T10:00:01Z'),
  },
  {
    id: 3,
    sessionId: 42,
    role: 'user',
    content: 'Plain string content',
    createdAt: new Date('2026-04-01T10:00:02Z'),
  },
];

// Chain-mock for db.select().from(...).where(...).orderBy(...)
function makeChainableQuery(result: unknown[]) {
  const query: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  query.from = () => query;
  query.where = () => query;
  query.orderBy = () => Promise.resolve(result);
  return query;
}

let selectCallCount = 0;

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => ({
    select: () => {
      selectCallCount += 1;
      // First select() fetches sessions, second fetches messages
      return makeChainableQuery(selectCallCount === 1 ? mockSessions : mockMessages);
    },
  }),
}));

vi.mock('@oven/module-registry/api-utils', () => ({
  notFound: (msg?: string) =>
    new Response(JSON.stringify({ error: msg ?? 'Not found' }), { status: 404 }),
}));

// Mock Drizzle column helpers (eq/asc are called on column objects)
vi.mock('drizzle-orm', () => ({
  eq: () => ({}),
  asc: () => ({}),
}));

vi.mock('../../schema', () => ({
  chatSessions: {},
  chatMessages: {},
}));

import { GET } from '../../api/chat-sessions-export.handler';

function makeRequest(format?: string): Request {
  const url = new URL(
    `http://localhost/api/chat-sessions/42/export${format ? `?format=${format}` : ''}`,
  );
  return new Request(url);
}

function makeCtx() {
  return { params: Promise.resolve({ id: '42' }) };
}

describe('chat-sessions-export handler', () => {
  beforeEach(() => {
    selectCallCount = 0;
  });

  it('exports as JSON by default', async () => {
    const res = await GET(makeRequest() as never, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('session-42.json');
    const body = JSON.parse(await res.text());
    expect(body.session.id).toBe(42);
    expect(body.messages).toHaveLength(3);
  });

  it('exports as markdown when format=markdown', async () => {
    const res = await GET(makeRequest('markdown') as never, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/markdown');
    expect(res.headers.get('Content-Disposition')).toContain('session-42.md');
    const body = await res.text();
    expect(body).toContain('# My Chat Session');
    expect(body).toContain('**user**');
    expect(body).toContain('**assistant**');
    expect(body).toContain('Hello there');
    expect(body).toContain('Hi! How can I help?');
  });

  it('exports as plaintext when format=plaintext', async () => {
    const res = await GET(makeRequest('plaintext') as never, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(res.headers.get('Content-Disposition')).toContain('session-42.txt');
    const body = await res.text();
    expect(body).toContain('[user] Hello there');
    expect(body).toContain('[assistant] Hi! How can I help?');
    expect(body).not.toContain('# My Chat Session');
  });

  it('falls back to JSON for unknown format', async () => {
    const res = await GET(makeRequest('xml') as never, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
  });
});
