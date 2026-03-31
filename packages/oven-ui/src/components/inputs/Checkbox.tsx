'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxProps {
  label?: string;
  name?: string;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
  description?: string;
  className?: string;
}

export function Checkbox({
  label,
  name,
  disabled,
  checked,
  onChange,
  error,
  description,
  className,
}: CheckboxProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={name}
          name={name}
          disabled={disabled}
          checked={checked ?? false}
          onChange={(e) => onChange?.(e.target.checked)}
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500'
          )}
        />
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={name}
              className={cn(
                'text-sm font-medium text-gray-700 select-none',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default Checkbox;
