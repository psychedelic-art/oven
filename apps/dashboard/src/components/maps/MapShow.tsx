'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TopToolbar,
  EditButton,
  useRecordContext,
} from 'react-admin';
import { Chip, Box, Typography, Button } from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  generating: 'warning',
  ready: 'success',
  archived: 'error',
};

function MapShowActions() {
  const record = useRecordContext();
  const navigate = useNavigate();
  return (
    <TopToolbar>
      <Button
        size="small"
        startIcon={<BrushIcon />}
        onClick={() => navigate(`/maps/${record?.id}/editor`)}
        disabled={!record}
      >
        Open Editor
      </Button>
      <EditButton />
    </TopToolbar>
  );
}

export default function MapShow() {
  return (
    <Show actions={<MapShowActions />}>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={STATUS_COLORS[record?.status] || 'default'}
            />
          )}
        />
        <TextField source="mode" />
        <NumberField source="worldConfigId" label="World Config ID" emptyText="None" />
        <NumberField source="seed" emptyText="Random" />
        <NumberField source="totalChunks" label="Total Chunks" />
        <FunctionField
          label="Bounds"
          render={(record: any) => {
            if (record?.boundsMinX != null) {
              return (
                <Box>
                  <Typography variant="body2">
                    ({record.boundsMinX}, {record.boundsMinY}) to ({record.boundsMaxX}, {record.boundsMaxY})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(record.boundsMaxX - record.boundsMinX)} x {(record.boundsMaxY - record.boundsMinY)} tiles
                  </Typography>
                </Box>
              );
            }
            return <Typography variant="body2" color="text.secondary">Infinite / Unbounded</Typography>;
          }}
        />
        <DateField source="createdAt" showTime label="Created" />
        <DateField source="updatedAt" showTime label="Updated" />
      </SimpleShowLayout>
    </Show>
  );
}
