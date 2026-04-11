'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, TextField, MenuItem, Slider, Typography, Switch, FormControlLabel,
  Chip, Autocomplete, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface AgentConfigFormProps {
  value: Record<string, unknown> | string | null;
  onChange: (config: Record<string, unknown>) => void;
  showMemory?: boolean;
  memoryValue?: Record<string, unknown> | string | null;
  onMemoryChange?: (config: Record<string, unknown>) => void;
}

interface ModelAlias {
  id: number;
  alias: string;
  modelId: string;
  type: string;
  enabled: boolean;
}

export function AgentConfigForm({ value, onChange, showMemory, memoryValue, onMemoryChange }: AgentConfigFormProps) {
  const config = parseConfig(value);
  const memory = parseConfig(memoryValue);
  const [modelAliases, setModelAliases] = useState<ModelAlias[]>([]);
  const [showJson, setShowJson] = useState(false);

  // Fetch model aliases
  useEffect(() => {
    fetch('/api/ai-aliases?range=[0,99]&filter={"enabled":true,"type":"text"}')
      .then(r => r.json())
      .then(data => setModelAliases(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const updateConfig = (field: string, val: unknown) => {
    onChange({ ...config, [field]: val });
  };

  const updateMemory = (field: string, val: unknown) => {
    if (onMemoryChange) onMemoryChange({ ...memory, [field]: val });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Toggle JSON/Form mode */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <FormControlLabel
          control={<Switch size="small" checked={showJson} onChange={e => setShowJson(e.target.checked)} />}
          label={<Typography variant="caption" sx={{ color: 'text.secondary' }}>JSON mode</Typography>}
        />
      </Box>

      {showJson ? (
        /* Raw JSON mode */
        <TextField
          label="Agent Config (JSON)"
          multiline
          rows={10}
          value={JSON.stringify(config, null, 2)}
          onChange={e => {
            try { onChange(JSON.parse(e.target.value)); } catch { /* let user finish typing */ }
          }}
          sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
          fullWidth
        />
      ) : (
        /* Structured form mode */
        <>
          {/* Model Selection */}
          <TextField
            select
            label="Model"
            value={config.model ?? 'fast'}
            onChange={e => updateConfig('model', e.target.value)}
            fullWidth
            helperText="Select an AI model alias"
          >
            {modelAliases.length > 0 ? (
              modelAliases.map(alias => (
                <MenuItem key={alias.alias} value={alias.alias}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{alias.alias}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{alias.modelId}</Typography>
                  </Box>
                </MenuItem>
              ))
            ) : (
              <>
                <MenuItem value="fast">Fast (GPT-4o-mini)</MenuItem>
                <MenuItem value="smart">Smart (GPT-4o)</MenuItem>
                <MenuItem value="claude">Claude (Sonnet)</MenuItem>
              </>
            )}
          </TextField>

          {/* Temperature */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Temperature: {config.temperature ?? 0.7}
            </Typography>
            <Slider
              value={config.temperature as number ?? 0.7}
              onChange={(_, v) => updateConfig('temperature', v)}
              min={0}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
              size="small"
              marks={[
                { value: 0, label: '0' },
                { value: 0.7, label: '0.7' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
            />
          </Box>

          {/* Max Tokens */}
          <TextField
            type="number"
            label="Max Tokens"
            value={config.maxTokens ?? 4096}
            onChange={e => updateConfig('maxTokens', parseInt(e.target.value))}
            fullWidth
            helperText="Maximum output length"
          />

          {/* Max Steps */}
          <TextField
            type="number"
            label="Max Steps (Safety Limit)"
            value={config.maxSteps ?? 50}
            onChange={e => updateConfig('maxSteps', parseInt(e.target.value))}
            fullWidth
            helperText="Maximum execution steps before workflow stops"
          />

          {/* Timeout */}
          <TextField
            type="number"
            label="Timeout (ms)"
            value={config.timeoutMs ?? 120000}
            onChange={e => updateConfig('timeoutMs', parseInt(e.target.value))}
            fullWidth
            helperText="Execution timeout in milliseconds"
          />

          {/* System Prompt */}
          <TextField
            label="System Prompt"
            multiline
            rows={4}
            value={config.systemPrompt ?? ''}
            onChange={e => updateConfig('systemPrompt', e.target.value)}
            fullWidth
            helperText="Default system prompt for LLM nodes in this workflow"
          />

          {/* Tool Bindings */}
          <Autocomplete
            multiple
            freeSolo
            options={['*', 'kb.search', 'maps.tiles.list', 'agents.invoke']}
            value={(config.toolBindings as string[]) ?? []}
            onChange={(_, newValue) => updateConfig('toolBindings', newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option} label={option} size="small" sx={{ fontFamily: 'monospace' }} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Tool Bindings" helperText='Use "*" for all tools, or enter specific tool slugs' />
            )}
          />
        </>
      )}

      {/* Memory Config */}
      {showMemory && onMemoryChange && (
        <Accordion sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2">Memory Configuration</Typography>
              <Chip
                label={memory.enabled ? 'Enabled' : 'Disabled'}
                size="small"
                color={memory.enabled ? 'success' : 'default'}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(memory.enabled)}
                    onChange={e => updateMemory('enabled', e.target.checked)}
                  />
                }
                label="Enable Long-Term Memory"
              />
              {memory.enabled && (
                <>
                  <TextField
                    type="number"
                    label="Max Memories"
                    value={memory.maxMemories ?? 100}
                    onChange={e => updateMemory('maxMemories', parseInt(e.target.value))}
                    fullWidth
                  />
                  <TextField
                    label="Embedding Model"
                    value={memory.embeddingModel ?? 'text-embedding-3-small'}
                    onChange={e => updateMemory('embeddingModel', e.target.value)}
                    fullWidth
                  />
                </>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

function parseConfig(value: Record<string, unknown> | string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value;
}
