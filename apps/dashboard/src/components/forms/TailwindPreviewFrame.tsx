'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';

/**
 * Renders children inside an iframe that has Tailwind CSS loaded.
 *
 * Uses React `createPortal` to render into the iframe's body,
 * which preserves the React context tree (FormProvider, etc.)
 * while providing an isolated Tailwind-styled environment.
 *
 * The dashboard app uses MUI (no Tailwind), but oven-ui components
 * rely on Tailwind classes — this iframe bridges that gap.
 */
interface TailwindPreviewFrameProps {
  children: React.ReactNode;
}

export function TailwindPreviewFrame({ children }: TailwindPreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function setupIframe() {
      const doc = iframe!.contentDocument;
      if (!doc) return;

      // Write a minimal HTML document
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="preview-root"></div>
</body>
</html>`);
      doc.close();

      // Wait for the script to load, then set mount node
      const checkReady = () => {
        const root = doc.getElementById('preview-root');
        if (root) {
          setMountNode(root);
        }
      };

      // Give Tailwind CDN a moment to initialize
      setTimeout(checkReady, 100);
    }

    iframe.addEventListener('load', setupIframe);

    // If iframe is already loaded (cached), run setup immediately
    if (iframe.contentDocument?.readyState === 'complete') {
      setupIframe();
    }

    return () => {
      iframe.removeEventListener('load', setupIframe);
    };
  }, []);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        component="iframe"
        ref={iframeRef}
        title="Form Preview"
        sandbox="allow-scripts allow-same-origin"
        src="about:blank"
        sx={{ width: '100%', height: '100%', border: 'none' }}
      />
      {mountNode && createPortal(children, mountNode)}
    </Box>
  );
}
