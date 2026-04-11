# Sprint 08 — Plugin Adapter

## Goal

Mirror the MCP adapter pattern for plugins: any plugin is its own
package, registered at dashboard startup, never directly imported by
`module-claude-code`.

## Scope

- Define `PluginAdapter` interface in
  `packages/module-claude-code/src/adapters/plugin/types.ts`:
  ```ts
  export interface PluginAdapter {
    name: string;
    version: string;
    contributes: {
      tools?: ToolContribution[];
      commands?: CommandContribution[];
      skills?: SkillContribution[];
      events?: EventContribution[];
    };
    onLoad?(ctx: PluginContext): Promise<void>;
    onUnload?(ctx: PluginContext): Promise<void>;
  }
  ```
- `registerPlugin(adapter)` accumulates contributions and merges them
  into `claudeCodeModule.chat.actionSchemas`, the workflow seed (for
  command contributions), and `module-skills` (for skill contributions).
- Sample plugin package: `packages/plugin-example-hello/` — adds a
  single `hello.greet` tool. Used as a smoke test in CI.
- Persist installed plugins per tenant in `claude_code_plugins`
  with `tenantId` indexed.

## Out of scope

- A plugin marketplace.
- Sandboxing (plugins are trusted code in the monorepo).
- Hot-reload.

## Deliverables

- `plugin-example-hello` ships and is registered behind a feature flag
  (`PLUGINS_ENABLED`, declared in `configSchema`, default `false`).
- The hello tool appears in `registry.getAll()` and is callable.

## Acceptance criteria

- [ ] `module-claude-code` does not import `plugin-example-hello`.
- [ ] Plugin contributions show the source plugin name in
      `actionSchemas[].source = 'plugin:<name>'`.

## Touched packages

- `packages/module-claude-code/` (extend)
- `packages/plugin-example-hello/` (new)
- `apps/dashboard/src/lib/modules.ts`

## Risks

- **R1**: Plugins overlap tool names. *Mitigation*: namespacing —
  plugin tools are exposed as `plugin.<name>.<tool>`.

## Rule references

Rule 2.1, Rule 3.1, Rule 3.3, Rule 8.
