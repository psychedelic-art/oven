'use client';

import {
  List,
  Datagrid,
  TextField,
  DateField,
  FunctionField,
  TextInput,
  NumberInput,
  SelectInput,
  DeleteButton,
  useRefresh,
} from 'react-admin';
import { Chip, Box, Typography, Paper } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FileUploader from './FileUploader';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const filters = [
  <TextInput key="folder" source="folder" label="Folder" alwaysOn />,
  <TextInput key="mimeType" source="mimeType" label="MIME Type" />,
  <SelectInput
    key="sourceModule"
    source="sourceModule"
    label="Source Module"
    choices={[
      { id: 'ai', name: 'AI' },
      { id: 'kb', name: 'Knowledge Base' },
      { id: 'chat', name: 'Chat' },
    ]}
  />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

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
  return (
    <List
      filters={filters}
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
        <DateField source="createdAt" label="Created" showTime />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
