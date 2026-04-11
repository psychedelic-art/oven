# Claude Code Feature Inventory

> Reference analysis of `D:\Enterprise\claude-code` for Oven chat module adaptation.
> **Purpose**: Understand feature set, determine what to replicate, adapt, or skip.
> **Date**: 2026-04-05

---

## 1. Prompting Architecture

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **System prompt** | Dynamic composition from sections via `getSystemPrompt()` | `prompt-builder.ts` with section-based composition |
| **Sections** | Tool availability, MCP instructions, agent defs, skill hints, effort level | Static base + agent instructions + tenant context + commands + skills + MCP + tools + KB context + session context |
| **Caching** | Stable sections cached, dynamic recomputed per turn | Same strategy: sections 1-5 stable, 6-9 dynamic |
| **Source files** | `src/constants/prompts.ts`, `src/constants/systemPromptSections.ts` | `src/engine/prompt-builder.ts` |

**Decision**: ADAPT. Same section-based pattern, different section content for web platform context.

---

## 2. Skills System

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Sources** | Bundled (code), disk (markdown+YAML frontmatter), plugin, MCP | DB-stored (CRUD API) + built-in (code-registered) |
| **Format** | Markdown with YAML frontmatter (name, description, aliases, allowedTools, hooks) | DB rows with name, slug, description, promptTemplate, source, isBuiltIn, params |
| **Invocation** | `/skill-name args` in prompt input or model-invoked via SkillTool | `/skill-name args` detected by CommandPalette, routed through skill-loader |
| **Context** | `inline` (expand in conversation) or `fork` (isolated subagent) | Inline only for Phase 4 (fork requires workflow-agents in Phase 5) |
| **Templating** | `$arg` placeholders, shell commands in frontmatter | `{{var}}` Handlebars-style substitution |
| **Built-in skills** | Varies by installation | 6: summarize, translate, extract, analyze, faq-create, report |
| **Source files** | `src/skills/bundledSkills.ts`, `src/skills/loadSkillsDir.ts` | `src/engine/skill-loader.ts` |

**Decision**: ADAPT. DB-first storage instead of filesystem, simpler templating, no shell execution in frontmatter.

---

## 3. Commands System

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Count** | 80+ commands | 15 built-in + custom per-tenant |
| **Types** | `local` (JS), `local-jsx` (React), `prompt` (LLM) | All execute server-side, return CommandResult |
| **Registration** | Global registry in `commands.ts`, lazy-loaded | DB-stored + code-registered built-in commands |
| **Discovery** | Typeahead search by name, aliases, description | CommandPalette UI with fuzzy search, keyboard navigation |
| **Arguments** | Free-form string after command name | Parsed via command-specific arg schemas |
| **Source files** | `src/commands.ts`, `src/commands/*/` | `src/engine/command-registry.ts` |

**Built-in commands for Oven**:
| Command | Purpose | Claude Code equivalent |
|---------|---------|----------------------|
| `/help` | List available commands | `/help` |
| `/clear` | Clear chat history | `/clear` |
| `/agent` | Switch backing agent | `/agent` |
| `/tools` | List available tools | `/tools` |
| `/search` | Search knowledge base | custom |
| `/mode` | Switch conversation mode | `/effort` |
| `/export` | Export conversation | `/export` |
| `/status` | Session status info | `/cost` |
| `/feedback` | Rate last response | custom |
| `/reset` | Reset session context | `/compact` |
| `/model` | Change model | `/model` |
| `/temperature` | Adjust temperature | custom |
| `/skill` | List/invoke skills | `/skills` |
| `/mcp` | Manage MCP connections | `/mcp` |
| `/pin` | Pin/unpin session | custom |

**Decision**: ADAPT. Fewer commands, DB-stored for tenant customization, web UI instead of terminal.

---

## 4. Hooks System

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Hook types** | BashCommand, Prompt, HTTP, Agent | Condition, API/Webhook, EventBus, Guardrail |
| **Events** | pre_tool_use, post_tool_use, session_start, stop | pre-message, post-message, pre-tool-use, post-tool-use, on-error, on-escalation, session-start, session-end |
| **Conditions** | `if` pattern matching against tool_name + tool_input | Condition handler evaluates session/message context |
| **Execution** | Subprocess (bash), LLM (prompt), HTTP request, subagent | HTTP webhook, event-bus emit, guardrail delegate, condition eval |
| **Storage** | Settings file (hooks section) | DB-stored per tenant |
| **Source files** | `src/schemas/hooks.ts` | `src/engine/hook-manager.ts` |

**Decision**: ADAPT. Web-appropriate hook types (no bash/subprocess), more lifecycle events, DB storage.

---

## 5. MCP Integration

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Transports** | stdio, SSE, HTTP, WebSocket, SDK-internal | SSE, HTTP (stdio not applicable for web) |
| **Auth** | OAuth flow with callback port, XAA, keychain storage | OAuth stored in DB, connection credentials encrypted |
| **Tool discovery** | `tools/list` RPC, dynamic registration | Same protocol, cached in DB |
| **Resources** | ListMcpResourcesTool, ReadMcpResourceTool | Phase 5 (skip for Phase 4) |
| **Connection management** | MCPConnectionManager with status tracking | DB-stored connections with status, auto-reconnect |
| **Source files** | `src/services/mcp/`, `src/tools/MCPTool/` | `src/engine/mcp-connector.ts` |

**Decision**: ADAPT. Server-side only (no client-side MCP), SSE + HTTP transports, DB-stored connections.

---

## 6. Tool Orchestration

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Architecture** | `Tool<Input, Output, Progress>` with `buildTool()` factory | Already exists: module-agent-core `tool-wrapper.ts` |
| **Count** | 50+ built-in + dynamic MCP tools | Registry-discovered module tools + MCP bridged tools |
| **Permissions** | checkPermissions → PermissionResult, interactive dialogs | Permission-filtered via module-roles |
| **Progress** | ProgressMessage stream during execution | Tool call events in SSE stream |

**Decision**: REUSE existing tool-wrapper.ts. Extend with MCP tool bridging only.

---

## 7. Agent/Subagent Patterns

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Subagents** | Forked context with isolated token budget | Phase 5 (module-workflow-agents) |
| **Coordinator** | Multi-agent orchestration | Phase 5 |
| **Swarms** | Concurrent agents, shared state | Not planned |

**Decision**: SKIP for Phase 4. Single-agent invocation via module-agent-core suffices.

---

## 8. Context Management

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Token counting** | `roughTokenCountEstimation()` | Approximate counting (~4 chars/token) |
| **Compaction** | Earlier messages summarized when budget exceeded | `summarizeMessages()` via aiGenerateText |
| **Sliding window** | Messages beyond budget dropped oldest-first | Same pattern with configurable window size |
| **File caching** | LRU-based file read cache | Not applicable (no file reads in chat) |
| **Entity tracking** | Not explicit | session.context JSONB with entity references, preferences |
| **Source files** | `src/utils/messages/normalizeMessagesForAPI.ts` | `src/engine/context-manager.ts` |

**Decision**: ADAPT. Same token budget strategy, add entity tracking in session context.

---

## 9. State Management

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Pattern** | Custom Zustand-like store (AppState) | Zustand factory pattern (per CLAUDE.md) for agent-ui |
| **Persistence** | Settings → disk, messages → session dir | Settings → DB, messages → DB, session → localStorage |
| **Notifications** | Toast queue in AppState | Toast via @oven/oven-ui or MUI snackbar |

**Decision**: ADAPT. Use zustand factory for parameterized stores in agent-ui.

---

## 10. Extensibility Model

| Aspect | Claude Code | Oven Adaptation |
|--------|------------|-----------------|
| **Plugins** | Built-in + marketplace, with skills/hooks/MCP per plugin | SKIP for Phase 4 |
| **Rationale** | Module system already provides extensibility via ModuleDefinition | — |

**Decision**: SKIP. Module system is the extensibility model.

---

## Summary: Adaptation Matrix

| Feature | Decision | Priority | Phase |
|---------|----------|----------|-------|
| Prompt builder (section-based) | ADAPT | HIGH | 4A.4 |
| Skills (DB-stored + built-in) | ADAPT | HIGH | 4A.3 |
| Commands (15 built-in + custom) | ADAPT | HIGH | 4A.3 |
| Hooks (4 types, 8 events) | ADAPT | HIGH | 4A.3 |
| MCP connector (SSE + HTTP) | ADAPT | MEDIUM | 4A.4 |
| Context manager (token budget) | ADAPT | MEDIUM | 4A.4 |
| Streaming (SSE pipeline) | ADAPT | HIGH | 4A.1 |
| Tool orchestration | REUSE | — | Existing |
| Subagent/coordinator | SKIP | — | Phase 5 |
| Plugin marketplace | SKIP | — | Future |
