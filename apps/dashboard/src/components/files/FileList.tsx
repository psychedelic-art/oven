'use client';

import {
  List,
  Datagrid,
  TextField,
  DateField,
  FunctionField,
  ReferenceField,
  DeleteButton,
  useRefresh,
  useListContext,
} from 'react-admin';
import { Chip, Box, Typography, Paper } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FileUploader from './FileUploader';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const sourceModuleChoices = [
  { id: 'ai', name: 'AI' },
  { id: 'kb', name: 'Knowledge Base' },
  { id: 'chat', name: 'Chat' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'folder', label: 'Folder', kind: 'quick-search', alwaysOn: true },
  { source: 'mimeType', label: 'MIME Type', kind: 'combo', choices: [] },
  { source: 'sourceModule', label: 'Source Module', kind: 'combo', choices: sourceModuleChoices },
];

function FileListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

function EmptyFileList() {
  const refresh = useRefresh();
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <CloudUploadIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No files yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload your first file by dragging it here or using the AI Playground.
      </Typography>
      <Box sx={{ maxWidth: 500, mx: 'auto' }}>
        <FileUploader folder="uploads" onUploadComplete={() => refresh()} />
      </Box>
    </Paper>
  );
}

export default function FileList() {
  const refresh = useRefresh();
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<FileListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'createdAt', order: 'DESC' }}
      hasCreate={false}
      empty={<EmptyFileList />}
    >
      <Box sx={{ mb: 2 }}>
        <FileUploader compact folder="uploads" onUploadComplete={() => refresh()} />
      </Box>
      <Datagrid bulkActionButtons={false} rowClick="show">
        <TextField source="id" label="ID" />
        <TextField source="filename" label="Filename" />
        <TextField source="mimeType" label="MIME Type" />
        <FunctionField
          label="Size"
          render={(record: any) => formatBytes(record?.sizeBytes)}
        />
        <FunctionField
          label="Folder"
          render={(record: any) =>
            record?.folder ? (
              <Chip label={record.folder} size="small" variant="outlined" />
            ) : (
              '-'
            )
          }
        />
        <FunctionField
          label="Source"
          render={(record: any) =>
            record?.sourceModule ? (
              <Chip label={record.sourceModule} size="small" color="primary" variant="outlined" />
            ) : (
              '-'
            )
          }
        />
        <FunctionField
          label="Preview"
          render={(record: any) => {
            if (!record?.publicUrl) return '-';
            if (record.mimeType?.startsWith('image/')) {
              return (
                <Box
                  component="img"
                  src={record.publicUrl}
                  alt={record.filename}
                  sx={{
                    width: 40,
                    height: 40,
                    objectFit: 'cover',
                    borderRadius: 0.5,
                  }}
                />
              );
            }
            return <InsertDriveFileIcon fontSize="small" color="action" />;
          }}
        />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <DateField source="createdAt" label="Created" showTime />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
