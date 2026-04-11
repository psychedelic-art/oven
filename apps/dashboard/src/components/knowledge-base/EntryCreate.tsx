'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
} from 'react-admin';
import { Box } from '@mui/material';

export default function EntryCreate() {
  return (
    <Create>
      <SimpleForm>
        <Box sx={{ display: 'flex', gap: 3, width: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left Column — Content */}
          <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ReferenceInput source="tenantId" reference="tenants">
              <AutocompleteInput optionText="name" label="Tenant" isRequired fullWidth />
            </ReferenceInput>
            <ReferenceInput source="knowledgeBaseId" reference="kb-knowledge-bases">
              <AutocompleteInput optionText="name" label="Knowledge Base" isRequired fullWidth />
            </ReferenceInput>
            <ReferenceInput source="categoryId" reference="kb-categories">
              <AutocompleteInput optionText="name" label="Category" isRequired fullWidth />
            </ReferenceInput>
            <TextInput
              source="question"
              label="Question"
              isRequired
              fullWidth
              multiline
              rows={3}
              helperText="The FAQ question that users might ask (max 2000 chars)"
            />
            <TextInput
              source="answer"
              label="Answer"
              isRequired
              fullWidth
              multiline
              rows={6}
              helperText="The approved answer to display (max 10000 chars)"
            />
          </Box>

          {/* Right Column — Metadata */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextInput
              source="tags"
              label="Tags"
              fullWidth
              helperText='Comma-separated tags (e.g., "urgente, nuevo-paciente, seguro")'
              parse={(value: string) => value ? value.split(',').map((t: string) => t.trim()).filter(Boolean) : []}
              format={(value: unknown) => Array.isArray(value) ? value.join(', ') : ''}
            />
            <TextInput
              source="keywords"
              label="Keywords"
              fullWidth
              helperText='Search fallback keywords (e.g., "agendar, cita, reservar")'
              parse={(value: string) => value ? value.split(',').map((k: string) => k.trim()).filter(Boolean) : []}
              format={(value: unknown) => Array.isArray(value) ? value.join(', ') : ''}
            />
            <NumberInput source="priority" label="Priority" defaultValue={0} min={0} max={10} step={1} fullWidth />
            <SelectInput
              source="language"
              label="Language"
              defaultValue="es"
              choices={[
                { id: 'es', name: 'Spanish (es)' },
                { id: 'en', name: 'English (en)' },
                { id: 'pt', name: 'Portuguese (pt)' },
              ]}
              fullWidth
            />
            <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
          </Box>
        </Box>
      </SimpleForm>
    </Create>
  );
}
