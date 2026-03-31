'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  multiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}

export function Accordion({
  items,
  multiple = false,
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(defaultOpen)
  );

  const toggleItem = useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (!multiple) {
            next.clear();
          }
          next.add(id);
        }
        return next;
      });
    },
    [multiple]
  );

  return (
    <div
      className={cn(
        'divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
            >
              <span>{item.title}</span>
              <svg
                className={cn(
                  'h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div
              id={`accordion-content-${item.id}`}
              role="region"
              className={cn(
                'overflow-hidden transition-all duration-200',
                isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="px-4 pb-4 pt-0 text-sm text-gray-700">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
