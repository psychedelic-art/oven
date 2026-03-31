'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  options: RadioOption[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function RadioGroup({
  label,
  name,
  required,
  disabled,
  value,
  onChange,
  error,
  options,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <legend className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </legend>
      )}
      <div
        className={cn(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
        role="radiogroup"
        aria-required={required}
      >
        {options.map((option) => {
          const optionId = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                disabled={disabled}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                  'h-4 w-4 shrink-0 border border-gray-300 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  error && 'border-red-500'
                )}
              />
              <label
                htmlFor={optionId}
                className={cn(
                  'text-sm text-gray-700 select-none',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </fieldset>
  );
}

export default RadioGroup;
