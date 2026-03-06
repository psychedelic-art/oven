import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

/**
 * Chat page node — embeds a chat/support widget.
 */
export function ChatPageNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#fce4ec',
        border: '2px solid',
        borderColor: selected ? '#880e4f' : '#e91e63',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: '#880e4f' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#880e4f' }}>
          Chat
        </Typography>
      </Box>
      {d?.title && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {d.title}
        </Typography>
      )}
      {d?.slug && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary' }}>
          /{d.slug}
        </Typography>
      )}
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
