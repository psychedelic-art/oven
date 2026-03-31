'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface GridCellProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Grid cell wrapper — used as a droppable column slot inside
 * oven-grid-2col / oven-grid-3col rows.
 * In the React renderer this is transparent (renders children).
 * In GrapeJS it becomes an individually droppable component.
 */
export function GridCell({ children, className }: GridCellProps) {
  return <div className={cn('min-h-0', className)}>{children}</div>;
}
