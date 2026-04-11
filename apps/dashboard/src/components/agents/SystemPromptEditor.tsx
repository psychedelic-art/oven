'use client';

import { useMemo, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { RichTextEditor, promptToHtml, htmlToPrompt } from '../shared/rich-text-editor';
import type { VariableData } from '../shared/rich-text-editor';

interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description?: string;
  defaultValue?: string;
}

interface SystemPromptEditorProps {
  value: string;
  onChange: (prompt: string) => void;
  inputSchema?: SchemaField[];
}

export default function SystemPromptEditor({ value, onChange, inputSchema = [] }: SystemPromptEditorProps) {
  const variables: VariableData[] = useMemo(
    () => inputSchema.filter((f) => f.name).map((f) => ({
      name: f.name,
      type: f.type,
      description: f.description,
      defaultValue: f.defaultValue,
    })),
    [inputSchema]
  );

  // Convert plain text to HTML ONCE for initial editor content
  // After that, TipTap owns the HTML state internally
  const initialHtml = useRef(promptToHtml(value ?? ''));

  // On editor change, convert HTML → plain text for the parent
  const handleChange = useCallback((html: string) => {
    onChange(htmlToPrompt(html));
  }, [onChange]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>System Prompt</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Define the agent&apos;s personality and instructions. Click variables from the palette to insert them.
      </Typography>
      <RichTextEditor
        value={initialHtml.current}
        onChange={handleChange}
        variables={variables}
        placeholder="You are a helpful dental assistant for {{businessName}}..."
        minHeight={250}
        toolbarItems={['bold', 'italic', 'underline', '|', 'heading1', 'heading2', '|', 'bulletList', 'orderedList', '|', 'variable', '|', 'undo', 'redo']}
      />
    </Box>
  );
}
