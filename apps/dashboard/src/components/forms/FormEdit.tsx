'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  TopToolbar,
  useRecordContext,
} from 'react-admin';
import { Button } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { Link } from 'react-router-dom';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'published', name: 'Published' },
  { id: 'archived', name: 'Archived' },
];

function FormEditActions() {
  const record = useRecordContext();
  return (
    <TopToolbar>
      <Button
        component={Link}
        to={`/forms/${record?.id}/editor`}
        startIcon={<EditNoteIcon />}
        size="small"
        variant="contained"
        sx={{ textTransform: 'none' }}
      >
        Open Editor
      </Button>
    </TopToolbar>
  );
}

export default function FormEdit() {
  return (
    <Edit actions={<FormEditActions />}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" fullWidth multiline rows={3} />
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
        <SelectInput
          source="status"
          label="Status"
          choices={statusChoices}
          defaultValue="draft"
        />
      </SimpleForm>
    </Edit>
  );
}
