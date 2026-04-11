'use client';

import { cn } from '@oven/oven-ui';
import type { PlaygroundMode } from '../TargetSelector';

interface RuntimeConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableTools: boolean;
  enableMemory: boolean;
}

interface RuntimeConfigPanelProps {
  mode: PlaygroundMode;
  config: RuntimeConfig;
  onChange: (config: Partial<RuntimeConfig>) => void;
  className?: string;
}

export function RuntimeConfigPanel({ mode, config, onChange, className }: RuntimeConfigPanelProps) {
  return (
    <div className={cn('flex flex-col gap-3 p-3', className)}>
      <h3 className={cn('text-xs font-semibold text-gray-500 uppercase tracking-wider')}>
        {mode === 'agent' ? 'Agent Config' : 'Workflow Config'}
      </h3>

      {/* Model */}
      <label className={cn('flex flex-col gap-1')}>
        <span className={cn('text-xs font-medium text-gray-600')}>Model</span>
        <select
          value={config.model}
          onChange={e => onChange({ model: e.target.value })}
          className={cn('text-sm border rounded px-2 py-1.5 bg-white')}
        >
          <option value="fast">Fast (GPT-4o-mini)</option>
          <option value="smart">Smart (GPT-4o)</option>
          <option value="claude">Claude (Sonnet)</option>
        </select>
      </label>

      {/* Temperature */}
      <label className={cn('flex flex-col gap-1')}>
        <span className={cn('text-xs font-medium text-gray-600')}>Temperature: {config.temperature}</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={config.temperature}
          onChange={e => onChange({ temperature: parseFloat(e.target.value) })}
          className={cn('w-full')}
        />
      </label>

      {/* Max Tokens */}
      <label className={cn('flex flex-col gap-1')}>
        <span className={cn('text-xs font-medium text-gray-600')}>Max Tokens</span>
        <input
          type="number"
          value={config.maxTokens}
          onChange={e => onChange({ maxTokens: parseInt(e.target.value) })}
          className={cn('text-sm border rounded px-2 py-1.5 bg-white')}
        />
      </label>

      {/* System Prompt */}
      <label className={cn('flex flex-col gap-1')}>
        <span className={cn('text-xs font-medium text-gray-600')}>System Prompt Override</span>
        <textarea
          value={config.systemPrompt}
          onChange={e => onChange({ systemPrompt: e.target.value })}
          rows={3}
          placeholder="Override the default system prompt..."
          className={cn('text-sm border rounded px-2 py-1.5 bg-white resize-none')}
        />
      </label>

      {/* Toggles */}
      <div className={cn('flex flex-col gap-2')}>
        <label className={cn('flex items-center gap-2')}>
          <input
            type="checkbox"
            checked={config.enableTools}
            onChange={e => onChange({ enableTools: e.target.checked })}
            className={cn('rounded')}
          />
          <span className={cn('text-xs text-gray-600')}>Enable Tools</span>
        </label>
        <label className={cn('flex items-center gap-2')}>
          <input
            type="checkbox"
            checked={config.enableMemory}
            onChange={e => onChange({ enableMemory: e.target.checked })}
            className={cn('rounded')}
          />
          <span className={cn('text-xs text-gray-600')}>Enable Memory</span>
        </label>
      </div>

      {/* Workflow-specific */}
      {mode === 'workflow' && (
        <div className={cn('pt-2 border-t border-gray-200')}>
          <p className={cn('text-xs text-gray-400 italic')}>
            Workflow execution uses the workflow's own configuration.
            Overrides here affect the default agent config.
          </p>
        </div>
      )}
    </div>
  );
}
