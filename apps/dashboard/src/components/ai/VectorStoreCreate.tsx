'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

const adapterChoices = [
  { id: 'pgvector', name: 'pgvector' },
  { id: 'pinecone', name: 'Pinecone' },
];

const distanceMetricChoices = [
  { id: 'cosine', name: 'Cosine' },
  { id: 'euclidean', name: 'Euclidean' },
  { id: 'dotProduct', name: 'Dot Product' },
];

export default function VectorStoreCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <SelectInput
          source="adapter"
          label="Adapter"
          choices={adapterChoices}
          isRequired
          fullWidth
          helperText="pgvector for PostgreSQL-based stores, Pinecone for managed cloud."
        />
        <TextInput source="embeddingModel" label="Embedding Model" fullWidth />
        <NumberInput
          source="dimensions"
          label="Dimensions"
          defaultValue={1536}
          helperText="Must match the embedding model's output dimensions (e.g., 1536 for text-embedding-3-small)."
        />
        <SelectInput
          source="distanceMetric"
          label="Distance Metric"
          choices={distanceMetricChoices}
          defaultValue="cosine"
          fullWidth
          helperText="Cosine is recommended for most use cases."
        />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
