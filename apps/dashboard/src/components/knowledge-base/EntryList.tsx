'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  ReferenceField,
  TextInput,
  BooleanInput,
  ReferenceInput,
  AutocompleteInput,
  SelectInput,
  EditButton,
  ShowButton,
} from 'react-admin';
import { Box, Chip } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';
import EmbeddingStatusBadge from './EmbeddingStatusBadge';

const filters = [
  <TextInput key="q" source="q" label="Search question" alwaysOn />,
  <ReferenceInput key="knowledgeBaseId" source="knowledgeBaseId" reference="kb-knowledge-bases" alwaysOn>
    <AutocompleteInput optionText="name" label="Knowledge Base" />
  </ReferenceInput>,
  <ReferenceInput key="categoryId" source="categoryId" reference="kb-categories">
    <AutocompleteInput optionText="name" label="Category" />
  </ReferenceInput>,
  <SelectInput
    key="language"
    source="language"
    label="Language"
    choices={[
      { id: 'es', name: 'Spanish' },
      { id: 'en', name: 'English' },
      { id: 'pt', name: 'Portuguese' },
    ]}
  />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function EntryList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={filters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'priority', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <FunctionField
          label="Question"
          render={(record: Record<string, unknown>) => {
            const q = (record?.question as string) ?? '';
            return q.length > 60 ? q.substring(0, 60) + '...' : q;
          }}
        />
        <ReferenceField source="knowledgeBaseId" reference="kb-knowledge-bases" label="KB" link={false}>
          <TextField source="name" />
        </ReferenceField>
        <ReferenceField source="categoryId" reference="kb-categories" label="Category" link={false}>
          <FunctionField render={(record: Record<string, unknown>) => (
            <Chip label={record?.name as string} size="small" variant="outlined" />
          )} />
        </ReferenceField>
        <FunctionField
          label="Tags"
          render={(record: Record<string, unknown>) => {
            const tags = (record?.tags as string[]) ?? [];
            if (tags.length === 0) return null;
            return (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {tags.slice(0, 3).map((t: string) => (
                  <Chip key={t} label={t} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                ))}
                {tags.length > 3 && <Chip label={`+${tags.length - 3}`} size="small" />}
              </Box>
            );
          }}
        />
        <EmbeddingStatusBadge />
        <NumberField source="priority" label="P" />
        <TextField source="language" label="Lang" />
        <BooleanField source="enabled" label="Active" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <ShowButton />
        <EditButton />
      </Datagrid>
    </List>
  );
}
