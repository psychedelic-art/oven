'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface StatCardTrend {
  direction: 'up' | 'down';
  value: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: StatCardTrend;
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            {value}
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              {trend.direction === 'up' ? (
                <svg
                  className="h-4 w-4 text-green-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
