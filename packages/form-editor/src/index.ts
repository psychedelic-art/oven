'use client';

// ─── Form Editor ────────────────────────────────────────────────
// GrapeJS-based visual editor for building forms, pages, and
// application interfaces. This is a scaffold — the full editor
// implementation will be built incrementally.
//
// Usage:
//   import { FormEditor } from '@oven/form-editor';
//   <FormEditor config={editorConfig} />

export { default as FormEditor } from './FormEditor';
export type { EditorConfig, BlockDefinition, EditorState } from './types';
