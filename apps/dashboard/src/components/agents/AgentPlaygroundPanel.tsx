'use client';

import { useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Chip, CircularProgress,
  Alert, Divider, Collapse, IconButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface PlaygroundMessage {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

interface AgentPlaygroundPanelProps {
  agentId: number;
  agentName: string;
}

export default function AgentPlaygroundPanel({ agentId, agentName }: AgentPlaygroundPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExecution, setLastExecution] = useState<Record<string, unknown> | null>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.text ?? '',
        metadata: { model: data.model, tokens: data.tokens, latencyMs: data.latencyMs, costCents: data.costCents },
      }]);
      setLastExecution(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invocation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Divider />
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <SmartToyIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Test Agent
        </Typography>
        <Chip label={messages.length > 0 ? `${messages.length} messages` : 'No messages'} size="small" variant="outlined" />
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ p: 2, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', mb: 2, minHeight: 150, maxHeight: 350 }}>
            {messages.length === 0 && (
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
                Send a message to test "{agentName}"
              </Typography>
            )}
            {messages.map((msg, i) => (
              <Box key={i} sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                </Paper>
                {msg.metadata && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    <Chip label={msg.metadata.model as string} size="small" sx={{ height: 18, fontSize: 10 }} />
                    <Chip label={`${(msg.metadata.tokens as Record<string, number>)?.total ?? 0} tokens`} size="small" sx={{ height: 18, fontSize: 10 }} />
                    <Chip label={`${msg.metadata.latencyMs}ms`} size="small" sx={{ height: 18, fontSize: 10 }} />
                  </Box>
                )}
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', color: 'text.secondary' }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Thinking...</Typography>
              </Box>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

          {/* Input */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              size="small"
              fullWidth
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={loading}
            />
            <Button variant="contained" onClick={handleSend} disabled={loading || !input.trim()} sx={{ minWidth: 40 }}>
              <SendIcon sx={{ fontSize: 18 }} />
            </Button>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
}
