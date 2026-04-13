'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

const categoryChoices = [
  { id: 'input', name: 'Input' },
  { id: 'display', name: 'Display' },
  { id: 'data', name: 'Data' },
  { id: 'layout', name: 'Layout' },
  { id: 'action', name: 'Action' },
];

export default function FormComponentCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <SelectInput
          source="category"
          label="Category"
          choices={categoryChoices}
          isRequired
        />
        <TextInput source="description" label="Description" fullWidth multiline />
        <TextInput
          source="definition"
          label="Definition (JSON)"
          fullWidth
          multiline
          rows={3}
          parse={(v: string) => {
            try { return JSON.parse(v); } catch { return v; }
          }}
          format={(v: unknown) =>
            typeof v === 'string' ? v : JSON.stringify(v, null, 2)
          }
        />
        <TextInput
          source="defaultProps"
          label="Default Props (JSON)"
          fullWidth
          multiline
          rows={3}
          parse={(v: string) => {
            try { return JSON.parse(v); } catch { return v; }
          }}
          format={(v: unknown) =>
            typeof v === 'string' ? v : JSON.stringify(v, null, 2)
          }
        />
        <TextInput
          source="dataContract"
          label="Data Contract (JSON)"
          fullWidth
          multiline
          rows={3}
          parse={(v: string) => {
            try { return JSON.parse(v); } catch { return v; }
          }}
          format={(v: unknown) =>
            typeof v === 'string' ? v : JSON.stringify(v, null, 2)
          }
        />
      </SimpleForm>
    </Create>
  );
}
