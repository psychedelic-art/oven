'use client';

// ⚠️ This component lives in `@oven/agent-ui` and must remain MUI-free and
// router-free so it can be embedded in any host (dashboard, docs, embed script).
// Do NOT import from `@mui/*`, `react-router-dom`, or `apps/dashboard/*`.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@oven/oven-ui';
import { useChat } from '../hooks/useChat';
import { usePlaygroundCommands, type PlaygroundRuntimeConfig } from '../hooks/usePlaygroundCommands';
import { useSessionManager } from '../hooks/useSessionManager';
import type { SessionSummary } from '../hooks/useSessionManager';
import { MessageList } from '../shared/MessageList';
import { MessageInput } from '../shared/MessageInput';
import { ChatHeader } from '../shared/ChatHeader';
import { SessionSidebar } from '../shared/SessionSidebar';
import { TypingIndicator } from '../shared/TypingIndicator';
import { ChatErrorCard } from '../shared/ChatErrorCard';
import { filterMessagesForDisplay } from '../shared/filterMessagesForDisplay';
import { TargetSelector } from './TargetSelector';
import { RuntimeConfigPanel } from './panels/RuntimeConfigPanel';
import { ExecutionInspector } from './panels/ExecutionInspector';
import { EvalReportPanel } from './panels/EvalReportPanel';
import { TracePanel } from './panels/TracePanel';
import type { PlaygroundTarget, PlaygroundMode } from './TargetSelector';
import type { UIMessage } from '../types';

// ─── Props ──────────────────────────────────────────────────

export interface SessionConfig {
  canCreate?: boolean;
  canDelete?: boolean;
  canPin?: boolean;
  canStop?: boolean;
}

export interface UnifiedAIPlaygroundProps {
  apiBaseUrl?: string;
  tenantSlug?: string;
  /**
   * Numeric tenant id forwarded to workflow execute as `body.tenantId`.
   * Required when running workflows whose row was created without a tenant
   * binding (RAG / KB / memory nodes are tenant-scoped at the data layer).
   * If omitted, the playground will try to resolve a tenant id from the
   * tenant config endpoint at mount.
   */
  tenantId?: number;
  defaultMode?: PlaygroundMode;
  className?: string;

  // ── Session sidebar (sprint 05a) ──────────────────────────
  /** Show the session sidebar panel in the left panel tabs. */
  showSessionSidebar?: boolean;
  /** Feature flags for session management. All default to true. */
  sessionConfig?: SessionConfig;
  /** Called when the user switches to a different session. */
  onSessionChange?: (sessionId: number) => void;
}

interface WorkflowExecutionState {
  executionId: number;
  status: string;
  stepsExecuted: number;
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    status: string;
    durationMs?: number;
    error?: string;
    output?: unknown;
  }>;
}

// ─── Unified Playground ─────────────────────────────────────

export function UnifiedAIPlayground({
  apiBaseUrl = '',
  tenantSlug = 'default',
  tenantId: tenantIdProp,
  defaultMode = 'agent',
  className,
  showSessionSidebar = false,
  sessionConfig,
  onSessionChange,
}: UnifiedAIPlaygroundProps) {
  const canCreate = sessionConfig?.canCreate ?? true;
  const canDelete = sessionConfig?.canDelete ?? true;
  const canPin = sessionConfig?.canPin ?? true;
  const canStop = sessionConfig?.canStop ?? true;
  const [resolvedTenantId, setResolvedTenantId] = useState<number | null>(tenantIdProp ?? null);

  // If the host didn't pass a numeric tenantId, try to resolve one from the
  // tenants list endpoint so workflow execute calls have a tenant to run
  // against. RAG / KB / memory nodes need it. The dashboard `/api/tenants`
  // endpoint is React-Admin-shaped (returns an array), and this is a one-time
  // mount-time lookup, so the cost is negligible.
  useEffect(() => {
    if (typeof tenantIdProp === 'number') {
      setResolvedTenantId(tenantIdProp);
      return;
    }
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/tenants?range=${encodeURIComponent('[0,99]')}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        // Try to match the configured slug first.
        const bySlug = data.find(
          (t: Record<string, unknown>) => t && typeof t === 'object' && t.slug === tenantSlug,
        ) as Record<string, unknown> | undefined;
        // If no slug match (e.g. wrapper passes "default" but the real slug
        // is "test"), fall back to the first tenant — correct for single-tenant
        // setups and harmless in multi-tenant setups (the user can always
        // pass tenantId explicitly to override).
        const picked = bySlug ?? (data[0] as Record<string, unknown>);
        if (picked && typeof picked.id === 'number') {
          setResolvedTenantId(picked.id);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tenantIdProp, tenantSlug, apiBaseUrl]);
  const [target, setTarget] = useState<PlaygroundTarget | null>(null);
  const [leftPanel, setLeftPanel] = useState<'selector' | 'config' | 'sessions'>('selector');
  const [showInspector, setShowInspector] = useState(true);
  const [rightTab, setRightTab] = useState<'inspector' | 'eval' | 'trace'>('inspector');
  const [traceUrl, setTraceUrl] = useState<string | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<PlaygroundRuntimeConfig>({
    model: 'fast',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
    enableTools: true,
    enableMemory: false,
  });
  const [workflowExecution, setWorkflowExecution] = useState<WorkflowExecutionState | null>(null);
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);

  // ─── Session manager (opt-in via showSessionSidebar) ──────
  const sessionMgr = useSessionManager({
    apiBaseUrl,
    tenantSlug,
    tenantId: resolvedTenantId ?? undefined,
    enabled: showSessionSidebar,
  });

  // Chat hook — owns session + messages (streaming and injected).
  const chat = useChat({
    tenantSlug,
    agentSlug: target?.mode === 'agent' ? target.slug : undefined,
    apiBaseUrl,
  });

  // Commands — fetched from /api/chat-commands; local executor for /clear, /help, /status, /model, /temperature, /export.
  const cmds = usePlaygroundCommands({
    apiBaseUrl,
    mode: target?.mode ?? defaultMode,
    runtimeConfig,
    targetName: target?.name ?? null,
    onConfigChange: partial => setRuntimeConfig(prev => ({ ...prev, ...partial })),
    onAppendSystemMessage: text => chat.appendMessage({
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'system',
      content: text,
      createdAt: new Date(),
    }),
    onClearMessages: () => {
      chat.clearMessages();
      setWorkflowExecution(null);
    },
    exportMessages: () => chat.messages,
  });

  const handleTargetSelect = useCallback((newTarget: PlaygroundTarget) => {
    setTarget(newTarget);
    setLeftPanel('config');
    setWorkflowExecution(null);
    chat.clearMessages();
  }, [chat]);

  // ─── Workflow execution ────────────────────────────────────

  const executeWorkflow = useCallback(async (targetId: number, text: string) => {
    setIsExecutingWorkflow(true);
    // Optimistic user echo (agent mode does this via chat.sendMessage; workflow
    // mode bypasses sendMessage so we inject manually).
    chat.appendMessage({
      id: `user-wf-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date(),
    });

    try {
      const res = await fetch(`${apiBaseUrl}/api/agent-workflows/${targetId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerSource: 'playground',
          // Forward tenantId so RAG / KB / memory nodes have a tenant to run
          // against. Without this, workflows whose row was created with
          // tenant_id = NULL would search WHERE tenant_id = 0 and return [].
          tenantId: resolvedTenantId ?? undefined,
          payload: {
            message: text,
            question: text,
            tenantId: resolvedTenantId ?? undefined,
          },
        }),
      });
      if (!res.ok) {
        chat.appendMessage({
          id: `err-${Date.now()}`,
          role: 'system',
          content: `❌ Workflow error: ${res.status} ${res.statusText}`,
          createdAt: new Date(),
          error: `HTTP ${res.status}`,
        });
        return;
      }
      const result = await res.json() as {
        executionId: number;
        status: string;
        context?: Record<string, unknown>;
      };

      // Fetch full execution detail for the trace/inspector panels.
      try {
        const execRes = await fetch(`${apiBaseUrl}/api/agent-workflow-executions/${result.executionId}`);
        if (execRes.ok) {
          const execData = await execRes.json() as {
            id: number;
            status: string;
            stepsExecuted: number;
            nodeExecutions?: WorkflowExecutionState['nodes'];
          };
          setWorkflowExecution({
            executionId: execData.id,
            status: execData.status,
            stepsExecuted: execData.stepsExecuted,
            nodes: execData.nodeExecutions ?? [],
          });
        }
      } catch {
        // Best-effort; the assistant message below still posts.
      }

      // Extract assistant-facing text from the final workflow context.
      const responseText =
        findLastLLMOutput(result.context ?? {}) ?? JSON.stringify(result.context ?? {}, null, 2);
      chat.appendMessage({
        id: `assistant-wf-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        createdAt: new Date(),
        metadata: { executionId: result.executionId, source: 'workflow' },
      });
    } catch (err) {
      chat.appendMessage({
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Workflow error: ${(err as Error).message}`,
        createdAt: new Date(),
        error: (err as Error).message,
      });
    } finally {
      setIsExecutingWorkflow(false);
    }
  }, [apiBaseUrl, chat, resolvedTenantId]);

  // ─── Send handler (fixes the double-post bug) ──────────────

  const handleSendMessage = useCallback(async (text: string) => {
    if (!target) return;

    const parsed = cmds.parseCommand(text);
    if (parsed) {
      // Echo the user command into the chat.
      chat.appendMessage({
        id: `user-cmd-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date(),
      });

      // Workflow-incompatible commands are short-circuited with a warning.
      if (cmds.isBlocked(parsed.slug)) {
        chat.appendMessage({
          id: `sys-block-${Date.now()}`,
          role: 'system',
          content: `⚠️ /${parsed.slug} is not available in workflow mode.`,
          createdAt: new Date(),
        });
        return;
      }

      // Local-handled commands (clear/help/status/model/temperature/export).
      if (cmds.executeLocal(parsed.slug, parsed.args)) {
        return;
      }

      // Unknown-locally → forward to backend.
      if (target.mode === 'agent') {
        await chat.sendMessage(text);
      } else {
        await executeWorkflow(target.id, text);
      }
      return;
    }

    // Plain message.
    if (target.mode === 'agent') {
      await chat.sendMessage(text);
      return;
    }
    await executeWorkflow(target.id, text);
  }, [target, cmds, chat, executeWorkflow]);

  // ─── Trace URL (LangSmith link for workflow executions) ────

  useEffect(() => {
    if (!workflowExecution?.executionId) {
      setTraceUrl(null);
      return;
    }
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/agent-eval-promptfoo?executionId=${workflowExecution.executionId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        if (typeof data.traceUrl === 'string') setTraceUrl(data.traceUrl);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workflowExecution?.executionId, apiBaseUrl]);

  // ─── Derived: filtered messages ────────────────────────────

  const displayedMessages = useMemo(
    () => filterMessagesForDisplay(chat.messages),
    [chat.messages],
  );

  // ─── Render ────────────────────────────────────────────────

  const headerStatus: 'idle' | 'streaming' | 'error' =
    chat.isStreaming ? 'streaming' : chat.error ? 'error' : 'idle';

  return (
    <div className={cn('flex h-full w-full bg-white text-gray-900', className)}>
      {/* ─── Left Panel: Selector / Config / Sessions ────── */}
      <div className={cn('w-64 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50')}>
        <div className={cn('flex border-b border-gray-200 bg-white')}>
          {(['selector', 'config', ...(showSessionSidebar ? ['sessions' as const] : [])] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setLeftPanel(tab as typeof leftPanel)}
              className={cn(
                'flex-1 py-2 text-xs font-medium text-center transition-colors',
                leftPanel === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab === 'selector' ? 'Target' : tab === 'config' ? 'Config' : 'Sessions'}
            </button>
          ))}
        </div>

        <div className={cn('flex-1 overflow-y-auto')}>
          {leftPanel === 'selector' && (
            <div className={cn('p-3')}>
              <TargetSelector
                apiBaseUrl={apiBaseUrl}
                onSelect={handleTargetSelect}
                currentTarget={target}
              />
            </div>
          )}
          {leftPanel === 'config' && (
            <RuntimeConfigPanel
              mode={target?.mode ?? defaultMode}
              config={runtimeConfig}
              onChange={c => setRuntimeConfig(prev => ({ ...prev, ...c }))}
            />
          )}
          {leftPanel === 'sessions' && showSessionSidebar && (
            <SessionSidebar
              sessions={sessionMgr.sessions.map(s => ({
                id: s.id,
                title: s.title,
                isPinned: s.isPinned,
                updatedAt: s.updatedAt,
                messageCount: s.messageCount,
              }))}
              activeSessionId={sessionMgr.activeSessionId ?? undefined}
              onSelectSession={(id) => {
                sessionMgr.selectSession(id);
                onSessionChange?.(id);
              }}
              onNewSession={canCreate ? async () => {
                try {
                  const newId = await sessionMgr.createSession();
                  chat.clearMessages();
                  setWorkflowExecution(null);
                  onSessionChange?.(newId);
                } catch {
                  // createSession sets its own error state
                }
              } : () => {}}
              onPinSession={canPin ? (id) => {
                const session = sessionMgr.sessions.find(s => s.id === id);
                if (session) sessionMgr.pinSession(id, !session.isPinned);
              } : undefined}
              onDeleteSession={canDelete ? async (id) => {
                try {
                  await sessionMgr.deleteSession(id);
                } catch {
                  // deleteSession sets its own error state
                }
              } : undefined}
            />
          )}
        </div>
      </div>

      {/* ─── Center: Chat Surface ──────────────────────────── */}
      <div className={cn('flex-1 flex flex-col min-w-0')}>
        <ChatHeader
          title={target?.name ?? 'AI Playground'}
          subtitle={target ? `${target.mode} · ${target.slug}` : 'Select a target to start'}
          status={headerStatus}
          badge={target ? <ModeBadge mode={target.mode} /> : null}
          rightSlot={
            <>
              {/* Stop button — visible when streaming or executing workflow */}
              {canStop && (chat.isStreaming || isExecutingWorkflow) && (
                <button
                  type="button"
                  onClick={() => {
                    chat.stop();
                    setIsExecutingWorkflow(false);
                  }}
                  className={cn(
                    'text-xs px-2 py-1 rounded border border-red-300 bg-red-50 text-red-600',
                    'hover:bg-red-100 transition-colors',
                  )}
                >
                  Stop
                </button>
              )}
              {cmds.commands.length > 0 && (
                <span className={cn('hidden sm:inline text-[11px] text-gray-400')}>
                  Press{' '}
                  <code className={cn('bg-gray-200 text-gray-700 px-1 py-0.5 rounded font-mono text-[10px]')}>/</code>{' '}
                  for commands
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowInspector(!showInspector)}
                className={cn(
                  'text-xs px-2 py-1 rounded border transition-colors',
                  showInspector
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-100',
                )}
                aria-pressed={showInspector}
              >
                Inspector
              </button>
            </>
          }
        />

        {/* Message area */}
        {!target ? (
          <div className={cn('flex-1 flex items-center justify-center bg-white')}>
            <div className={cn('text-center')}>
              <p className={cn('text-4xl mb-3')}>🧪</p>
              <p className={cn('text-lg font-medium text-gray-700')}>AI Playground</p>
              <p className={cn('text-sm text-gray-400 mt-1')}>
                Select an agent or workflow to start testing
              </p>
            </div>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className={cn('flex-1 flex items-center justify-center bg-white')}>
            <div className={cn('text-center max-w-sm px-4')}>
              <p className={cn('text-lg font-medium text-gray-700')}>{target.name}</p>
              {target.description && (
                <p className={cn('text-sm text-gray-500 mt-1')}>{target.description}</p>
              )}
              <p className={cn('text-xs text-gray-400 mt-4')}>
                Type a message to start, or press{' '}
                <code className={cn('bg-gray-100 text-gray-600 px-1 py-0.5 rounded font-mono')}>/</code>{' '}
                for commands.
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={displayedMessages}
            isStreaming={chat.isStreaming}
            showTimestamps
          />
        )}

        {/* Loading indicator for workflow execution */}
        {isExecutingWorkflow && (
          <div className={cn('flex items-center gap-2 px-4 py-2 bg-gray-50 border-t border-gray-200')}>
            <TypingIndicator />
            <span className={cn('text-xs text-gray-500')}>Executing workflow...</span>
          </div>
        )}

        {/* Error card */}
        {chat.error && (
          <div className={cn('px-4 py-2')}>
            <ChatErrorCard
              error={chat.error.message}
              category="agent"
              onRetry={() => {
                // Clear error and allow re-sending
              }}
            />
          </div>
        )}

        {/* Input */}
        <div className={cn('border-t border-gray-200 bg-white p-3')}>
          <MessageInput
            onSend={handleSendMessage}
            disabled={!target || !chat.isSessionReady || chat.isStreaming || isExecutingWorkflow}
            placeholder={target
              ? `Message ${target.name}... (type / for commands)`
              : 'Select a target first'
            }
            commands={cmds.commands}
          />
        </div>
      </div>

      {/* ─── Right Panel: Inspector / Eval / Trace ─────────── */}
      {showInspector && (
        <div className={cn('w-80 shrink-0 border-l border-gray-200 flex flex-col bg-white')}>
          <div className={cn('flex border-b border-gray-200 bg-gray-50')}>
            {(['inspector', 'eval', 'trace'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className={cn(
                  'flex-1 py-1.5 text-[11px] font-medium text-center capitalize transition-colors',
                  rightTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-700 bg-white'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab === 'inspector' ? '🔍 Inspector' : tab === 'eval' ? '📊 Eval' : '🔗 Trace'}
              </button>
            ))}
          </div>

          <div className={cn('flex-1 overflow-hidden')}>
            {rightTab === 'inspector' && (
              <ExecutionInspector
                mode={target?.mode ?? defaultMode}
                messages={chat.messages}
                workflowExecution={workflowExecution}
              />
            )}
            {rightTab === 'eval' && (
              <EvalReportPanel target={target} apiBaseUrl={apiBaseUrl} />
            )}
            {rightTab === 'trace' && (
              <TracePanel
                target={target}
                traceUrl={traceUrl}
                tracingEnabled={traceUrl !== null}
                workflowExecution={workflowExecution}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents / helpers ────────────────────────────────

function ModeBadge({ mode }: { mode: PlaygroundMode }) {
  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
        mode === 'agent'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-purple-100 text-purple-700',
      )}
    >
      {mode === 'agent' ? '🤖 agent' : '🔀 workflow'}
    </span>
  );
}

/**
 * Walks the workflow execution context (right-to-left) looking for the last
 * node output that carries a `text` field — this is how agent.llm nodes
 * surface their final assistant response.
 */
function findLastLLMOutput(context: Record<string, unknown>): string | null {
  const entries = Object.entries(context).reverse();
  for (const [, value] of entries) {
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.text === 'string') return obj.text;
      if (typeof obj.output === 'string') return obj.output;
    }
  }
  return null;
}

// Re-export types locally so the barrel has a single source.
export type { UIMessage };
