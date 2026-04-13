'use client';

import {
  Create,
  SimpleForm,
  TextInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';
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

export default function UiFlowCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput
          source="slug"
          label="Slug"
          isRequired
          fullWidth
          validate={validateFlowSlug}
          helperText="URL identifier for this portal (e.g. 'auth'). Lowercase letters, numbers, and hyphens only."
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
            The flow slug identifies this portal. Each flow contains pages with
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
      </SimpleForm>
    </Create>
  );
}
