'use client';

import { useState } from 'react';
import { cn } from '@oven/oven-ui';
import { useChat } from '../hooks/useChat';
import { MessageList } from '../shared/MessageList';
import { MessageInput } from '../shared/MessageInput';
import { ParamsPanel } from './ParamsPanel';
import type { AgentPlaygroundProps } from '../types';

export function AgentPlayground({
  agentSlug,
  tenantId,
  apiBaseUrl = '',
  showExposedParams = true,
  showToolCalls = true,
  className,
}: AgentPlaygroundProps) {
  const [selectedAgent, setSelectedAgent] = useState(agentSlug ?? '');
  const [params, setParams] = useState<Record<string, unknown>>({});
  const chat = useChat({
    tenantSlug: `tenant-${tenantId ?? 'default'}`,
    agentSlug: selectedAgent || undefined,
    apiBaseUrl,
  });

  const handleParamChange = (name: string, value: unknown) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className={cn('flex h-full border rounded-lg overflow-hidden bg-white', className)}>
      {/* Chat area */}
      <div className={cn('flex flex-col flex-1')}>
        {/* Toolbar */}
        <div className={cn('flex items-center gap-3 px-4 py-2 border-b bg-gray-50')}>
          <label className={cn('text-xs font-medium text-gray-500')}>Agent:</label>
          <input
            type="text"
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            placeholder="Enter agent slug..."
            className={cn('flex-1 px-2 py-1 text-sm border rounded bg-white')}
          />
          <button
            type="button"
            onClick={() => {
              // Create new session by resetting
              chat.stop();
            }}
            className={cn('px-3 py-1 text-xs font-medium rounded border hover:bg-gray-100')}
          >
            New Session
          </button>
        </div>

        {/* Status bar */}
        <div className={cn('flex items-center gap-2 px-4 py-1 border-b text-xs text-gray-400')}>
          <span className={cn(
            'w-2 h-2 rounded-full',
            chat.isSessionReady ? 'bg-green-400' : 'bg-gray-300',
          )} />
          <span>
            {chat.isSessionReady ? `Session #${chat.sessionId}` : 'Connecting...'}
          </span>
          {chat.isStreaming && <span className={cn('text-blue-500')}>● Streaming</span>}
          {chat.error && <span className={cn('text-red-500')}>Error: {chat.error.message}</span>}
        </div>

        {/* Messages */}
        <MessageList
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          showTimestamps
        />

        {/* Input */}
        <div className={cn('border-t p-3')}>
          <MessageInput
            onSend={chat.sendMessage}
            disabled={!chat.isSessionReady || chat.isStreaming}
            placeholder="Test the agent..."
          />
        </div>
      </div>

      {/* Params panel */}
      {showExposedParams && (
        <ParamsPanel
          params={[
            { name: 'temperature', type: 'number', description: 'Response creativity (0-2)', defaultValue: 0.7 },
            { name: 'maxTokens', type: 'number', description: 'Max response length', defaultValue: 4096 },
          ]}
          values={params}
          onChange={handleParamChange}
          className={cn('w-64')}
        />
      )}
    </div>
  );
}
