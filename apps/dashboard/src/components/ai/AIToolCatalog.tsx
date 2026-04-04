'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface AiTool {
  name: string;
  description: string;
  category: string;
  inputSchema: unknown;
  outputSchema: unknown;
  isSystem: boolean;
  enabled: boolean;
}

const categoryColors: Record<string, 'primary' | 'success' | 'secondary' | 'warning' | 'default'> = {
  language: 'primary',
  embedding: 'success',
  image: 'secondary',
  tool: 'warning',
};

export default function AIToolCatalog() {
  const [tools, setTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch('/api/ai/tools?range=[0,999]');
        if (res.ok) {
          const data = await res.json();
          setTools(Array.isArray(data) ? data : []);
        }
      } catch {
        // API not yet implemented
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        AI Tool Catalog
      </Typography>
      {tools.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No AI tools registered yet.
          </Typography>
        </Paper>
      ) : (
        tools.map((tool) => (
          <Accordion key={tool.name} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {tool.name}
                </Typography>
                <Chip
                  label={tool.category}
                  size="small"
                  color={categoryColors[tool.category] ?? 'default'}
                  variant="outlined"
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: 'auto', mr: 2 }}
                >
                  {tool.description}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Input Schema
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.5,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: 300,
                      m: 0,
                    }}
                  >
                    <code>
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </code>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Output Schema
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.5,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: 300,
                      m: 0,
                    }}
                  >
                    <code>
                      {JSON.stringify(tool.outputSchema, null, 2)}
                    </code>
                  </Box>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}
