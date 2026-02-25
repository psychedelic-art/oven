'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  ReferenceInput,
  SelectInput,
  ReferenceManyField,
  Datagrid,
  TextField,
  DeleteButton,
} from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';

export default function RoleEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <TextInput source="slug" fullWidth isRequired />
        <TextInput source="description" fullWidth multiline rows={2} />
        <ReferenceInput source="hierarchyNodeId" reference="hierarchy-nodes" label="Hierarchy Node">
          <SelectInput optionText="name" emptyText="None (global)" />
        </ReferenceInput>
        <BooleanInput source="enabled" />

        <Divider sx={{ width: '100%', my: 2 }} />
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Assigned Permissions
        </Typography>

        <ReferenceManyField
          reference="role-permissions"
          target="roleId"
          label={false}
        >
          <Datagrid bulkActionButtons={false}>
            <TextField source="permissionSlug" label="Permission" />
            <TextField source="permissionResource" label="Resource" />
            <TextField source="permissionAction" label="Action" />
            <DeleteButton redirect={false} />
          </Datagrid>
        </ReferenceManyField>
      </SimpleForm>
    </Edit>
  );
}
