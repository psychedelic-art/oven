'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceManyField,
  Datagrid,
  DeleteButton,
  TopToolbar,
  EditButton,
  Button,
  useRecordContext,
} from 'react-admin';
import { Chip, Typography, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { Link } from 'react-router-dom';
import UsageMeter from '@oven/module-subscriptions/components/UsageMeter';

function TenantShowActions() {
  return (
    <TopToolbar>
      <EditButton />
      <Button
        label="View Config"
        component={Link}
        to={(record: any) => `/module-configs?filter=${JSON.stringify({ tenantId: record?.id })}`}
        startIcon={<SettingsIcon />}
      />
    </TopToolbar>
  );
}

function TenantUsageSection() {
  const record = useRecordContext();
  if (!record?.id) return null;
  return <UsageMeter tenantId={record.id} />;
}

export default function TenantShow() {
  return (
    <Show actions={<TenantShowActions />}>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.enabled ? 'Enabled' : 'Disabled'}
              size="small"
              color={record?.enabled ? 'success' : 'default'}
            />
          )}
        />
        <FunctionField
          label="Metadata"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {record?.metadata ? JSON.stringify(record.metadata, null, 2) : '—'}
            </Box>
          )}
        />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />

        <Box sx={{ mt: 3, mb: 1 }}>
          <Typography variant="h6">Usage Limits</Typography>
        </Box>
        <TenantUsageSection />

        <Box sx={{ mt: 3, mb: 1 }}>
          <Typography variant="h6">Members</Typography>
        </Box>
        <ReferenceManyField
          label=""
          reference="tenant-members"
          target="tenantId"
        >
          <Datagrid bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
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
            <DeleteButton redirect={false} />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
