'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
} from 'react-admin';

const categoryChoices = [
  { id: 'input', name: 'Input' },
  { id: 'display', name: 'Display' },
  { id: 'data', name: 'Data' },
  { id: 'layout', name: 'Layout' },
  { id: 'action', name: 'Action' },
];

export default function FormComponentEdit() {
  return (
    <Edit>
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
        <NumberInput source="tenantId" label="Tenant ID" />
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
    </Edit>
  );
}
