'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface LinkButtonProps {
  label: string;
  href: string;
  target?: '_self' | '_blank';
  variant?: 'primary' | 'secondary' | 'link';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent rounded-md',
  secondary:
    'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 border-transparent rounded-md',
  link: 'bg-transparent text-blue-600 hover:text-blue-800 hover:underline border-transparent p-0 h-auto focus:ring-blue-500',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function LinkButton({
  label,
  href,
  target = '_self',
  variant = 'primary',
  size = 'md',
  className,
}: LinkButtonProps) {
  const isLink = variant === 'link';

  return (
    <a
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cn(
        'inline-flex items-center justify-center border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        variantStyles[variant],
        !isLink && sizeStyles[size],
        isLink && size === 'sm' && 'text-xs',
        isLink && size === 'md' && 'text-sm',
        isLink && size === 'lg' && 'text-base',
        className
      )}
    >
      {label}
    </a>
  );
}

export default LinkButton;
