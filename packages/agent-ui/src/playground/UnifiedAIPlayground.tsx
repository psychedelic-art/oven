'use client';

import { useState, useCallback } from 'react';
import { cn } from '@oven/oven-ui';
import { useChat } from '../hooks/useChat';
import { MessageList } from '../shared/MessageList';
import { MessageInput } from '../shared/MessageInput';
import { TargetSelector } from './TargetSelector';
import { RuntimeConfigPanel } from './panels/RuntimeConfigPanel';
import { ExecutionInspector } from './panels/ExecutionInspector';
import { EvalReportPanel } from './panels/EvalReportPanel';
import { TracePanel } from './panels/TracePanel';
import type { PlaygroundTarget, PlaygroundMode } from './TargetSelector';

// ─── Props ──────────────────────────────────────────────────

export interface UnifiedAIPlaygroundProps {
  apiBaseUrl?: string;
  tenantSlug?: string;
  defaultMode?: PlaygroundMode;
  className?: string;
}

// ─── Unified Playground ─────────────────────────────────────

export function UnifiedAIPlayground({
  apiBaseUrl = '',
  tenantSlug = 'default',
  defaultMode = 'agent',
  className,
}: UnifiedAIPlaygroundProps) {
  const [target, setTarget] = useState<PlaygroundTarget | null>(null);
  const [leftPanel, setLeftPanel] = useState<'selector' | 'config'>('selector');
  const [showInspector, setShowInspector] = useState(true);
  const [rightTab, setRightTab] = useState<'inspector' | 'eval' | 'trace'>('inspector');
  const [traceUrl, setTraceUrl] = useState<string | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState({
    model: 'fast',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
    enableTools: true,
    enableMemory: false,
  });
  const [workflowExecution, setWorkflowExecution] = useState<{
    executionId: number;
    status: string;
    stepsExecuted: number;
    nodes: Array<{ nodeId: string; nodeType: string; status: string; durationMs?: number; error?: string; output?: unknown }>;
  } | null>(null);

  // Chat hook — reuses existing widget infrastructure
  const chat = useChat({
    tenantSlug,
    agentSlug: target?.mode === 'agent' ? target.slug : undefined,
    apiBaseUrl,
  });

  const handleTargetSelect = useCallback((newTarget: PlaygroundTarget) => {
    setTarget(newTarget);
    setLeftPanel('config');
    setWorkflowExecution(null);
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (target?.mode === 'workflow') {
      // For workflow mode: execute the workflow with the message as trigger
      try {
        const res = await fetch(`${apiBaseUrl}/api/agent-workflows/${target.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerSource: 'playground', payload: { message: text } }),
        });
        if (res.ok) {
          const result = await res.json();
          // Load execution details
          const execRes = await fetch(`${apiBaseUrl}/api/agent-workflow-executions/${result.executionId}`);
          if (execRes.ok) {
            const execData = await execRes.json();
            setWorkflowExecution({
              executionId: execData.id,
              status: execData.status,
              stepsExecuted: execData.stepsExecuted,
              nodes: execData.nodeExecutions ?? [],
            });
          }
          // Add a synthetic assistant message with the workflow result
          const lastNode = (result.context as Record<string, unknown>);
          const responseText = findLastLLMOutput(lastNode) ?? JSON.stringify(result.context);
          // Use chat.sendMessage for the user part, then we'd need to inject the response
          // For now, use the chat hook which handles the full flow
        }
      } catch { /* error handling */ }
    }
    // For agent mode (and fallback): use the standard chat flow
    await chat.sendMessage(text);
  }, [target, apiBaseUrl, chat]);

  return (
    <div className={cn('flex h-full bg-white', className)}>
      {/* Left Panel: Selector or Config */}
      <div className={cn('w-64 border-r border-gray-200 flex flex-col')}>
        {/* Panel tabs */}
        <div className={cn('flex border-b border-gray-200')}>
          <button
            type="button"
            onClick={() => setLeftPanel('selector')}
            className={cn(
              'flex-1 py-2 text-xs font-medium text-center',
              leftPanel === 'selector' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500',
            )}
          >
            Target
          </button>
          <button
            type="button"
            onClick={() => setLeftPanel('config')}
            className={cn(
              'flex-1 py-2 text-xs font-medium text-center',
              leftPanel === 'config' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500',
            )}
          >
            Config
          </button>
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
        </div>
      </div>

      {/* Center: Chat Surface */}
      <div className={cn('flex-1 flex flex-col min-w-0')}>
        {/* Top bar */}
        <div className={cn('flex items-center justify-between px-4 py-2 border-b bg-gray-50')}>
          <div className={cn('flex items-center gap-2')}>
            {target ? (
              <>
                <span className={cn('text-sm')}>
                  {target.mode === 'agent' ? '🤖' : '🔀'}
                </span>
                <span className={cn('text-sm font-medium')}>{target.name}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  target.mode === 'agent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700',
                )}>
                  {target.mode}
                </span>
              </>
            ) : (
              <span className={cn('text-sm text-gray-400')}>Select a target to start</span>
            )}
          </div>

          <div className={cn('flex items-center gap-2')}>
            {chat.isStreaming && (
              <span className={cn('text-xs text-blue-500 animate-pulse')}>● Streaming</span>
            )}
            <button
              type="button"
              onClick={() => setShowInspector(!showInspector)}
              className={cn(
                'text-xs px-2 py-1 rounded border',
                showInspector ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500',
              )}
            >
              Inspector
            </button>
          </div>
        </div>

        {/* Message area */}
        {!target ? (
          <div className={cn('flex-1 flex items-center justify-center')}>
            <div className={cn('text-center')}>
              <p className={cn('text-4xl mb-3')}>🧪</p>
              <p className={cn('text-lg font-medium text-gray-700')}>AI Playground</p>
              <p className={cn('text-sm text-gray-400 mt-1')}>Select an agent or workflow to start testing</p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            showTimestamps
          />
        )}

        {/* Input */}
        <div className={cn('border-t p-3')}>
          <MessageInput
            onSend={handleSendMessage}
            disabled={!target || !chat.isSessionReady || chat.isStreaming}
            placeholder={target
              ? `Message ${target.name}...`
              : 'Select a target first'
            }
          />
        </div>
      </div>

      {/* Right Panel: Tabbed Inspector / Eval / Trace */}
      {showInspector && (
        <div className={cn('w-80 border-l border-gray-200 flex flex-col')}>
          {/* Tab bar */}
          <div className={cn('flex border-b border-gray-200 bg-gray-50')}>
            {(['inspector', 'eval', 'trace'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-medium text-center capitalize',
                  rightTab === tab ? 'border-b-2 border-blue-500 text-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab === 'inspector' ? '🔍 Inspector' : tab === 'eval' ? '📊 Eval' : '🔗 Trace'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className={cn('flex-1 overflow-hidden')}>
            {rightTab === 'inspector' && (
              <ExecutionInspector
                mode={target?.mode ?? defaultMode}
                messages={chat.messages}
                workflowExecution={workflowExecution}
              />
            )}
            {rightTab === 'eval' && (
              <EvalReportPanel
                target={target}
                apiBaseUrl={apiBaseUrl}
              />
            )}
            {rightTab === 'trace' && (
              <TracePanel
                target={target}
                traceUrl={traceUrl}
                tracingEnabled={false}
                workflowExecution={workflowExecution}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────

function findLastLLMOutput(context: Record<string, unknown>): string | null {
  for (const [, value] of Object.entries(context).reverse()) {
    if (value && typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).text as string;
    }
  }
  return null;
}
