'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  BooleanField,
  NumberField,
  ReferenceManyField,
  Datagrid,
  ReferenceField,
} from 'react-admin';
import { Typography, Divider, Box, Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

export default function RoleShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" />
        <TextField source="name" />
        <TextField source="slug" />
        <TextField source="description" />
        <BooleanField source="isSystem" label="System Role" />
        <BooleanField source="enabled" />
        <ReferenceField source="hierarchyNodeId" reference="hierarchy-nodes" label="Hierarchy Node" emptyText="Global">
          <TextField source="name" />
        </ReferenceField>
        <DateField source="createdAt" label="Created" />
        <DateField source="updatedAt" label="Updated" />

        <Divider sx={{ width: '100%', my: 2 }} />
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Permissions
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
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
