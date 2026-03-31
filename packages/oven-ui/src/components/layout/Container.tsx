'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  full: 'max-w-full',
};

const paddingClasses: Record<string, string> = {
  none: 'px-0',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

export function Container({
  children,
  maxWidth = 'lg',
  padding = 'md',
  className,
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
