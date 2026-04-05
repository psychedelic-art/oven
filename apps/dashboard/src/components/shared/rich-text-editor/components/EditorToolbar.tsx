'use client';

import type { Editor } from '@tiptap/react';
import { Box, IconButton, Divider, Tooltip } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import TitleIcon from '@mui/icons-material/Title';
import DataObjectIcon from '@mui/icons-material/DataObject';
import type { ToolbarItem } from '../types';

interface EditorToolbarProps {
  editor: Editor;
  items?: ToolbarItem[];
  onVariableClick?: () => void;
}

export default function EditorToolbar({ editor, items, onVariableClick }: EditorToolbarProps) {
  const defaultItems: ToolbarItem[] = [
    'bold', 'italic', 'underline', '|',
    'heading1', 'heading2', '|',
    'bulletList', 'orderedList', '|',
    'variable', '|',
    'undo', 'redo',
  ];

  const toolbarItems = items ?? defaultItems;

  const buttons: Record<string, {
    icon: React.ReactElement;
    title: string;
    action: () => void;
    isActive?: () => boolean;
  }> = {
    bold: { icon: <FormatBoldIcon sx={{ fontSize: 18 }} />, title: 'Bold', action: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive('bold') },
    italic: { icon: <FormatItalicIcon sx={{ fontSize: 18 }} />, title: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive('italic') },
    underline: { icon: <FormatUnderlinedIcon sx={{ fontSize: 18 }} />, title: 'Underline', action: () => editor.chain().focus().toggleUnderline().run(), isActive: () => editor.isActive('underline') },
    heading1: { icon: <TitleIcon sx={{ fontSize: 20 }} />, title: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
    heading2: { icon: <TitleIcon sx={{ fontSize: 16 }} />, title: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
    bulletList: { icon: <FormatListBulletedIcon sx={{ fontSize: 18 }} />, title: 'Bullet List', action: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
    orderedList: { icon: <FormatListNumberedIcon sx={{ fontSize: 18 }} />, title: 'Numbered List', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
    variable: { icon: <DataObjectIcon sx={{ fontSize: 18 }} />, title: 'Insert Variable {{}}', action: () => onVariableClick?.() },
    undo: { icon: <UndoIcon sx={{ fontSize: 18 }} />, title: 'Undo', action: () => editor.chain().focus().undo().run() },
    redo: { icon: <RedoIcon sx={{ fontSize: 18 }} />, title: 'Redo', action: () => editor.chain().focus().redo().run() },
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
      {toolbarItems.map((item, i) => {
        if (item === '|') return <Divider key={i} orientation="vertical" flexItem sx={{ mx: 0.5 }} />;
        const btn = buttons[item];
        if (!btn) return null;
        return (
          <Tooltip key={item} title={btn.title}>
            <IconButton
              size="small"
              onClick={btn.action}
              sx={{
                borderRadius: 1,
                bgcolor: btn.isActive?.() ? 'primary.100' : 'transparent',
                color: btn.isActive?.() ? 'primary.main' : 'text.secondary',
                '&:hover': { bgcolor: btn.isActive?.() ? 'primary.200' : 'action.hover' },
              }}
            >
              {btn.icon}
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
}
