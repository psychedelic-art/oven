'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  NumberInput,
} from 'react-admin';

const filters = [
  <NumberInput key="formId" source="formId" label="Form ID" />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

export default function FormSubmissionList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="formId" label="Form ID" />
        <NumberField source="formVersion" label="Form Version" />
        <NumberField source="submittedBy" label="Submitted By" />
        <DateField source="submittedAt" label="Submitted At" showTime />
        <NumberField source="tenantId" label="Tenant ID" />
      </Datagrid>
    </List>
  );
}
