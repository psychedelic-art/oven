'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box, Typography, IconButton, TextField, Button, Chip, ToggleButton, ToggleButtonGroup,
  Paper, Divider, MenuItem, CircularProgress, Tabs, Tab, Slider, List, ListItemButton,
  ListSubheader, ListItemText, Fab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RouteIcon from '@mui/icons-material/Route';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '@oven/agent-ui/hooks';
import type { PaletteCommand } from '@oven/agent-ui';

// ─── Types ──────────────────────────────────────────────────

type PlaygroundMode = 'agent' | 'workflow';

interface Target {
  mode: PlaygroundMode;
  id: number;
  slug: string;
  name: string;
  description?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface WorkflowExecution {
  executionId: number;
  status: string;
  stepsExecuted: number;
  nodes: Array<{ nodeId: string; nodeType: string; status: string; durationMs?: number; error?: string; output?: unknown }>;
}

// ─── Workflow-incompatible commands ──────────────────────────

const WORKFLOW_BLOCKED_COMMANDS = new Set(['agent', 'tools', 'skill', 'mcp', 'pin', 'feedback', 'search', 'reset']);

// ─── Main Component ─────────────────────────────────────────

export function AIPlaygroundPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<PlaygroundMode>('workflow');
  const [target, setTarget] = useState<Target | null>(null);
  const [items, setItems] = useState<Array<{ id: number; name: string; slug: string; description?: string }>>([]);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rightTab, setRightTab] = useState(0);
  const [workflowExec, setWorkflowExec] = useState<WorkflowExecution | null>(null);
  const [model, setModel] = useState('fast');
  const [temperature, setTemperature] = useState(0.7);

  // ─── Command Palette (reuse agent-ui hook) ──────────────
  const [commands, setCommands] = useState<PaletteCommand[]>([]);
  const { paletteState, handleInputChange: handleCommandInput, handleKeyDown: handleCommandKeyDown, selectCommand, closePalette } = useCommandPalette(commands);

  // ─── Auto-scroll ────────────────────────────────────────
  const messagesRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Fetch commands on mount
  useEffect(() => {
    fetch('/api/chat-commands?range=[0,99]&filter={"enabled":true}')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCommands(data.map((c: Record<string, unknown>) => ({
            slug: c.slug as string,
            name: c.name as string,
            description: c.description as string,
            category: c.category as string,
          })));
        }
      })
      .catch(() => {});
  }, []);

  // Load targets
  useEffect(() => {
    const endpoint = mode === 'agent' ? '/api/agents?range=[0,99]' : '/api/agent-workflows?range=[0,99]';
    fetch(endpoint)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, [mode]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isAtBottom && messagesRef.current) {
      messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, isAtBottom]);

  const handleScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;

  // ─── Command Execution (client-side) ────────────────────

  const addSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { id: `sys-${Date.now()}`, role: 'system', content, timestamp: new Date() }]);
  }, []);

  const executeCommandLocally = useCallback((slug: string, args: string) => {
    // Workflow mode blocks
    if (target?.mode === 'workflow' && WORKFLOW_BLOCKED_COMMANDS.has(slug)) {
      addSystemMessage(`⚠️ /${slug} is not available in workflow mode.`);
      return;
    }

    switch (slug) {
      case 'clear':
        setMessages([]);
        setWorkflowExec(null);
        addSystemMessage('🗑️ Chat cleared.');
        break;
      case 'help':
        const cmdList = commands.map(c => `  /${c.slug} — ${c.description}`).join('\n');
        addSystemMessage(`📋 Available commands:\n${cmdList}`);
        break;
      case 'status':
        addSystemMessage(`📊 Status:\n  Mode: ${target?.mode ?? 'none'}\n  Target: ${target?.name ?? 'none'}\n  Model: ${model}\n  Temperature: ${temperature}`);
        break;
      case 'model':
        if (['fast', 'smart', 'claude'].includes(args)) {
          setModel(args);
          addSystemMessage(`✅ Model changed to: ${args}`);
        } else {
          addSystemMessage(`❌ Invalid model. Use: fast, smart, claude`);
        }
        break;
      case 'temperature':
        const temp = parseFloat(args);
        if (!isNaN(temp) && temp >= 0 && temp <= 2) {
          setTemperature(temp);
          addSystemMessage(`✅ Temperature changed to: ${temp}`);
        } else {
          addSystemMessage(`❌ Temperature must be 0-2.`);
        }
        break;
      case 'export':
        const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'playground-export.json'; a.click();
        URL.revokeObjectURL(url);
        addSystemMessage('📥 Chat exported.');
        break;
      default:
        addSystemMessage(`❓ Unknown command: /${slug}`);
    }
  }, [target, commands, model, temperature, messages, addSystemMessage]);

  // ─── Send Handler ───────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!target || !inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    closePalette();

    // Command routing
    if (text.startsWith('/') && text.length > 1) {
      const spaceIdx = text.indexOf(' ', 1);
      const slug = spaceIdx === -1 ? text.slice(1) : text.slice(1, spaceIdx);
      const args = spaceIdx === -1 ? '' : text.slice(spaceIdx + 1).trim();
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() }]);
      executeCommandLocally(slug, args);
      return;
    }

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      if (target.mode === 'workflow') {
        const res = await fetch(`/api/agent-workflows/${target.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triggerSource: 'playground',
            payload: { message: text, question: text },
            messages: [...messages, { role: 'user', content: text }].map(m => ({ role: m.role, content: m.content })),
          }),
        });
        if (res.ok) {
          const result = await res.json();
          const execRes = await fetch(`/api/agent-workflow-executions/${result.executionId}`);
          if (execRes.ok) {
            const execData = await execRes.json();
            setWorkflowExec({ executionId: execData.id, status: execData.status, stepsExecuted: execData.stepsExecuted, nodes: execData.nodeExecutions ?? [] });
          }
          const ctx = result.context ?? {};
          const responseText = findLLMOutput(ctx) ?? JSON.stringify(ctx, null, 2);
          setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: responseText, timestamp: new Date() }]);
        } else {
          addSystemMessage(`❌ Workflow error: ${res.status} ${res.statusText}`);
        }
      } else {
        const res = await fetch(`/api/agents/${target.slug}/invoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
        });
        if (res.ok) {
          const result = await res.json();
          setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.text ?? JSON.stringify(result), timestamp: new Date() }]);
        }
      }
    } catch (err) {
      addSystemMessage(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [target, inputText, messages, closePalette, executeCommandLocally, addSystemMessage]);

  // ─── Input handlers with command integration ────────────

  const handleInputTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    handleCommandInput(val);
  }, [handleCommandInput]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Command palette keyboard nav first
    const cmdResult = handleCommandKeyDown(e as unknown as React.KeyboardEvent);
    if (cmdResult !== null) {
      setInputText(cmdResult);
      return;
    }
    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleCommandKeyDown, handleSend]);

  // ─── Render ─────────────────────────────────────────────

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <IconButton onClick={() => navigate('/')} size="small"><ArrowBackIcon /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Playground</Typography>
        {target && (
          <Chip
            icon={target.mode === 'agent' ? <SmartToyIcon /> : <RouteIcon />}
            label={target.name}
            color={target.mode === 'agent' ? 'primary' : 'secondary'}
            size="small"
            onDelete={() => { setTarget(null); setMessages([]); setWorkflowExec(null); }}
          />
        )}
        {commands.length > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
            Type <code style={{ background: '#eee', padding: '1px 4px', borderRadius: 2, fontFamily: 'monospace' }}>/</code> for commands
          </Typography>
        )}
      </Box>

      {/* Main area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Target selector + config */}
        <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
          <Box sx={{ p: 2 }}>
            <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} size="small" fullWidth>
              <ToggleButton value="agent"><SmartToyIcon sx={{ mr: 0.5, fontSize: 16 }} /> Agents</ToggleButton>
              <ToggleButton value="workflow"><RouteIcon sx={{ mr: 0.5, fontSize: 16 }} /> Workflows</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ px: 2, pb: 1 }}>
            <TextField size="small" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} fullWidth />
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
            {filtered.map(item => (
              <Paper
                key={item.id}
                elevation={target?.id === item.id ? 2 : 0}
                onClick={() => { setTarget({ mode, id: item.id, slug: item.slug, name: item.name, description: item.description }); setMessages([]); setWorkflowExec(null); }}
                sx={{
                  p: 1.5, mb: 0.5, cursor: 'pointer', borderRadius: 1,
                  border: 1, borderColor: target?.id === item.id ? 'primary.main' : 'transparent',
                  bgcolor: target?.id === item.id ? 'primary.50' : 'white',
                  '&:hover': { bgcolor: target?.id === item.id ? 'primary.50' : 'grey.100' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{item.slug}</Typography>
                {item.description && <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 0.5 }}>{item.description.slice(0, 80)}</Typography>}
              </Paper>
            ))}
            {filtered.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No {mode === 'agent' ? 'agents' : 'workflows'} found</Typography>}
          </Box>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>Config</Typography>
            <TextField select label="Model" value={model} onChange={e => setModel(e.target.value)} size="small" fullWidth sx={{ mt: 1 }}>
              <MenuItem value="fast">Fast (GPT-4o-mini)</MenuItem>
              <MenuItem value="smart">Smart (GPT-4o)</MenuItem>
              <MenuItem value="claude">Claude (Sonnet)</MenuItem>
            </TextField>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>Temperature: {temperature}</Typography>
            <Slider value={temperature} onChange={(_, v) => setTemperature(v as number)} min={0} max={2} step={0.1} size="small" />
          </Box>
        </Box>

        {/* Center: Chat */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!target ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ mb: 1 }}>🧪</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>AI Playground</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>Select an agent or workflow to start testing</Typography>
              </Box>
            </Box>
          ) : (
            <>
              {/* Messages */}
              <Box ref={messagesRef} onScroll={handleScroll} sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative' }}>
                {messages.length === 0 && (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paper elevation={0} sx={{ p: 4, textAlign: 'center', maxWidth: 400, bgcolor: 'transparent' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{target.name}</Typography>
                      {target.description && <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{target.description}</Typography>}
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        Type a message to start, or use <code style={{ background: '#eee', padding: '1px 4px', borderRadius: 2 }}>/</code> for commands
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Chip label="/help" size="small" variant="outlined" onClick={() => { setInputText('/help'); handleSend(); }} sx={{ cursor: 'pointer', fontFamily: 'monospace' }} />
                        <Chip label="/status" size="small" variant="outlined" onClick={() => { setInputText('/status'); }} sx={{ cursor: 'pointer', fontFamily: 'monospace' }} />
                      </Box>
                    </Paper>
                  </Box>
                )}
                {messages.map(msg => (
                  <Box key={msg.id} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <Paper elevation={0} sx={{
                      px: 2, py: 1.5, maxWidth: '75%', borderRadius: 2,
                      bgcolor: msg.role === 'user' ? 'primary.main' : msg.role === 'system' ? 'warning.50' : 'grey.100',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                      border: msg.role === 'system' ? 1 : 0,
                      borderColor: 'warning.200',
                    }}>
                      {msg.role === 'system' && <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600, display: 'block', mb: 0.5 }}>System</Typography>}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>{msg.content}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5, fontSize: 10 }}>{msg.timestamp.toLocaleTimeString()}</Typography>
                    </Paper>
                  </Box>
                ))}
                {isLoading && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', color: 'text.secondary' }}>
                    <CircularProgress size={16} /><Typography variant="caption">Processing...</Typography>
                  </Box>
                )}

                {/* Scroll-to-bottom FAB */}
                {!isAtBottom && messages.length > 3 && (
                  <Fab size="small" onClick={scrollToBottom} sx={{ position: 'sticky', bottom: 8, alignSelf: 'center', bgcolor: 'white', boxShadow: 2 }}>
                    <KeyboardArrowDownIcon />
                  </Fab>
                )}
              </Box>

              {/* Input with command palette */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', position: 'relative' }}>
                {/* MUI Command Palette */}
                {paletteState.isOpen && paletteState.filteredCommands.length > 0 && (
                  <Paper elevation={4} sx={{ position: 'absolute', bottom: '100%', left: 16, right: 16, mb: 1, maxHeight: 280, overflow: 'auto', borderRadius: 2, zIndex: 50 }} role="listbox">
                    {(() => {
                      const grouped = new Map<string, PaletteCommand[]>();
                      for (const cmd of paletteState.filteredCommands) {
                        const g = grouped.get(cmd.category) ?? [];
                        g.push(cmd);
                        grouped.set(cmd.category, g);
                      }
                      let flatIdx = 0;
                      return Array.from(grouped.entries()).map(([cat, cmds]) => (
                        <List key={cat} subheader={<ListSubheader sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, lineHeight: '28px', bgcolor: 'grey.50' }}>{cat}</ListSubheader>} dense disablePadding>
                          {cmds.map(cmd => {
                            const idx = flatIdx++;
                            return (
                              <ListItemButton
                                key={cmd.slug}
                                selected={idx === paletteState.selectedIndex}
                                onClick={() => { const t = selectCommand(cmd.slug); setInputText(t); }}
                                role="option"
                                aria-selected={idx === paletteState.selectedIndex}
                                sx={{ px: 2, py: 0.5 }}
                              >
                                <ListItemText
                                  primary={<Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>/{cmd.slug}</Typography>}
                                  secondary={<Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{cmd.description}</Typography>}
                                />
                              </ListItemButton>
                            );
                          })}
                        </List>
                      ));
                    })()}
                  </Paper>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Message ${target.name}... (type / for commands)`}
                    value={inputText}
                    onChange={handleInputTextChange}
                    onKeyDown={handleInputKeyDown}
                    disabled={isLoading}
                    multiline
                    maxRows={4}
                    inputProps={{ style: { fontFamily: inputText.startsWith('/') ? 'monospace' : 'inherit' } }}
                  />
                  <Button variant="contained" onClick={handleSend} disabled={isLoading || !inputText.trim()} sx={{ minWidth: 44 }}>
                    <SendIcon fontSize="small" />
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>

        {/* Right: Inspector / Eval / Trace */}
        <Box sx={{ width: 320, borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Tabs value={rightTab} onChange={(_, v) => setRightTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: 11, textTransform: 'none' } }}>
            <Tab label="🔍 Inspector" />
            <Tab label="📊 Eval" />
            <Tab label="🔗 Trace" />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {rightTab === 0 && <InspectorPanel messages={messages} execution={workflowExec} mode={target?.mode ?? 'agent'} />}
            {rightTab === 1 && <EvalPanel target={target} />}
            {rightTab === 2 && <TracePanel execution={workflowExec} />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Inspector Panel ────────────────────────────────────────

function InspectorPanel({ messages, execution, mode }: { messages: Message[]; execution: WorkflowExecution | null; mode: PlaygroundMode }) {
  if (mode === 'workflow' && execution) {
    return (
      <Box>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label={execution.status} size="small" color={execution.status === 'completed' ? 'success' : execution.status === 'failed' ? 'error' : 'default'} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{execution.stepsExecuted} steps · {execution.nodes.reduce((s, n) => s + (n.durationMs ?? 0), 0)}ms</Typography>
          </Box>
        </Box>
        {execution.nodes.map((node, i) => (
          <Box key={node.nodeId} sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', width: 16 }}>{i + 1}</Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: node.status === 'completed' ? 'success.main' : node.status === 'failed' ? 'error.main' : 'grey.400' }} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{node.nodeId}</Typography>
              <Chip label={node.nodeType} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
              {node.durationMs && <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>{node.durationMs}ms</Typography>}
            </Box>
            {node.error && <Typography variant="caption" sx={{ color: 'error.main', ml: 3, display: 'block' }}>{node.error}</Typography>}
          </Box>
        ))}
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>⏳ Waiting for interaction...</Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1 }}>Send a message or run a command to see execution details</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {messages.map(msg => (
        <Box key={msg.id} sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: msg.role === 'user' ? 'primary.main' : msg.role === 'assistant' ? 'success.main' : 'warning.main' }} />
            <Typography variant="caption" sx={{ fontWeight: 500 }}>{msg.role}</Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>{msg.timestamp.toLocaleTimeString()}</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>{msg.content.slice(0, 100)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Eval Panel ─────────────────────────────────────────────

function EvalPanel({ target }: { target: Target | null }) {
  const [testCases, setTestCases] = useState('[\n  { "input": "Hello", "assertions": [{ "type": "contains", "value": "hello" }] }\n]');
  const [report, setReport] = useState<{ summary: { total: number; passed: number; failed: number; avgScore: number }; testCases: Array<{ input: string; output: string; passed: boolean; score: number; latencyMs: number }> } | null>(null);
  const [loading, setLoading] = useState(false);

  const runEval = async () => {
    if (!target) return;
    setLoading(true);
    try {
      const cases = JSON.parse(testCases);
      const res = await fetch('/api/agent-eval-promptfoo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetMode: target.mode, targetId: target.id, targetSlug: target.slug, testCases: cases }),
      });
      if (res.ok) setReport(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Eval Report</Typography>
      <TextField multiline rows={4} value={testCases} onChange={e => setTestCases(e.target.value)} label="Test Cases (JSON)" size="small" sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 11 } }} />
      <Button variant="contained" size="small" onClick={runEval} disabled={!target || loading}>{loading ? 'Running...' : 'Run Eval'}</Button>
      {report && (
        <>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`${report.summary.total} total`} size="small" />
            <Chip label={`${report.summary.passed} passed`} size="small" color="success" />
            <Chip label={`${report.summary.failed} failed`} size="small" color="error" />
            <Chip label={`${report.summary.avgScore}%`} size="small" color="primary" />
          </Box>
          {report.testCases.map((tc, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: tc.passed ? 'success.main' : 'error.main', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{tc.passed ? '✓' : '✕'}</Box>
                <Typography variant="caption" sx={{ flex: 1 }}>{tc.input}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{tc.latencyMs}ms</Typography>
              </Box>
            </Paper>
          ))}
        </>
      )}
      {!target && <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>Select a target first</Typography>}
    </Box>
  );
}

// ─── Trace Panel ────────────────────────────────────────────

function TracePanel({ execution }: { execution: WorkflowExecution | null }) {
  const [traceUrl, setTraceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (execution?.executionId) {
      fetch(`/api/agent-eval-promptfoo?executionId=${execution.executionId}`)
        .then(r => r.json())
        .then(data => { if (data.traceUrl) setTraceUrl(data.traceUrl); })
        .catch(() => {});
    }
  }, [execution?.executionId]);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Trace</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>LangSmith: Tracing module loaded</Typography>
      </Box>
      {traceUrl && (
        <Button variant="outlined" size="small" href={traceUrl} target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none' }}>🔍 View in LangSmith →</Button>
      )}
      {execution && (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${execution.stepsExecuted} steps`} size="small" />
            <Chip label={execution.status} size="small" color={execution.status === 'completed' ? 'success' : 'default'} />
            <Chip label={`${execution.nodes.reduce((s, n) => s + (n.durationMs ?? 0), 0)}ms`} size="small" variant="outlined" />
          </Box>
          {execution.nodes.map((node, i) => (
            <Box key={node.nodeId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', width: 16 }}>{i + 1}</Typography>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: node.status === 'completed' ? 'success.main' : node.status === 'failed' ? 'error.main' : 'grey.400' }} />
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{node.nodeId}</Typography>
              {node.durationMs && <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>{node.durationMs}ms</Typography>}
            </Box>
          ))}
        </>
      )}
      {!execution && <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>Execute a workflow to see trace data</Typography>}
      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Traces are sent to LangSmith when <code style={{ background: '#eee', padding: '1px 4px', borderRadius: 2 }}>LANGSMITH_API_KEY</code> is set in your server .env.</Typography>
      </Paper>
    </Box>
  );
}

// ─── Helper ─────────────────────────────────────────────────

function findLLMOutput(context: Record<string, unknown>): string | null {
  for (const value of Object.values(context).reverse()) {
    if (value && typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).text as string;
    }
  }
  return null;
}
