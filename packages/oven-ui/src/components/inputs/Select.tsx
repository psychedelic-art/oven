'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  multiple?: boolean;
  className?: string;
}

export function Select({
  label,
  name,
  required,
  disabled,
  value,
  onChange,
  error,
  options,
  placeholder = 'Select an option',
  multiple = false,
  className,
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
      onChange?.(selected);
    } else {
      onChange?.(e.target.value);
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
      <div className="relative">
        <select
          id={name}
          name={name}
          required={required}
          disabled={disabled}
          value={value ?? (multiple ? [] : '')}
          onChange={handleChange}
          multiple={multiple}
          className={cn(
            'flex w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            !multiple && 'h-10 pr-8',
            multiple && 'min-h-[80px]',
            !value && !multiple && 'text-gray-400',
            error && 'border-red-500 focus:ring-red-500'
          )}
        >
          {!multiple && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {!multiple && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default Select;
