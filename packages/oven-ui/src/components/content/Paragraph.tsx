'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface ParagraphProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'muted' | 'primary';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'text-sm leading-relaxed',
  md: 'text-base leading-relaxed',
  lg: 'text-lg leading-relaxed',
};

const colorStyles: Record<string, string> = {
  default: 'text-gray-700',
  muted: 'text-gray-500',
  primary: 'text-blue-600',
};

const alignStyles: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Paragraph({
  text,
  size = 'md',
  color = 'default',
  align = 'left',
  className,
}: ParagraphProps) {
  return (
    <p
      className={cn(
        sizeStyles[size],
        colorStyles[color],
        alignStyles[align],
        className
      )}
    >
      {text}
    </p>
  );
}

export default Paragraph;
