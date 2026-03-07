'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface PhoneInputProps {
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  countryCode?: string;
  className?: string;
}

const COUNTRY_CODES = [
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+61', label: 'AU +61' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+81', label: 'JP +81' },
  { code: '+86', label: 'CN +86' },
  { code: '+55', label: 'BR +55' },
  { code: '+52', label: 'MX +52' },
];

export function PhoneInput({
  label,
  name,
  placeholder = '(555) 123-4567',
  required,
  disabled,
  value,
  onChange,
  error,
  countryCode = '+1',
  className,
}: PhoneInputProps) {
  const [selectedCode, setSelectedCode] = React.useState(countryCode);

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCode(e.target.value);
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
      <div className="flex">
        <select
          value={selectedCode}
          onChange={handleCodeChange}
          disabled={disabled}
          className={cn(
            'flex h-10 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500'
          )}
          aria-label="Country code"
        >
          {COUNTRY_CODES.map((cc) => (
            <option key={cc.code} value={cc.code}>
              {cc.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          id={name}
          name={name}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'flex h-10 w-full rounded-r-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500'
          )}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default PhoneInput;
