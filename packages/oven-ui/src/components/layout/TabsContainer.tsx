'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsContainerProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function TabsContainer({
  tabs,
  defaultTab,
  onChange,
  className,
}: TabsContainerProps) {
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab ?? tabs[0]?.id ?? ''
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onChange?.(tabId);
    },
    [onChange]
  );

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={cn('w-full', className)}>
      {/* Tab bar */}
      <div className="border-b border-gray-200" role="tablist">
        <nav className="-mb-px flex space-x-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active panel */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={activeTab}
        className="pt-4"
      >
        {activeContent}
      </div>
    </div>
  );
}
