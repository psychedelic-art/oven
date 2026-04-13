'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  ReferenceField,
  NumberInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

const filters = [
  <NumberInput key="formId" source="formId" label="Form ID" />,
];

export default function FormSubmissionList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={filters}
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
