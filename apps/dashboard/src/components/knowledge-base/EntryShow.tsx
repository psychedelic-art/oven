'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  ReferenceField,
  useRecordContext,
} from 'react-admin';
import { Box, Typography, Chip, Divider } from '@mui/material';
import EmbeddingStatusBadge from './EmbeddingStatusBadge';

function EntryHeader() {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
      <Chip label={`v${record.version}`} size="small" color="primary" />
      <Chip label={record.language as string} size="small" variant="outlined" />
      <EmbeddingStatusBadge />
      {record.enabled ? (
        <Chip label="Active" size="small" color="success" variant="outlined" />
      ) : (
        <Chip label="Disabled" size="small" color="default" variant="outlined" />
      )}
      <Chip label={`Priority: ${record.priority}`} size="small" variant="outlined" />
    </Box>
  );
}

function KeywordsField() {
  const record = useRecordContext();
  if (!record) return null;
  const keywords = (record.keywords as string[]) ?? [];
  if (keywords.length === 0) {
    return <Typography variant="body2" color="text.secondary">No keywords</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {keywords.map((kw: string) => (
        <Chip key={kw} label={kw} size="small" variant="outlined" />
      ))}
    </Box>
  );
}

export default function EntryShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <EntryHeader />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Category
        </Typography>
        <ReferenceField source="categoryId" reference="kb-categories" link="edit">
          <TextField source="name" />
        </ReferenceField>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Question
        </Typography>
        <TextField source="question" sx={{ fontSize: '1.1rem', fontWeight: 500 }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
          Answer
        </Typography>
        <TextField source="answer" />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Keywords
        </Typography>
        <KeywordsField />

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Created</Typography>
            <DateField source="createdAt" showTime />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Updated</Typography>
            <DateField source="updatedAt" showTime />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Version</Typography>
            <NumberField source="version" />
          </Box>
        </Box>
      </SimpleShowLayout>
    </Show>
  );
}
