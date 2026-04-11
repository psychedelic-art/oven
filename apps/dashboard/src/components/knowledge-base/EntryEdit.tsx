'use client';

import { useState, useEffect } from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
  useRecordContext,
} from 'react-admin';
import { Box, Typography, Divider, Paper, Chip } from '@mui/material';
import EmbeddingStatusBadge from './EmbeddingStatusBadge';

function VersionHistory() {
  const record = useRecordContext();
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!record?.id) return;
    fetch(`/api/kb-entries/${record.id}/versions`)
      .then((res) => res.json())
      .then((data) => setVersions(Array.isArray(data) ? data : []))
      .catch(() => setVersions([]));
  }, [record?.id]);

  if (!record) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Version History</Typography>
        <Chip label={`v${record.version}`} size="small" color="primary" />
        <EmbeddingStatusBadge />
      </Box>
      {versions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No previous versions</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {versions.map((v) => (
            <Paper key={v.id as number} variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Version {v.version as number}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(v.createdAt as string).toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {(v.question as string).substring(0, 80)}...
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function EntryEdit() {
  return (
    <Edit>
      <SimpleForm>
        <Box sx={{ display: 'flex', gap: 3, width: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ReferenceInput source="categoryId" reference="kb-categories">
              <AutocompleteInput optionText="name" label="Category" isRequired fullWidth />
            </ReferenceInput>
            <TextInput source="question" label="Question" isRequired fullWidth multiline rows={3} />
            <TextInput source="answer" label="Answer" isRequired fullWidth multiline rows={6} />
            <TextInput source="versionDescription" label="Change Note" fullWidth helperText="Optional note describing what changed" />
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextInput
              source="tags"
              label="Tags"
              fullWidth
              helperText="Comma-separated"
              parse={(value: string) => value ? value.split(',').map((t: string) => t.trim()).filter(Boolean) : []}
              format={(value: unknown) => Array.isArray(value) ? value.join(', ') : ''}
            />
            <TextInput
              source="keywords"
              label="Keywords"
              fullWidth
              helperText="Comma-separated"
              parse={(value: string) => value ? value.split(',').map((k: string) => k.trim()).filter(Boolean) : []}
              format={(value: unknown) => Array.isArray(value) ? value.join(', ') : ''}
            />
            <NumberInput source="priority" label="Priority" min={0} max={10} step={1} fullWidth />
            <SelectInput
              source="language"
              label="Language"
              choices={[
                { id: 'es', name: 'Spanish (es)' },
                { id: 'en', name: 'English (en)' },
                { id: 'pt', name: 'Portuguese (pt)' },
              ]}
              fullWidth
            />
            <BooleanInput source="enabled" label="Enabled" />
          </Box>
        </Box>
        <VersionHistory />
      </SimpleForm>
    </Edit>
  );
}
