'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface NumberInputProps {
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: number;
  onChange?: (value: number | undefined) => void;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function NumberInput({
  label,
  name,
  placeholder,
  required,
  disabled,
  value,
  onChange,
  error,
  min,
  max,
  step,
  className,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange?.(undefined);
    } else {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        onChange?.(num);
      }
    }
  };

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
        type="number"
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={value ?? ''}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500'
        )}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default NumberInput;
