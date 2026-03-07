'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface RichTextProps {
  content: string;
  className?: string;
}

/**
 * RichText renders raw HTML content with prose-like Tailwind typography styles.
 *
 * WARNING: This component uses dangerouslySetInnerHTML. The `content` prop is
 * rendered as raw HTML. Ensure that the content is sanitized before passing it
 * to this component to prevent XSS attacks. Consider using a library such as
 * DOMPurify to sanitize user-generated or untrusted HTML content.
 */
export function RichText({ content, className }: RichTextProps) {
  return (
    <div
      className={cn(
        // Prose-like typography styles using Tailwind utilities
        '[&>h1]:text-4xl [&>h1]:font-bold [&>h1]:tracking-tight [&>h1]:mt-8 [&>h1]:mb-4',
        '[&>h2]:text-3xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>h2]:mt-7 [&>h2]:mb-3',
        '[&>h3]:text-2xl [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3',
        '[&>h4]:text-xl [&>h4]:font-semibold [&>h4]:mt-5 [&>h4]:mb-2',
        '[&>h5]:text-lg [&>h5]:font-medium [&>h5]:mt-4 [&>h5]:mb-2',
        '[&>h6]:text-base [&>h6]:font-medium [&>h6]:mt-4 [&>h6]:mb-2',
        '[&>p]:text-base [&>p]:leading-relaxed [&>p]:text-gray-700 [&>p]:mb-4',
        '[&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ul]:text-gray-700',
        '[&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>ol]:text-gray-700',
        '[&>li]:mb-1',
        '[&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:mb-4',
        '[&>pre]:bg-gray-100 [&>pre]:rounded-md [&>pre]:p-4 [&>pre]:overflow-x-auto [&>pre]:mb-4 [&>pre]:text-sm',
        '[&>code]:bg-gray-100 [&>code]:rounded [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:text-sm [&>code]:font-mono',
        '[&>a]:text-blue-600 [&>a]:underline [&>a]:hover:text-blue-800',
        '[&>hr]:border-gray-200 [&>hr]:my-6',
        '[&>table]:w-full [&>table]:border-collapse [&>table]:mb-4',
        '[&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold',
        '[&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm',
        '[&>img]:max-w-full [&>img]:rounded-md [&>img]:my-4',
        'text-gray-900',
        className
      )}
      // WARNING: Ensure content is sanitized before rendering.
      // Use DOMPurify or a similar library for untrusted HTML.
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default RichText;
