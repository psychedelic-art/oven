'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface StepItem {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  className,
}: StepperProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'flex',
        isHorizontal ? 'flex-row items-start' : 'flex-col',
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div
            key={index}
            className={cn(
              'flex',
              isHorizontal
                ? 'flex-1 flex-col items-center'
                : 'flex-row items-start'
            )}
          >
            <div
              className={cn(
                'flex',
                isHorizontal
                  ? 'w-full flex-col items-center'
                  : 'flex-row items-start gap-3'
              )}
            >
              {/* Step indicator row (circle + connectors) */}
              <div
                className={cn(
                  'flex items-center',
                  isHorizontal ? 'w-full' : 'flex-col'
                )}
              >
                {/* Leading connector */}
                {index > 0 && (
                  <div
                    className={cn(
                      isHorizontal
                        ? 'h-0.5 flex-1'
                        : 'w-0.5 h-6 ml-4',
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
                {/* Spacer for first item horizontal alignment */}
                {index === 0 && isHorizontal && <div className="flex-1" />}

                {/* Circle */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    isCompleted &&
                      'border-green-500 bg-green-500 text-white',
                    isCurrent &&
                      'border-blue-600 bg-blue-600 text-white',
                    !isCompleted &&
                      !isCurrent &&
                      'border-gray-300 bg-white text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Trailing connector */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      isHorizontal
                        ? 'h-0.5 flex-1'
                        : 'w-0.5 h-6 ml-4',
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
                {/* Spacer for last item horizontal alignment */}
                {index === steps.length - 1 && isHorizontal && (
                  <div className="flex-1" />
                )}
              </div>

              {/* Label + description */}
              <div
                className={cn(
                  isHorizontal
                    ? 'mt-2 text-center'
                    : 'flex flex-col pb-8'
                )}
              >
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-blue-600',
                    isCompleted && 'text-green-600',
                    !isCurrent && !isCompleted && 'text-gray-500'
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Stepper;
