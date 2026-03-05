'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  NumberInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" alwaysOn />,
  <SelectInput
    key="role"
    source="role"
    label="Role"
    choices={[
      { id: 'owner', name: 'Owner' },
      { id: 'admin', name: 'Admin' },
      { id: 'member', name: 'Member' },
    ]}
  />,
];

export default function TenantMemberList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="tenantId" label="Tenant ID" />
        <NumberField source="userId" label="User ID" />
        <FunctionField
          label="Role"
          render={(record: any) => (
            <Chip
              label={record?.role}
              size="small"
              color={record?.role === 'owner' ? 'primary' : record?.role === 'admin' ? 'secondary' : 'default'}
            />
          )}
        />
        <DateField source="joinedAt" label="Joined" showTime />
      </Datagrid>
    </List>
  );
}
