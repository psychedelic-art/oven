# Security — Workflow Agents, MCP Server & Python Sidecar

> Security model, permissions, isolation, and threat mitigation for all three packages.

---

## 1. Permission Model

### Seeded Permissions

All CRUD and action permissions are seeded at module registration:

| Permission Slug | Description | Default Roles |
|----------------|-------------|---------------|
| `agent-workflows.read` | View agent workflow definitions | admin, operator |
| `agent-workflows.create` | Create new agent workflows | admin |
| `agent-workflows.update` | Edit existing agent workflows | admin |
| `agent-workflows.delete` | Delete agent workflows | admin |
| `agent-workflows.execute` | Manually trigger workflow execution | admin, operator |
| `agent-workflow-executions.read` | View execution history and details | admin, operator |
| `agent-workflow-executions.resume` | Resume paused executions (human-in-the-loop) | admin, reviewer |
| `agent-workflow-executions.cancel` | Cancel running executions | admin, operator |
| `agent-memory.read` | View agent memory entries | admin, operator |
| `agent-memory.create` | Create memory entries manually | admin |
| `agent-memory.delete` | Delete memory entries | admin |
| `mcp-servers.read` | View MCP server definitions | admin, operator |

### Permission Enforcement

Every API handler checks permissions via the auth middleware:

```typescript
// In handler
const user = await getAuthenticatedUser(request);
requirePermission(user, 'agent-workflows.execute');
```

Unauthenticated requests receive 401. Unauthorized requests receive 403.

---

## 2. Human-in-the-Loop Security

### Reviewer Authorization

Only users with the `agent-workflow-executions.resume` permission can resume paused executions. This prevents unauthorized actors from approving, editing, or rejecting agent decisions.

**Controls**:
- The resume endpoint validates the caller's role before applying the decision
- The `action` field (approve/edit/reject) is logged in the execution's event history
- The reviewer's user ID is recorded alongside the decision for audit
- Reject decisions include a mandatory `reason` field

### Decision Integrity

- The checkpoint is immutable once saved -- resuming loads a copy, not a mutable reference
- The `data` field in edit actions is validated against the expected schema for the paused node
- Arbitrary data injection through the edit action is prevented by schema validation
- The execution resumes only from the specific node where it was paused, not from arbitrary points

---

## 3. Execution Cost Cap

### Runaway Cost Prevention

Agent workflows with LLM nodes can accumulate significant costs, especially in tool loops. The cost cap provides a configurable safety limit.

**Implementation**:
- `EXECUTION_COST_CAP_CENTS` config key (default: 1000 = $10.00)
- After each node completes, CostTracker compares `totalCostCents` against the cap
- If exceeded: execution is immediately aborted with status `'failed'` and error message indicating cost cap breach
- Event `agents-workflow.execution.failed` is emitted with the cost cap error

**Configuration hierarchy**:
- Platform default: 1000 cents ($10)
- Tenant override: via module-config cascade (e.g., VIP tenant gets 5000)
- Per-workflow override: not currently supported (uses tenant or platform level)

### Cost Transparency

- Every LLM node records its token usage and cost in `agent_workflow_node_executions`
- Execution-level aggregate is computed in `agent_workflow_executions.totalCostCents`
- Dashboard displays cost breakdown per node in the execution timeline
- No hidden costs: all AI operations flow through module-ai's middleware, which tracks usage

---

## 4. MCP Server Security

### Permission-Aware Tool Execution

The MCP server's AuthMiddleware enforces the calling user's permissions before executing any tool.

**Flow**:
1. MCP client connects with authentication credentials (API key or session token)
2. On `tools/call`, the Executor resolves the tool's `requiredPermissions` from the actionSchema
3. AuthMiddleware checks if the authenticated user's role includes all required permissions
4. If any permission is missing: return MCP error (not a 403, but an MCP-protocol error response)
5. If all permissions present: execute the tool and return the result

### Rate Limiting

Per-tool rate limiting prevents abuse through the MCP interface:
- Configurable limits per tool (e.g., `kb.searchEntries`: 100 calls/minute)
- Per-user rate tracking (not per-connection)
- Rate limit headers included in HTTP transport responses

### Transport Security

| Transport | Use Case | Security |
|-----------|----------|----------|
| stdio | Local development | Process-level isolation. Only accessible to the local process. |
| HTTP | Vercel serverless | TLS required. Auth headers on every request. CORS restrictions. |

**HTTP transport requirements**:
- All connections must use HTTPS (TLS 1.2+)
- Authentication via `Authorization: Bearer <api-key>` header
- CORS origin whitelist for browser-based MCP clients
- Request body size limit to prevent payload abuse

---

## 5. Memory Isolation

### Scoping Rules

Agent memory entries are scoped by two dimensions:
- **agentId** (required): Every memory entry belongs to a specific agent
- **userId** (optional): Memory can be further scoped to a specific user

**Access rules**:
- `agent.memory.read` node always filters by the executing agent's ID
- If `memoryConfig.scope` is `"agent+user"`, memory is also filtered by the current user's ID
- If `memoryConfig.scope` is `"agent"`, all memories for that agent are accessible (shared across users)
- API endpoints for memory management always require `agentId` in the filter

### Tenant Isolation

- Agent memory entries do not have a direct `tenantId` column
- Isolation is achieved through the agent: agents belong to tenants, and memory belongs to agents
- The agent_memory API filters by agentId, which is already tenant-scoped through the agent definition
- Cross-tenant memory access is prevented by the agent ownership chain

### Data Sensitivity

Memory entries may contain personally identifiable information (PII) or sensitive conversation content:
- The `content` field is stored as plain text (no client-side encryption by default)
- Database-level encryption at rest is recommended for the `agent_memory` table
- The `metadata` field should not contain sensitive information -- only references (session IDs, scores)

---

## 6. Python Sidecar Security

### API Key Authentication

The Python sidecar communicates with the OVEN API using a service-level API key:

```python
# settings/config.py
class Settings(BaseSettings):
    OVEN_API_URL: str
    OVEN_API_KEY: str  # Service API key (not user-level)
    # ...
```

**Controls**:
- The API key is stored in environment variables, never in code or config files
- Every request from `OvenClient` includes the `Authorization: Bearer` header
- The API key should have a dedicated service role with only the permissions needed by the sidecar
- Key rotation is handled through environment variable updates and deployment

### Inbound Request Authentication

Requests to the Python sidecar itself must also be authenticated:

- The `/execute` and `/stream` endpoints require an API key in the request header
- The `/health` endpoint is public (no auth required)
- The `/nodes` endpoint is public (read-only metadata)

### Network Isolation

- In production (Vercel), the Python sidecar runs as a serverless function within the same Vercel project
- Communication between the Next.js app and the Python function stays within Vercel's internal network
- External access to the Python sidecar is restricted to the Vercel-hosted endpoint
- In local development, the sidecar runs on a separate port (default 8000) and is only accessible on localhost

---

## 7. Checkpoint Data Protection

### Sensitivity

Checkpoint data stored in `agent_workflow_executions.checkpoint` (JSONB) may contain:
- Full conversation message history (including user messages with PII)
- Tool call results (which may include tenant data)
- Intermediate agent reasoning (which may reference sensitive context)

### Protection Measures

- **Encryption at rest**: The PostgreSQL database should use disk-level encryption (Neon provides this by default)
- **Column-level encryption**: For high-sensitivity deployments, the `checkpoint` JSONB can be encrypted before storage using a per-tenant key
- **Checkpoint cleanup**: Completed executions should clear their checkpoint data (`checkpoint = null`) to minimize data retention
- **Access control**: Only the execution engine and authorized API handlers can read checkpoint data
- **No checkpoint in list responses**: The execution list endpoint does not return the `checkpoint` or `context` fields -- only the detail endpoint does, and it requires `agent-workflow-executions.read` permission

---

## 8. Tool Execution Sandboxing

### User Permission Scope

When an agent workflow invokes tools, those tools execute within the invoking user's permission scope:

- The execution context carries the triggering user's identity and role
- Each tool call checks the user's permissions before execution (same as a direct API call)
- An agent cannot escalate privileges -- it can only invoke tools the triggering user has access to

### Tool Call Validation

- Tool inputs are validated against the tool's JSON Schema before execution
- Unknown tools (not in the registry) are rejected
- Tool outputs are sanitized before being included in the LLM's conversation context

### Guardrail Enforcement

The `agentConfig.guardrails` configuration provides content-level protection:

**Input guardrails** (applied to user messages before LLM processing):
- `keyword`: Block or escalate messages containing specific keywords
- `regex`: Pattern matching for sensitive content (e.g., SSN, credit card patterns)
- `classifier`: ML-based classification (e.g., medical emergency detection)

**Output guardrails** (applied to LLM responses before returning to user):
- Same types as input guardrails
- Actions: `block` (suppress response), `escalate` (flag for human review), `modify` (redact sensitive content)

---

## 9. Threat Model Summary

| Threat | Mitigation |
|--------|------------|
| Unauthorized execution trigger | Permission-based API access (agent-workflows.execute) |
| Unauthorized resume of paused execution | Separate permission (agent-workflow-executions.resume) |
| Runaway execution costs | Configurable cost cap with automatic abort |
| Prompt injection via tool results | Output guardrails, tool output sanitization |
| Cross-tenant data access | Tenant scoping through agent ownership chain |
| Cross-agent memory access | Memory filtered by agentId on every query |
| MCP tool privilege escalation | AuthMiddleware checks user permissions per tool call |
| MCP rate abuse | Per-tool rate limiting |
| Sensitive data in checkpoints | Encryption at rest, checkpoint cleanup after completion |
| Python sidecar unauthorized access | API key authentication on all endpoints |
| Python sidecar data exfiltration | Limited service role, network isolation |
| Infinite tool loops | MAX_TOOL_ITERATIONS config with hard abort |
| Execution timeout | EXECUTION_TIMEOUT_MS config with hard abort |
| Agent memory PII exposure | Scoped access, encryption at rest recommended |

---

## 10. Audit Trail

All security-relevant actions are recorded:

| Action | Record Location |
|--------|----------------|
| Workflow created/updated/deleted | EventBus: `agents-workflow.workflow.*` |
| Execution started | EventBus: `agents-workflow.execution.started` + DB record |
| Execution paused (human review) | EventBus: `agents-workflow.execution.paused` + checkpoint |
| Execution resumed (with reviewer ID) | EventBus: `agents-workflow.execution.resumed` |
| Execution failed (including cost cap) | EventBus: `agents-workflow.execution.failed` + error text |
| Node execution (each step) | DB: `agent_workflow_node_executions` with full I/O |
| Tool invocations | DB: `tool_calls` JSONB in node execution records |
| MCP tool calls | Logging middleware in mcp-server |
| Memory created/deleted | EventBus: `agents-workflow.memory.*` |
