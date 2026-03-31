'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface IconButtonProps {
  icon: React.ReactNode;
  tooltip?: string;
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border-transparent',
  outline:
    'bg-transparent text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
};

export function IconButton({
  icon,
  tooltip,
  variant = 'ghost',
  size = 'md',
  onClick,
  disabled = false,
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon}
    </button>
  );
}

export default IconButton;
