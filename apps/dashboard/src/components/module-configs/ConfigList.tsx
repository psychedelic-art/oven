'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  ReferenceField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

const filters = [
  <TextInput key="moduleName" source="moduleName" label="Module" alwaysOn />,
  <SelectInput
    key="scope"
    source="scope"
    label="Scope"
    choices={[
      { id: 'module', name: 'Module Default' },
      { id: 'instance', name: 'Instance Override' },
    ]}
  />,
  <TextInput key="key" source="key" label="Config Key" />,
];

export default function ConfigList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={filters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <FunctionField
          label="Module"
          render={(record: any) => (
            <Chip label={record?.moduleName} size="small" color="primary" variant="outlined" />
          )}
        />
        <FunctionField
          label="Scope"
          render={(record: any) => (
            <Chip
              label={record?.scope}
              size="small"
              color={record?.scope === 'instance' ? 'secondary' : 'default'}
            />
          )}
        />
        <TextField source="scopeId" label="Scope ID" />
        <TextField source="key" label="Key" />
        <FunctionField
          label="Value"
          render={(record: any) => (
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {JSON.stringify(record?.value)}
            </Box>
          )}
        />
        <TextField source="description" label="Description" />
        <DateField source="updatedAt" label="Updated" showTime />
      </Datagrid>
    </List>
  );
}
