# Module Agent Core -- Security

> Permission model, injection defense, audit trail, and security boundaries for the agent execution layer.

---

## Threat Model

Agent Core introduces a unique security surface: it allows AI models to execute actions on behalf of users. This creates risks that do not exist in traditional CRUD modules:

1. **Privilege escalation via tools** -- An agent might attempt to call endpoints the invoking user cannot access.
2. **System prompt injection** -- Malicious user input could override the agent's system prompt.
3. **Parameter tampering** -- API callers might attempt to override non-exposed parameters.
4. **Session hijacking** -- A user might attempt to access another user's conversation history.
5. **Data exfiltration via tool responses** -- Tool results might be returned to the client in ways that bypass normal access controls.
6. **Resource exhaustion** -- Unbounded token generation or infinite tool loops could exhaust quotas or cause denial of service.

---

## Security Controls

### 1. Permission-Aware Tool Execution

The Tool Wrapper enforces the invoking user's permissions on every tool call. An agent can only invoke endpoints that the calling user has access to.

**Implementation:**

```
  LLM decides to call tool "kb.searchEntries"
       |
       v
  ToolWrapper.executeTool(toolName, args, userContext)
       |
       |-- 1. Resolve tool endpoint: POST /api/knowledge-base/[tenantSlug]/search
       |
       |-- 2. Check permissions:
       |       - Load requiredPermissions for this endpoint ("knowledge-base.read")
       |       - Check userContext.permissions includes "knowledge-base.read"
       |       - If NO: return error result to LLM (not HTTP 403 to client)
       |         { error: "Permission denied: user lacks knowledge-base.read" }
       |       - If YES: proceed
       |
       |-- 3. Execute with user context:
       |       - HTTP request includes user's auth token / tenant context
       |       - RLS policies apply as if the user made the call directly
       |
       v
  Tool result returned to LLM (within agent state, not directly to client)
```

**Key principle:** The agent is not a privileged actor. It operates within the exact same permission boundary as the user who invoked it. If the user cannot access an endpoint directly, the agent cannot access it either.

**Admin agents:** Platform-admin agents may have broader tool access, but only when invoked by an admin user. The permission check always uses the invoking user's role, not the agent's configuration.

---

### 2. System Prompt Injection Defense

System prompt injection occurs when user input manipulates the agent into ignoring its system prompt or executing unintended actions.

**Defenses:**

| Defense | Implementation |
|---------|---------------|
| **Prompt structure** | System prompt is always the first message in the conversation. User messages are clearly demarcated with role markers. The LLM receives `[system, ...history, user]` in that order. |
| **Input sanitization** | User message content is sanitized to remove known injection patterns (e.g., "ignore previous instructions", "new system prompt:", markdown/XML that mimics system messages). |
| **Tool confirmation** | High-risk tools (those that modify data: POST, PUT, DELETE) can be configured to require human confirmation before execution via the Human Review node. |
| **Output filtering** | The agent's response is checked against `module-ai` guardrails before delivery. Responses that contain sensitive data patterns (API keys, connection strings) are filtered. |
| **Prompt versioning** | System prompts are versioned (FR-AC-010), providing an audit trail of changes. Only users with `agents.update` permission can modify system prompts. |

**Configurable guardrails:** Each agent can have guardrail rules configured through `module-ai`'s guardrail system. These rules are evaluated on both input (user message) and output (agent response).

---

### 3. Exposed Parameters Validation

Only parameters explicitly declared in the agent's `exposedParams` array can be overridden at invocation time. All other parameters are silently ignored.

**Implementation:**

```typescript
function mergeParams(agentConfig: LLMConfig, exposedParams: string[], requestParams: Record<string, any>): LLMConfig {
  const merged = { ...agentConfig };
  for (const key of exposedParams) {
    if (key in requestParams) {
      const value = requestParams[key];
      if (validateParamValue(key, value)) {
        merged[key] = value;
      }
      // Invalid values are rejected with 400, not silently accepted
    }
  }
  return merged;
}
```

**Validation rules:**

| Parameter | Type | Range | Default |
|-----------|------|-------|---------|
| `temperature` | number | 0.0 - 2.0 | agent default |
| `maxTokens` | number | 1 - 128000 | agent default |
| `topP` | number | 0.0 - 1.0 | agent default |
| `frequencyPenalty` | number | -2.0 - 2.0 | agent default |
| `presencePenalty` | number | -2.0 - 2.0 | agent default |
| `model` | string | must be valid alias/ID | agent default |

**Non-overridable fields:** `provider` is never exposed as an overridable parameter. Changing the provider mid-invocation could bypass provider-specific security configurations.

---

### 4. Session Isolation

Users can only access their own sessions unless they have admin-level permissions.

**Enforcement:**

```typescript
// In session access handlers
async function assertSessionAccess(sessionId: number, userId: number, isAdmin: boolean): Promise<AgentSession> {
  const session = await db.select().from(agentSessions).where(eq(agentSessions.id, sessionId));
  if (!session) throw new NotFoundError('Session not found');
  if (session.userId !== userId && !isAdmin) {
    throw new ForbiddenError('Access denied to this session');
  }
  return session;
}
```

**Tenant isolation:** Sessions inherit tenant scope from the agent or user. Tenant-scoped queries always include a `tenantId` filter. The `as_tenant_id_idx` index ensures efficient filtering.

**Playground sessions:** Marked with `isPlayground: true`. While playground sessions follow the same isolation rules, they can be filtered from production views to avoid confusion.

---

### 5. API Key Protection in Tool Responses

Tool call responses are sanitized before being stored in `agent_messages` or returned to the client.

**Sanitization rules:**

- API keys, tokens, and secrets detected in tool responses are replaced with `[REDACTED]`.
- Detection uses pattern matching for common secret formats (Bearer tokens, API keys with known prefixes, base64-encoded credentials).
- The original unsanitized response is used internally by the LLM for reasoning but is not persisted or returned.

**Implementation boundary:** Sanitization applies to:
- `agent_messages.toolResults` (persisted)
- SSE `tool_call_end` events (streamed to client)
- Non-streaming response `message.toolCalls` (returned to client)

The LLM itself receives the full tool response during execution for accurate reasoning.

---

### 6. Rate Limiting on Invoke Endpoint

The invoke endpoint supports configurable rate limits to prevent abuse.

**Rate limit tiers:**

| Scope | Default Limit | Configurable |
|-------|--------------|-------------|
| Per-user | 60 invocations/minute | Yes, via module-config |
| Per-agent | 300 invocations/minute | Yes, via agent metadata |
| Per-tenant | 1000 invocations/minute | Yes, via module-config (tenant-scoped) |

**Implementation:** Rate limiting is applied at the API route handler level, before the AgentInvoker is called. Exceeded limits return `429 Too Many Requests` with a `Retry-After` header.

**Burst handling:** The rate limiter uses a sliding window algorithm that allows short bursts (up to 2x the per-minute rate in a 10-second window) while enforcing the per-minute ceiling.

---

### 7. Token Limit Safety

Multiple layers of token limits prevent unbounded generation:

```
  Layer 1: Agent definition maxTokens
       |  (per-invocation cap set by agent creator)
       v
  Layer 2: Tenant budget (module-subscriptions)
       |  (monthly/daily token quota per tenant)
       v
  Layer 3: Platform DEFAULT_MAX_TOKENS (module-config)
       |  (absolute ceiling from platform config)
       v
  Layer 4: LLM provider hard limit
       |  (provider-specific max tokens per request)
       v
  Effective maxTokens = min(layer1, layer2_remaining, layer3, layer4)
```

**Iteration limits:** The graph execution engine enforces a maximum iteration count (default 10, configurable) to prevent infinite tool loops. If an agent enters a loop (LLM calls tool, tool returns, LLM calls same tool again), the iteration counter increments. When the limit is reached, execution terminates with a `max_iterations_exceeded` error.

**Timeout:** The `EXECUTION_TIMEOUT_MS` config (default 120000ms / 2 minutes) sets an absolute wall-clock limit on execution. Exceeded executions are terminated and marked as failed.

---

### 8. Audit Trail

Every agent invocation creates a comprehensive audit record in `agent_executions`.

**Recorded data:**

| Field | Purpose |
|-------|---------|
| `agentId` | Which agent was invoked |
| `sessionId` | Which conversation session |
| `messageId` | Which assistant response message |
| `status` | Outcome (running, completed, failed) |
| `llmConfig` | Exact LLM configuration used (after overrides) |
| `toolsUsed` | Which tools were invoked during execution |
| `tokenUsage` | Token consumption (input, output, total) |
| `latencyMs` | Total execution time |
| `error` | Error details if failed |
| `startedAt` | When execution began |
| `completedAt` | When execution ended |

**Event-based audit:** Platform-wide events (`agents.execution.completed`, `agents.execution.failed`, `agents.tool.invoked`) enable external monitoring systems to track agent activity.

**Retention:** Execution logs are retained for 90 days by default (configurable). Aggregated statistics (daily token usage, error rates) are retained indefinitely.

**Access control:** Execution logs require `agent-executions.read` permission. Tenant-scoped agents' execution logs are visible only to users within that tenant (or platform admins).

---

## Permission Matrix

| Permission Slug | Description | Default Roles |
|----------------|-------------|---------------|
| `agents.read` | View agent definitions | Admin, Operator |
| `agents.create` | Create agent definitions | Admin |
| `agents.update` | Edit agent definitions | Admin |
| `agents.delete` | Delete agent definitions | Admin |
| `agents.invoke` | Invoke agents (send messages) | Admin, Operator, User |
| `agent-nodes.read` | View node definitions | Admin, Operator |
| `agent-nodes.create` | Create/delete custom nodes | Admin |
| `agent-sessions.read` | View conversation sessions | Admin, Operator (own sessions) |
| `agent-sessions.create` | Create sessions / send messages | Admin, Operator, User |
| `agent-executions.read` | View execution logs | Admin |

---

## Security Checklist

- [ ] Tool Wrapper validates user permissions before every tool execution
- [ ] System prompt is always first in the message array, never overridden by user input
- [ ] Input sanitization strips known injection patterns from user messages
- [ ] Only exposedParams values are accepted in parameter overrides
- [ ] Parameter override values are validated against type and range constraints
- [ ] Sessions are isolated: users can only access their own sessions
- [ ] Tenant-scoped queries always include tenantId filter
- [ ] Tool responses are sanitized for secrets before persistence and client delivery
- [ ] Rate limits are enforced at per-user, per-agent, and per-tenant levels
- [ ] Token limits are enforced at multiple layers (agent, tenant, platform, provider)
- [ ] Graph iteration limits prevent infinite tool loops
- [ ] Execution timeout prevents unbounded wall-clock time
- [ ] Every invocation creates an execution record for audit
- [ ] Platform events enable external monitoring of agent activity
- [ ] Execution logs are access-controlled by permission and tenant scope
