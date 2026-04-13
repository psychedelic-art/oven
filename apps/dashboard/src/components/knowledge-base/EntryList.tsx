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
  ReferenceInput,
  AutocompleteInput,
  EditButton,
  ShowButton,
  useListContext,
} from 'react-admin';
import { Box, Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';
import EmbeddingStatusBadge from './EmbeddingStatusBadge';

const languageChoices = [
  { id: 'es', name: 'Spanish' },
  { id: 'en', name: 'English' },
  { id: 'pt', name: 'Portuguese' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search question', kind: 'quick-search', alwaysOn: true },
  { source: 'language', label: 'Language', kind: 'combo', choices: languageChoices },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

/**
 * Reference-backed filters (knowledgeBaseId, categoryId) cannot be expressed
 * as FilterDefinition choices because they need live data from the API.
 * We render them as always-on React Admin ReferenceInput fields alongside
 * the FilterToolbar until sprint-06 adds reference-backed ComboBoxFilter
 * support.
 */
const referenceFilters = [
  <ReferenceInput key="knowledgeBaseId" source="knowledgeBaseId" reference="kb-knowledge-bases" alwaysOn>
    <AutocompleteInput optionText="name" label="Knowledge Base" />
  </ReferenceInput>,
  <ReferenceInput key="categoryId" source="categoryId" reference="kb-categories">
    <AutocompleteInput optionText="name" label="Category" />
  </ReferenceInput>,
];

function EntryListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FilterToolbar
        filters={filterDefinitions}
        filterValues={filterValues}
        setFilters={(f) => setFilters(f, undefined, false)}
      />
    </Box>
  );
}

export default function EntryList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<EntryListToolbar />}
      filters={referenceFilters}
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
