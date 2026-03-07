'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface ImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  rounded?: boolean;
  shadow?: boolean;
  className?: string;
}

const objectFitStyles: Record<string, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
};

export function Image({
  src,
  alt,
  width,
  height,
  objectFit = 'cover',
  rounded = false,
  shadow = false,
  className,
}: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        'max-w-full',
        objectFitStyles[objectFit],
        rounded && 'rounded-lg',
        shadow && 'shadow-md',
        className
      )}
    />
  );
}

export default Image;
