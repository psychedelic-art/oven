'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface TimePickerProps {
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  format24h?: boolean;
  minuteStep?: number;
  className?: string;
}

/**
 * Generates time options for a select-based time picker.
 */
function generateTimeOptions(
  format24h: boolean,
  minuteStep: number
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += minuteStep) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const val = `${hh}:${mm}`;

      if (format24h) {
        options.push({ value: val, label: val });
      } else {
        const period = h < 12 ? 'AM' : 'PM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        options.push({
          value: val,
          label: `${displayH}:${mm} ${period}`,
        });
      }
    }
  }
  return options;
}

export function TimePicker({
  label,
  name,
  required,
  disabled,
  value,
  onChange,
  error,
  format24h = false,
  minuteStep = 15,
  className,
}: TimePickerProps) {
  const timeOptions = React.useMemo(
    () => generateTimeOptions(format24h, minuteStep),
    [format24h, minuteStep]
  );

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
            clipRule="evenodd"
          />
        </svg>
        <select
          id={name}
          name={name}
          required={required}
          disabled={disabled}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-gray-400',
            error && 'border-red-500 focus:ring-red-500'
          )}
        >
          <option value="" disabled>
            Select time
          </option>
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default TimePicker;
