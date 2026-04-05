'use client';

import { Box, Typography, Chip, Tooltip } from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import NumbersIcon from '@mui/icons-material/Numbers';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ListIcon from '@mui/icons-material/List';
import type { VariableData } from '../types';

interface VariablePaletteProps {
  variables: VariableData[];
  onInsert: (variable: VariableData) => void;
}

const typeIcons: Record<string, React.ReactElement> = {
  string: <DataObjectIcon sx={{ fontSize: 14 }} />,
  number: <NumbersIcon sx={{ fontSize: 14 }} />,
  boolean: <ToggleOnIcon sx={{ fontSize: 14 }} />,
  select: <ListIcon sx={{ fontSize: 14 }} />,
};

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  string: 'primary',
  number: 'secondary',
  boolean: 'success',
  select: 'warning',
};

export default function VariablePalette({ variables, onInsert }: VariablePaletteProps) {
  if (variables.length === 0) {
    return (
      <Box className="variable-palette">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Variables
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', display: 'block', py: 2 }}>
          Add variables in the Input Schema section above to insert them here
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="variable-palette">
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
        Click to insert variable
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {variables.filter((v) => v.name).map((variable) => (
          <Tooltip key={variable.name} title={variable.description || `Type: ${variable.type}`} placement="left">
            <Chip
              className="variable-palette-chip"
              icon={typeIcons[variable.type] ?? typeIcons.string}
              label={`{{${variable.name}}}`}
              size="small"
              color={typeColors[variable.type] ?? 'primary'}
              variant="outlined"
              onClick={() => onInsert(variable)}
              sx={{
                justifyContent: 'flex-start',
                fontFamily: 'monospace',
                fontSize: 12,
                height: 28,
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
