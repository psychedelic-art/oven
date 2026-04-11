import React from 'react';
import { Box, Typography, TextField, MenuItem, Slider, FormControlLabel, Switch, Chip } from '@mui/material';

interface AgentConfigPanelProps {
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    maxSteps: number;
    toolBindings: string[];
  };
  memoryConfig: {
    enabled: boolean;
    maxMemories: number;
    embeddingModel: string;
  };
  onConfigChange: (config: Partial<AgentConfigPanelProps['config']>) => void;
  onMemoryChange: (config: Partial<AgentConfigPanelProps['memoryConfig']>) => void;
}

export function AgentConfigPanel({ config, memoryConfig, onConfigChange, onMemoryChange }: AgentConfigPanelProps) {
  return (
    <Box sx={{ width: 320, borderLeft: 1, borderColor: 'divider', bgcolor: 'white', overflow: 'auto', height: '100%' }}>
      {/* Agent Configuration */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Agent Configuration</Typography>

        <TextField
          label="Default Model"
          select
          value={config.model}
          onChange={e => onConfigChange({ model: e.target.value })}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="fast">Fast (GPT-4o-mini)</MenuItem>
          <MenuItem value="smart">Smart (GPT-4o)</MenuItem>
          <MenuItem value="claude">Claude (Sonnet)</MenuItem>
        </TextField>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Temperature: {config.temperature}
        </Typography>
        <Slider
          value={config.temperature}
          onChange={(_, v) => onConfigChange({ temperature: v as number })}
          min={0}
          max={2}
          step={0.1}
          valueLabelDisplay="auto"
          sx={{ mb: 2 }}
        />

        <TextField
          label="Max Tokens"
          type="number"
          value={config.maxTokens}
          onChange={e => onConfigChange({ maxTokens: parseInt(e.target.value) })}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="Max Steps (Safety Limit)"
          type="number"
          value={config.maxSteps}
          onChange={e => onConfigChange({ maxSteps: parseInt(e.target.value) })}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="System Prompt"
          value={config.systemPrompt}
          onChange={e => onConfigChange({ systemPrompt: e.target.value })}
          size="small"
          fullWidth
          multiline
          rows={4}
          sx={{ mb: 2 }}
        />

        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Tool Bindings
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {config.toolBindings.length === 0 && (
            <Chip label="All tools (*)" size="small" variant="outlined" />
          )}
          {config.toolBindings.map(t => (
            <Chip key={t} label={t} size="small" onDelete={() => onConfigChange({ toolBindings: config.toolBindings.filter(b => b !== t) })} />
          ))}
        </Box>
      </Box>

      {/* Memory Configuration */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Memory Configuration</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={memoryConfig.enabled}
              onChange={e => onMemoryChange({ enabled: e.target.checked })}
              size="small"
            />
          }
          label="Enable Long-Term Memory"
          sx={{ mb: 2 }}
        />

        {memoryConfig.enabled && (
          <>
            <TextField
              label="Max Memories"
              type="number"
              value={memoryConfig.maxMemories}
              onChange={e => onMemoryChange({ maxMemories: parseInt(e.target.value) })}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            />

            <TextField
              label="Embedding Model"
              value={memoryConfig.embeddingModel}
              onChange={e => onMemoryChange({ embeddingModel: e.target.value })}
              size="small"
              fullWidth
            />
          </>
        )}
      </Box>
    </Box>
  );
}
