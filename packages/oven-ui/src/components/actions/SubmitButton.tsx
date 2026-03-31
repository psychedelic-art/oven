'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface SubmitButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent',
  secondary:
    'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 border-transparent',
  outline:
    'bg-transparent text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function SubmitButton({
  label = 'Submit',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className,
  fullWidth = false,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {label}
    </button>
  );
}

export default SubmitButton;
