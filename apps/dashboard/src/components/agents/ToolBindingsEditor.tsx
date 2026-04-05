'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Checkbox, FormControlLabel, FormGroup, Chip, Button,
  Accordion, AccordionSummary, AccordionDetails, LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ToolSpec {
  name: string;
  description: string;
  moduleSlug: string;
  method: string;
  route: string;
}

interface ToolBindingsEditorProps {
  value: string[];
  onChange: (bindings: string[]) => void;
}

export default function ToolBindingsEditor({ value, onChange }: ToolBindingsEditorProps) {
  const [tools, setTools] = useState<ToolSpec[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents/tools');
      const data = await res.json();
      // Deduplicate by tool name (actionSchemas + apiHandlers can overlap)
      const seen = new Set<string>();
      const unique = (Array.isArray(data) ? data : []).filter((t: ToolSpec) => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
      });
      setTools(unique);
    } catch { setTools([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const isAllSelected = value.includes('*');
  const selectedSet = new Set(value);

  // Group tools by module
  const grouped = tools.reduce<Record<string, ToolSpec[]>>((acc, tool) => {
    const mod = tool.moduleSlug || 'other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(tool);
    return acc;
  }, {});

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(['*']);
    }
  };

  const handleToggleTool = (toolName: string) => {
    if (isAllSelected) return; // can't deselect individual when all selected
    const newSet = new Set(selectedSet);
    if (newSet.has(toolName)) {
      newSet.delete(toolName);
    } else {
      newSet.add(toolName);
    }
    onChange(Array.from(newSet));
  };

  const handleToggleModule = (moduleName: string) => {
    if (isAllSelected) return;
    const moduleTools = grouped[moduleName]?.map((t) => t.name) ?? [];
    const allModuleSelected = moduleTools.every((t) => selectedSet.has(t));
    const newSet = new Set(selectedSet);
    if (allModuleSelected) {
      moduleTools.forEach((t) => newSet.delete(t));
    } else {
      moduleTools.forEach((t) => newSet.add(t));
    }
    onChange(Array.from(newSet));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">Tool Bindings</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip label={`${isAllSelected ? tools.length : value.length} selected`} size="small" color="primary" variant="outlined" />
          <Tooltip title="Refresh tool list">
            <IconButton size="small" onClick={fetchTools}><RefreshIcon sx={{ fontSize: 18 }} /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <FormControlLabel
        control={<Checkbox checked={isAllSelected} onChange={handleToggleAll} />}
        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Select All Tools</Typography>}
        sx={{ mb: 1 }}
      />

      {!isAllSelected && Object.entries(grouped).map(([moduleName, moduleTools]) => {
        const allSelected = moduleTools.every((t) => selectedSet.has(t.name));
        const someSelected = moduleTools.some((t) => selectedSet.has(t.name));
        return (
          <Accordion key={moduleName} variant="outlined" sx={{ '&:before': { display: 'none' } }} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={() => handleToggleModule(moduleName)}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{moduleName}</Typography>
                    <Chip label={moduleTools.length} size="small" sx={{ height: 18, fontSize: 10 }} />
                  </Box>
                }
                onClick={(e) => e.stopPropagation()}
              />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <FormGroup>
                {moduleTools.map((tool, idx) => (
                  <FormControlLabel
                    key={`${tool.name}-${tool.method}-${idx}`}
                    control={<Checkbox checked={selectedSet.has(tool.name)} onChange={() => handleToggleTool(tool.name)} size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>{tool.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{tool.description}</Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', ml: 1 }}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
