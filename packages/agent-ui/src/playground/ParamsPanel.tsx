'use client';

import { cn } from '@oven/oven-ui';
import type { ParamsPanelProps } from '../types';

export function ParamsPanel({ params, values, onChange, className }: ParamsPanelProps) {
  if (params.length === 0) return null;

  return (
    <div className={cn('space-y-3 p-4 border-l border-gray-200 bg-gray-50', className)}>
      <h3 className={cn('text-sm font-semibold text-gray-700')}>Parameters</h3>
      {params.map(param => (
        <div key={param.name} className={cn('space-y-1')}>
          <label className={cn('text-xs font-medium text-gray-600')}>{param.name}</label>
          {param.description && (
            <p className={cn('text-xs text-gray-400')}>{param.description}</p>
          )}
          {param.type === 'boolean' ? (
            <button
              type="button"
              onClick={() => onChange(param.name, !values[param.name])}
              className={cn(
                'w-10 h-5 rounded-full transition-colors relative',
                values[param.name] ? 'bg-blue-500' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  values[param.name] ? 'left-5' : 'left-0.5',
                )}
              />
            </button>
          ) : param.type === 'number' ? (
            <input
              type="number"
              value={(values[param.name] as number) ?? param.defaultValue ?? 0}
              onChange={e => onChange(param.name, parseFloat(e.target.value))}
              className={cn('w-full px-2 py-1 text-sm border rounded bg-white')}
            />
          ) : (
            <input
              type="text"
              value={(values[param.name] as string) ?? param.defaultValue ?? ''}
              onChange={e => onChange(param.name, e.target.value)}
              className={cn('w-full px-2 py-1 text-sm border rounded bg-white')}
            />
          )}
        </div>
      ))}
    </div>
  );
}
