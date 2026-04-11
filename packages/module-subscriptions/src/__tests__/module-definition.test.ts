import { describe, it, expect } from 'vitest';

/**
 * Asserts the subscriptions ModuleDefinition satisfies the contract
 * documented in `docs/module-rules.md` Rule 1 (required fields),
 * Rule 2 (chat + events discovery), and Rule 2.3 (explicit
 * `events.schemas` shape).
 *
 * The test intentionally does NOT import `../index` because that
 * module eagerly pulls in 23 handler files which depend on
 * `next/server` + Drizzle `getDb()` initialisation — importing
 * them in a vitest node environment is fragile and out of scope
 * for a pure unit test.
 *
 * Instead, the test reads the source of `../index.ts` as plain
 * text and asserts the shape using targeted text checks. This is
 * the same "contract audit without runtime import" pattern used
 * by the agent-core and module-ai module-definition tests.
 *
 * Sprint-02 may expand this to a full TS-only import once the
 * handlers have been refactored to lazy-load `getDb()`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, '../index.ts');
const indexSource = readFileSync(indexPath, 'utf-8');

describe('ModuleDefinition contract (Rule 1)', () => {
  it('exports `subscriptionsModule` with `name: "subscriptions"`', () => {
    expect(indexSource).toMatch(
      /export const subscriptionsModule: ModuleDefinition/
    );
    expect(indexSource).toMatch(/name:\s*['"]subscriptions['"]/);
  });

  it('declares its dependencies', () => {
    expect(indexSource).toMatch(/dependencies:\s*\[/);
    // Per docs/modules/21-module-subscriptions.md §"Dependencies",
    // subscriptions must declare at least `config` and `tenants`.
    expect(indexSource).toMatch(/['"]config['"]/);
    expect(indexSource).toMatch(/['"]tenants['"]/);
  });

  it('has a `schema` field pointing at subscriptionsSchema', () => {
    expect(indexSource).toMatch(/schema:\s*subscriptionsSchema/);
  });

  it('has a `seed` field pointing at seedSubscriptions', () => {
    expect(indexSource).toMatch(/seed:\s*seedSubscriptions/);
  });

  it('has at least six React Admin resources', () => {
    // Count { name: '…' } entries inside the resources array.
    const resourcesBlock = indexSource.match(
      /resources:\s*\[([\s\S]*?)\]\s*,\s*\n\s*menuItems/
    );
    expect(resourcesBlock).not.toBeNull();
    const matches = resourcesBlock?.[1].match(/name:\s*['"][a-z-]+['"]/g);
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it('has an `apiHandlers` map that registers the three usage routes', () => {
    // DRIFT-2 closure check: the three usage routes documented in
    // docs/modules/subscriptions/api.md §"Usage metering" must be
    // wired into apiHandlers.
    expect(indexSource).toMatch(/['"]usage\/track['"]\s*:\s*\{\s*POST/);
    expect(indexSource).toMatch(/['"]usage\/summary['"]\s*:\s*\{\s*GET/);
    expect(indexSource).toMatch(
      /['"]tenant-subscriptions\/\[id\]\/usage['"]\s*:\s*\{\s*GET/
    );
  });
});

describe('Discoverability (Rule 2)', () => {
  it('exposes a human-readable module-level `description`', () => {
    // Anchor to the ModuleDefinition block — the file also contains
    // per-event description strings that are shorter and must not
    // be matched first.
    const moduleBlock = indexSource.match(
      /export const subscriptionsModule: ModuleDefinition = \{([\s\S]*?)\n\};/
    );
    expect(moduleBlock).not.toBeNull();
    const match = moduleBlock![1].match(
      /^\s*description:\s*['"`]([^'"`]+)['"`]/m
    );
    expect(match).not.toBeNull();
    expect(match![1].length).toBeGreaterThan(40);
  });

  it('lists at least three `capabilities`', () => {
    const capsBlock = indexSource.match(
      /capabilities:\s*\[([\s\S]*?)\]\s*,\s*\n\s*schema/
    );
    expect(capsBlock).not.toBeNull();
    const entries = capsBlock![1].match(/['"][^'"]+['"]/g) ?? [];
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });

  it('has a `chat` block with actionSchemas', () => {
    expect(indexSource).toMatch(/chat:\s*\{/);
    expect(indexSource).toMatch(/actionSchemas:\s*\[/);
  });

  it('`chat.actionSchemas` includes the load-bearing primitives', () => {
    // The chat runtime relies on these named actions; renaming any
    // of them would silently break the Tool Wrapper discovery.
    expect(indexSource).toMatch(/subscriptions\.getTenantLimits/);
    expect(indexSource).toMatch(/subscriptions\.getServiceLimit/);
    expect(indexSource).toMatch(/subscriptions\.listPlans/);
  });
});

describe('Events (Rule 2.3)', () => {
  it('declares an `events` block with `emits` and `schemas`', () => {
    expect(indexSource).toMatch(/events:\s*\{/);
    expect(indexSource).toMatch(/emits:\s*\[/);
    expect(indexSource).toMatch(/schemas:\s*eventSchemas/);
  });

  it('emits the quota-exceeded event used by the AI + notifications middleware', () => {
    expect(indexSource).toMatch(/['"]subscriptions\.quota\.exceeded['"]/);
  });

  it('emits the usage.recorded event', () => {
    expect(indexSource).toMatch(/['"]subscriptions\.usage\.recorded['"]/);
  });

  it('defines the `eventSchemas` const with at least one field per event', () => {
    // The const is declared earlier in the file.
    expect(indexSource).toMatch(
      /const eventSchemas\s*:\s*EventSchemaMap\s*=\s*\{/
    );
    // Spot check: quota.exceeded must carry a required tenantId.
    expect(indexSource).toMatch(
      /['"]subscriptions\.quota\.exceeded['"]\s*:\s*\{[\s\S]*?tenantId[\s\S]*?required:\s*true/
    );
  });
});

describe('Config schema (Rule 6)', () => {
  it('declares a `configSchema` block', () => {
    expect(indexSource).toMatch(/configSchema:\s*\[/);
  });

  it('declares the DEFAULT_PLAN_SLUG key', () => {
    // This key is the bridge between tenant creation and the
    // default free plan assignment (sprint-02 listener).
    expect(indexSource).toMatch(/key:\s*['"]DEFAULT_PLAN_SLUG['"]/);
  });
});

describe('`import type` hygiene (CLAUDE.md)', () => {
  it('uses `import type` for type-only imports from module-registry', () => {
    // DRIFT-3 closure: spot-check the first import line.
    expect(indexSource).toMatch(
      /import type \{ ModuleDefinition, EventSchemaMap \} from '@oven\/module-registry'/
    );
  });
});
