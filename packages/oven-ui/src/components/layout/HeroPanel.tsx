'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface HeroPanelProps {
  children?: React.ReactNode;
  /** URL for background image */
  backgroundImage?: string;
  /** Overlay preset or 'custom' for custom gradient */
  overlay?: 'none' | 'dark' | 'brand-red' | 'brand-blue' | 'custom';
  /** Custom Tailwind gradient classes (when overlay='custom') */
  overlayGradient?: string;
  /** Minimum height */
  minHeight?: 'auto' | 'screen' | 'half';
  /** Vertical alignment of content */
  verticalAlign?: 'start' | 'center' | 'end' | 'between';
  /** Inner padding */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const minHeightStyles: Record<string, string> = {
  auto: '',
  screen: 'min-h-screen',
  half: 'min-h-[50vh]',
};

const verticalAlignStyles: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-8',
  lg: 'p-12',
  xl: 'p-16',
};

const overlayStyles: Record<string, string> = {
  none: '',
  dark: 'bg-gradient-to-br from-black/70 to-black/90',
  'brand-red': 'bg-gradient-to-br from-red-600/90 via-red-600/70 to-black/80',
  'brand-blue': 'bg-gradient-to-br from-blue-600/90 via-blue-600/70 to-indigo-900/80',
};

export function HeroPanel({
  children,
  backgroundImage,
  overlay = 'none',
  overlayGradient,
  minHeight = 'auto',
  verticalAlign = 'start',
  padding = 'md',
  className,
}: HeroPanelProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden bg-cover bg-center bg-no-repeat',
        minHeightStyles[minHeight],
        paddingStyles[padding],
        className
      )}
      {...(backgroundImage
        ? { style: { '--hero-bg-image': `url(${backgroundImage})` } as React.CSSProperties }
        : {})}
    >
      {/* Background image via CSS custom property */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-[image:var(--hero-bg-image)] bg-cover bg-center bg-no-repeat" />
      )}

      {/* Overlay */}
      {overlay !== 'none' && (
        <div
          className={cn(
            'absolute inset-0',
            overlay === 'custom' ? overlayGradient : overlayStyles[overlay]
          )}
        />
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 flex flex-1 flex-col',
          verticalAlignStyles[verticalAlign]
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default HeroPanel;
