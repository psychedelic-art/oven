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
  ReferenceField,
} from 'react-admin';
import { Chip, Button, Box } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  applied: 'success',
  draft: 'warning',
  disabled: 'default',
};

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    choices={[
      { id: 'draft', name: 'Draft' },
      { id: 'applied', name: 'Applied' },
      { id: 'disabled', name: 'Disabled' },
    ]}
  />,
  <TextInput key="targetTable" source="targetTable" label="Target Table" />,
];

export default function RlsPolicyList() {
  const navigate = useNavigate();

  return (
    <List filters={filters} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <TextField source="slug" />
        <TextField source="targetTable" label="Table" />
        <TextField source="command" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={STATUS_COLORS[record?.status] || 'default'}
            />
          )}
        />
        <NumberField source="version" label="v" />
        <ReferenceField source="roleId" reference="roles" label="Role" emptyText="All">
          <TextField source="name" />
        </ReferenceField>
        <DateField source="appliedAt" label="Applied" emptyText="Never" />
        <FunctionField
          label="Actions"
          render={(record: any) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/rls-policies/${record.id}/editor`);
                }}
              >
                Builder
              </Button>
            </Box>
          )}
        />
      </Datagrid>
    </List>
  );
}
