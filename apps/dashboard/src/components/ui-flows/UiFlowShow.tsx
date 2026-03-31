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
  TopToolbar,
  EditButton,
  useRecordContext,
} from 'react-admin';
import { Alert, Box, Button, Chip, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Link } from 'react-router-dom';

const statusColors: Record<string, 'info' | 'success' | 'default'> = {
  draft: 'info',
  published: 'success',
  archived: 'default',
};

function UiFlowShowActions() {
  const record = useRecordContext();
  return (
    <TopToolbar>
      <Button
        component={Link}
        to={`/ui-flows/${record?.id}/editor`}
        startIcon={<EditNoteIcon />}
        size="small"
        variant="contained"
        sx={{ textTransform: 'none' }}
      >
        Open Editor
      </Button>
      <EditButton />
    </TopToolbar>
  );
}

export default function UiFlowShow() {
  return (
    <Show actions={<UiFlowShowActions />}>
      <SimpleShowLayout>
        <NumberField source="id" />
        <TextField source="name" />
        <TextField source="slug" />
        <FunctionField
          source="status"
          label="Status"
          render={(record: { status: string }) => (
            <Chip
              label={record.status}
              color={statusColors[record.status] || 'default'}
              size="small"
            />
          )}
        />
        <NumberField source="version" />
        <FunctionField
          source="enabled"
          label="Enabled"
          render={(record: { enabled: boolean }) =>
            record.enabled ? (
              <Chip label="Active" color="success" size="small" />
            ) : (
              <Chip label="Disabled" size="small" />
            )
          }
        />
        <TextField source="description" />
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="createdAt" label="Created At" showTime />
        <DateField source="updatedAt" label="Updated At" showTime />

        <Alert
          severity="info"
          icon={<InfoOutlinedIcon fontSize="small" />}
          sx={{ mt: 2, mb: 1 }}
        >
          <Typography variant="body2">
            Pages with an <strong>empty slug</strong> are the portal home page.
            Other pages are accessible at{' '}
            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              tenant.domain.com/&#123;page-slug&#125;
            </Box>.
          </Typography>
        </Alert>

        <ReferenceManyField
          label="Pages"
          reference="ui-flow-pages"
          target="uiFlowId"
        >
          <Datagrid>
            <FunctionField
              source="slug"
              label="Slug"
              render={(record: { slug: string }) => (
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                >
                  {record.slug || '/ (home)'}
                </Typography>
              )}
            />
            <TextField source="title" />
            <FunctionField
              source="pageType"
              label="Type"
              render={(record: { pageType: string }) => (
                <Chip label={record.pageType} size="small" variant="outlined" />
              )}
            />
            <NumberField source="position" />
            <FunctionField
              source="enabled"
              label="Enabled"
              render={(record: { enabled: boolean }) =>
                record.enabled ? (
                  <Chip label="Yes" color="success" size="small" />
                ) : (
                  <Chip label="No" size="small" />
                )
              }
            />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
