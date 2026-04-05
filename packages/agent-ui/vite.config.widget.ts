import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/entry/widget.ts'),
      name: 'OvenChatWidget',
      fileName: 'oven-chat-widget',
      formats: ['iife'],
    },
    outDir: 'dist',
    rollupOptions: {
      // Bundle everything (self-contained widget)
      external: [],
    },
    minify: 'terser',
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
