'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  ReferenceField,
  SelectInput,
  NumberInput,
} from 'react-admin';
import { Chip, Typography } from '@mui/material';

const reasonColors: Record<string, 'warning' | 'error' | 'info' | 'default'> = {
  'out-of-scope': 'warning',
  clinical: 'error',
  'user-requested': 'info',
  'limit-exceeded': 'default',
};

const statusColors: Record<string, 'warning' | 'success' | 'default'> = {
  pending: 'warning',
  resolved: 'success',
};

const filters = [
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'pending', name: 'Pending' },
      { id: 'resolved', name: 'Resolved' },
    ]}
  />,
  <SelectInput
    key="reason"
    source="reason"
    label="Reason"
    choices={[
      { id: 'out-of-scope', name: 'Out of Scope' },
      { id: 'clinical', name: 'Clinical' },
      { id: 'user-requested', name: 'User Requested' },
      { id: 'limit-exceeded', name: 'Limit Exceeded' },
    ]}
  />,
];

export default function EscalationList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <ReferenceField source="tenantId" reference="tenants" label="Tenant">
          <TextField source="name" />
        </ReferenceField>
        <TextField source="channelType" label="Channel" />
        <FunctionField
          label="Reason"
          render={(record: { reason?: string }) => (
            <Chip
              label={record.reason}
              size="small"
              color={reasonColors[record.reason ?? ''] ?? 'default'}
            />
          )}
        />
        <FunctionField
          label="User Message"
          render={(record: { userMessage?: string }) => (
            <Typography
              variant="body2"
              sx={{
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {record.userMessage ?? '—'}
            </Typography>
          )}
        />
        <FunctionField
          label="Status"
          render={(record: { status?: string }) => (
            <Chip
              label={record.status}
              size="small"
              color={statusColors[record.status ?? ''] ?? 'default'}
            />
          )}
        />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
