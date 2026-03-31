'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface HeadingProps {
  text: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const levelStyles: Record<string, string> = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold',
  h4: 'text-xl font-semibold',
  h5: 'text-lg font-medium',
  h6: 'text-base font-medium',
};

const alignStyles: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Heading({
  text,
  level = 'h2',
  align = 'left',
  className,
}: HeadingProps) {
  const Tag = level;

  return (
    <Tag
      className={cn(
        'text-gray-900',
        levelStyles[level],
        alignStyles[align],
        className
      )}
    >
      {text}
    </Tag>
  );
}

export default Heading;
