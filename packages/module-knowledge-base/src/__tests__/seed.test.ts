import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedKnowledgeBase } from '../seed';

// ─── Mocks ──────────────────────────────────────────────────

// Capture the literal SQL text from every `sql`...`` tag so we can
// assert call order later.
vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<object>('drizzle-orm');
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        const text = strings.reduce(
          (acc, part, i) => acc + part + (values[i] !== undefined ? String(values[i]) : ''),
          '',
        );
        return { __sql: text };
      },
      {
        raw: (s: string) => ({ __sql: s }),
        join: (...args: unknown[]) => ({ __sql_join: args }),
      },
    ),
    eq: (...args: unknown[]) => args,
    and: (...args: unknown[]) => args,
  };
});

vi.mock('@oven/module-roles/schema', () => ({ permissions: { __table: 'permissions' } }));
vi.mock('@oven/module-tenants/schema', () => ({ tenants: { __table: 'tenants' } }));
vi.mock('../schema', () => ({
  kbKnowledgeBases: { __table: 'kb_knowledge_bases', tenantId: {}, slug: {} },
  kbCategories: { __table: 'kb_categories', tenantId: {}, knowledgeBaseId: {}, slug: {} },
  kbEntries: { __table: 'kb_entries', tenantId: {}, knowledgeBaseId: {}, question: {} },
}));

// ─── Helpers ────────────────────────────────────────────────

function extractSqlText(arg: unknown): string | null {
  if (arg && typeof arg === 'object' && '__sql' in (arg as Record<string, unknown>)) {
    return String((arg as Record<string, unknown>).__sql);
  }
  return null;
}

function makeDb(overrides: Partial<{
  executeImpl: (arg: unknown) => Promise<unknown>;
}> = {}) {
  const executeCalls: string[] = [];

  const defaultExecute = async (arg: unknown) => {
    const text = extractSqlText(arg);
    if (text) executeCalls.push(text);
    return { rows: [] };
  };

  const executeImpl = overrides.executeImpl ?? defaultExecute;

  const chain = {
    insert: vi.fn(() => chain),
    values: vi.fn(() => chain),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue([]), // no tenants → short-circuit seed after vector setup
    execute: vi.fn(async (arg: unknown) => {
      const text = extractSqlText(arg);
      if (text) executeCalls.push(text);
      return executeImpl(arg);
    }),
  };

  return { db: chain, executeCalls };
}

// ─── Tests ──────────────────────────────────────────────────

describe('seedKnowledgeBase — pgvector extension bootstrap', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('runs CREATE EXTENSION before any ALTER TABLE / CREATE INDEX', async () => {
    const { db, executeCalls } = makeDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedKnowledgeBase(db as any);

    const extIdx = executeCalls.findIndex((s) => /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+vector/i.test(s));
    const alterIdx = executeCalls.findIndex((s) => /ALTER\s+TABLE\s+kb_entries/i.test(s));
    const indexIdx = executeCalls.findIndex((s) => /CREATE\s+INDEX.+hnsw/i.test(s));

    expect(extIdx).toBeGreaterThanOrEqual(0);
    expect(alterIdx).toBeGreaterThan(extIdx);
    expect(indexIdx).toBeGreaterThan(extIdx);

    // No warnings should fire on the happy path.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('skips ALTER TABLE / CREATE INDEX when CREATE EXTENSION fails', async () => {
    const { db, executeCalls } = makeDb({
      executeImpl: async (arg) => {
        const text = extractSqlText(arg);
        if (text && /CREATE\s+EXTENSION/i.test(text)) {
          throw new Error('permission denied to create extension');
        }
        return { rows: [] };
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedKnowledgeBase(db as any);

    // ALTER / CREATE INDEX must NOT have been issued.
    const sawAlter = executeCalls.some((s) => /ALTER\s+TABLE\s+kb_entries/i.test(s));
    const sawIndex = executeCalls.some((s) => /CREATE\s+INDEX.+hnsw/i.test(s));
    expect(sawAlter).toBe(false);
    expect(sawIndex).toBe(false);

    // Warning surfaced.
    const warned = warnSpy.mock.calls.some(
      (call) => typeof call[0] === 'string' && call[0].includes('Could not enable pgvector extension'),
    );
    expect(warned).toBe(true);
  });
});
