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
  NumberInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

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
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

export default function ConfigList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <FunctionField
          label="Tenant"
          render={(record: any) =>
            record?.tenantId ? (
              <Chip label={`Tenant #${record.tenantId}`} size="small" color="info" variant="outlined" />
            ) : (
              <Chip label="Platform" size="small" color="default" />
            )
          }
        />
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
