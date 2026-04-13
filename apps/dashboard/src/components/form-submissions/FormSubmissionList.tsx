'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  ReferenceField,
  useListContext,
} from 'react-admin';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'formId', label: 'Form ID', kind: 'combo', choices: [] },
];

function FormSubmissionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function FormSubmissionList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<FormSubmissionListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="formId" label="Form ID" />
        <NumberField source="formVersion" label="Form Version" />
        <NumberField source="submittedBy" label="Submitted By" />
        <DateField source="submittedAt" label="Submitted At" showTime />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
      </Datagrid>
    </List>
  );
}
