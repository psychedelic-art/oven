'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface TextInputProps {
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  maxLength?: number;
  className?: string;
}

export function TextInput({
  label,
  name,
  placeholder,
  required,
  disabled,
  value,
  onChange,
  error,
  maxLength,
  className,
}: TextInputProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={name}
          className="text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        type="text"
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        maxLength={maxLength}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500'
        )}
      />
      {maxLength && value != null && (
        <span className="text-xs text-gray-400 text-right">
          {value.length}/{maxLength}
        </span>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default TextInput;
