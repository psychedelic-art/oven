'use client';

// ─── Form Editor ────────────────────────────────────────────────
// GrapeJS-based visual editor for building forms, pages, and
// application interfaces. Saves/loads component trees as JSON,
// which the oven-ui ComponentRenderer renders at runtime.
//
// Usage:
//   import { FormEditor } from '@oven/form-editor';
//   <FormEditor config={editorConfig} />

export { default as FormEditor } from './FormEditor';
export { registerOvenComponents } from './registerOvenComponents';
export type { EditorConfig, BlockDefinition, EditorState, FormDefinitionData } from './types';
