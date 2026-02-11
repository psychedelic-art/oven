'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  TextInput,
  BooleanInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
  <TextInput key="triggerEvent" source="triggerEvent" label="Trigger Event" />,
];

export default function WorkflowList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Trigger"
          render={(record: any) =>
            record?.triggerEvent ? (
              <Chip
                label={record.triggerEvent}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            ) : (
              <Chip label="Manual" size="small" variant="outlined" />
            )
          }
        />
        <FunctionField
          label="States"
          render={(record: any) => {
            const def = record?.definition;
            if (!def?.states) return '-';
            const count = Object.keys(def.states).length;
            return (
              <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                {count} state{count !== 1 ? 's' : ''}
              </Box>
            );
          }}
        />
        <BooleanField source="enabled" label="Active" />
        <NumberField source="version" label="v" />
        <DateField source="updatedAt" label="Updated" showTime />
      </Datagrid>
    </List>
  );
}
