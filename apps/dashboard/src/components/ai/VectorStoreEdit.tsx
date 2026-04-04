'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';

const adapterChoices = [
  { id: 'pgvector', name: 'pgvector' },
  { id: 'pinecone', name: 'Pinecone' },
];

const distanceMetricChoices = [
  { id: 'cosine', name: 'Cosine' },
  { id: 'euclidean', name: 'Euclidean' },
  { id: 'dotProduct', name: 'Dot Product' },
];

export default function VectorStoreEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <NumberInput source="tenantId" label="Tenant ID" fullWidth />
        <SelectInput
          source="adapter"
          label="Adapter"
          choices={adapterChoices}
          isRequired
          fullWidth
        />
        <TextInput source="embeddingModel" label="Embedding Model" fullWidth />
        <NumberInput
          source="dimensions"
          label="Dimensions"
          helperText="Must match the embedding model's output dimensions."
        />
        <SelectInput
          source="distanceMetric"
          label="Distance Metric"
          choices={distanceMetricChoices}
          fullWidth
        />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
