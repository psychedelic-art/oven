'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  TextInput,
  SelectInput,
  NumberInput,
  useRecordContext,
} from 'react-admin';
import { Chip, Button } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useNavigate } from 'react-router-dom';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'published', name: 'Published' },
  { id: 'archived', name: 'Archived' },
];

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="status" source="status" label="Status" choices={statusChoices} />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

function OpenEditorButton() {
  const record = useRecordContext();
  const navigate = useNavigate();
  if (!record) return null;
  return (
    <Button
      startIcon={<EditNoteIcon />}
      size="small"
      variant="outlined"
      sx={{ textTransform: 'none' }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/forms/${record.id}/editor`);
      }}
    >
      Editor
    </Button>
  );
}

export default function FormList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={
                record?.status === 'published'
                  ? 'success'
                  : record?.status === 'archived'
                    ? 'warning'
                    : 'default'
              }
            />
          )}
        />
        <NumberField source="version" label="Version" />
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="updatedAt" label="Updated" showTime />
        <OpenEditorButton />
      </Datagrid>
    </List>
  );
}
