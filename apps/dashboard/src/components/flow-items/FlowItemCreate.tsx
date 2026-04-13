'use client';

import {
  Create,
  SimpleForm,
  NumberInput,
  SelectInput,
  TextInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

export default function FlowItemCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <NumberInput source="flowId" label="Flow ID" isRequired />
        <SelectInput
          source="contentType"
          label="Content Type"
          isRequired
          choices={[
            { id: 'form', name: 'Form' },
            { id: 'exam', name: 'Exam' },
            { id: 'dashboard', name: 'Dashboard' },
            { id: 'document', name: 'Document' },
            { id: 'custom', name: 'Custom' },
          ]}
        />
        <NumberInput source="contentId" label="Content ID" />
        <NumberInput source="assignedTo" label="Assigned To" />
        <TextInput
          source="metadata"
          label="Metadata (JSON)"
          fullWidth
          multiline
          rows={3}
          parse={(v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return v;
            }
          }}
          format={(v: unknown) =>
            typeof v === 'string' ? v : JSON.stringify(v, null, 2)
          }
        />
      </SimpleForm>
    </Create>
  );
}
