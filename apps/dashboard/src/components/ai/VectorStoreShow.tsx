'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  BooleanField,
  DateField,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import {
  resolveAdapterColor,
  type VectorStoreRecord,
} from '@oven/module-ai/view/vector-store-record';
import { TypedFunctionField } from './_fields/TypedFunctionField';

export default function VectorStoreShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="name" />
        <TextField source="slug" />
        <NumberField source="tenantId" label="Tenant ID" />
        <TypedFunctionField<VectorStoreRecord>
          label="Adapter"
          render={(record) => (
            <Chip
              label={record?.adapter}
              size="small"
              color={resolveAdapterColor(record?.adapter)}
              variant="outlined"
            />
          )}
        />
        <TextField source="embeddingModel" label="Embedding Model" />
        <NumberField source="dimensions" label="Dimensions" />
        <TextField source="distanceMetric" label="Distance Metric" />
        <NumberField source="documentCount" label="Document Count" />
        <BooleanField source="enabled" />
        <TypedFunctionField<VectorStoreRecord>
          label="Connection Config"
          render={(record) => {
            const config = record?.connectionConfig;
            if (!config) return 'None';
            return (
              <Box
                component="pre"
                sx={{
                  p: 1.5,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: 200,
                  m: 0,
                }}
              >
                {JSON.stringify(config, null, 2)}
              </Box>
            );
          }}
        />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />
      </SimpleShowLayout>
    </Show>
  );
}
