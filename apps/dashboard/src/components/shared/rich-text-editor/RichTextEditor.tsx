'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Box } from '@mui/material';
import { VariableNode } from './extensions/VariableNode';
import EditorToolbar from './components/EditorToolbar';
import VariableModal from './components/VariableModal';
import type { RichTextEditorProps, VariableData } from './types';
import './rich-text-editor.css';

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  variables = [],
  onVariableInsert,
  minHeight = 200,
  showToolbar = true,
  toolbarItems,
}: RichTextEditorProps) {
  const [variableModalOpen, setVariableModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      Link.configure({ openOnClick: false }),
      VariableNode,
    ],
    content: value,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  // Toolbar {{}} button → open modal
  const handleVariableClick = useCallback(() => {
    setVariableModalOpen(true);
  }, []);

  // Modal confirm → insert variable node into editor
  const handleVariableConfirm = useCallback((variable: VariableData) => {
    if (!editor) return;
    (editor.commands as any).insertVariable(variable.name);
    onVariableInsert?.(variable);
    setVariableModalOpen(false);
  }, [editor, onVariableInsert]);

  if (!editor) return null;

  return (
    <>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 1px', boxShadowColor: 'primary.main' },
        }}
      >
        {showToolbar && (
          <EditorToolbar
            editor={editor}
            items={toolbarItems}
            onVariableClick={handleVariableClick}
          />
        )}
        <Box
          sx={{
            minHeight,
            overflow: 'auto',
            '& .ProseMirror': {
              p: 2,
              outline: 'none',
              minHeight: 'inherit',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'text.primary',
            },
            '& .ProseMirror p.is-editor-empty:first-child::before': {
              content: 'attr(data-placeholder)',
              float: 'left',
              color: 'text.disabled',
              pointerEvents: 'none',
              height: 0,
            },
            '& .ProseMirror p': { m: 0, mb: 0.5 },
            '& .ProseMirror h1': { fontSize: '1.4em', fontWeight: 700, mt: 1, mb: 0.5 },
            '& .ProseMirror h2': { fontSize: '1.2em', fontWeight: 600, mt: 0.8, mb: 0.4 },
            '& .ProseMirror ul, & .ProseMirror ol': { pl: 3, my: 0.5 },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>

      <VariableModal
        open={variableModalOpen}
        onClose={() => setVariableModalOpen(false)}
        onConfirm={handleVariableConfirm}
        variables={variables}
      />
    </>
  );
}
