'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
} from 'react-admin';
import { Typography, Alert, Box } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const validateFlowSlug = (value: string) => {
  if (!value) return 'Slug is required';
  if (/^\//.test(value)) return 'Slug must not start with /';
  if (/\/$/.test(value)) return 'Slug must not end with /';
  if (/\//.test(value)) return 'Flow slug cannot contain /';
  if (/[^a-z0-9-]/.test(value))
    return 'Only lowercase letters, numbers, and hyphens allowed';
  return undefined;
};

export default function UiFlowEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput
          source="slug"
          label="Slug"
          isRequired
          fullWidth
          validate={validateFlowSlug}
          helperText="URL identifier for this portal (e.g. 'auth'). Cannot contain slashes."
        />
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon fontSize="small" />}
          sx={{ mb: 2, width: '100%' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            How slugs work
          </Typography>
          <Typography variant="body2">
            The flow slug identifies this portal. Pages within this flow have
            their own relative slugs. The home page uses an <strong>empty slug</strong>.
            Other pages use path segments like &quot;about&quot; or &quot;contact&quot;.
          </Typography>
          <Box sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
            tenant.yourdomain.com/ &rarr; home page (empty slug)
            <br />
            tenant.yourdomain.com/contact &rarr; page slug &quot;contact&quot;
          </Box>
        </Alert>
        <TextInput
          source="description"
          label="Description"
          multiline
          rows={3}
          fullWidth
        />
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
        <SelectInput
          source="status"
          label="Status"
          choices={[
            { id: 'draft', name: 'Draft' },
            { id: 'published', name: 'Published' },
            { id: 'archived', name: 'Archived' },
          ]}
        />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
