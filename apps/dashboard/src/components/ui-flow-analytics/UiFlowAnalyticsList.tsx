'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
  SelectInput,
  NumberInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const eventColors: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  page_view: 'info',
  form_submit: 'success',
  chat_start: 'warning',
  cta_click: 'default',
};

const analyticsFilters = [
  <SelectInput
    key="eventType"
    source="eventType"
    label="Event Type"
    choices={[
      { id: 'page_view', name: 'Page View' },
      { id: 'form_submit', name: 'Form Submit' },
      { id: 'chat_start', name: 'Chat Start' },
      { id: 'cta_click', name: 'CTA Click' },
    ]}
    alwaysOn
  />,
  <TextInput key="pageSlug" source="pageSlug" label="Page Slug" />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
  <NumberInput key="uiFlowId" source="uiFlowId" label="UI Flow ID" />,
];

export default function UiFlowAnalyticsList() {
  return (
    <List filters={analyticsFilters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid bulkActionButtons={false}>
        <NumberField source="id" />
        <FunctionField
          source="eventType"
          label="Event"
          render={(record: { eventType: string }) => (
            <Chip
              label={record.eventType}
              color={eventColors[record.eventType] || 'default'}
              size="small"
            />
          )}
        />
        <TextField source="pageSlug" label="Page" />
        <TextField source="visitorId" label="Visitor" />
        <NumberField source="uiFlowId" label="Flow ID" />
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="createdAt" label="Date" showTime />
      </Datagrid>
    </List>
  );
}
