# Module Config -- UI

> Dashboard surface for the Module Configs resource.
> Implementation target: sprint-02. This doc freezes the contract the
> implementer must follow.

---

## Scope

- React Admin resource `module-configs` with List / Create / Edit views.
- Menu item under a "Platform" section label in `CustomMenu.tsx`.
- No portal-side UI -- config is an admin-only surface.

---

## Components

### `apps/dashboard/src/components/module-configs/ModuleConfigList.tsx`

```tsx
import {
  Datagrid,
  List,
  TextField,
  FunctionField,
  TextInput,
  SelectInput,
  NumberInput,
  ReferenceInput,
} from 'react-admin';
import { Box, Chip } from '@mui/material';
import { useTenantContext } from '@/contexts/TenantContext';
import type { ConfigEntry } from '@oven/module-config/types';

const filters = [
  <TextInput key="q" source="q" label="Search by key" alwaysOn />,
  <SelectInput
    key="scope"
    source="scope"
    choices={[
      { id: 'module',   name: 'Module' },
      { id: 'instance', name: 'Instance' },
    ]}
  />,
  <TextInput key="moduleName" source="moduleName" label="Module" />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

export function ModuleConfigList() {
  const { activeTenantId } = useTenantContext();
  return (
    <List
      filters={filters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'updatedAt', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick="edit" sx={{ '& .RaDatagrid-headerCell': { fontWeight: 600 } }}>
        <TextField source="moduleName" />
        <TextField source="key" />
        <FunctionField
          label="Scope"
          render={(r: ConfigEntry) => (
            <Chip
              label={r.scope}
              size="small"
              color={r.scope === 'instance' ? 'primary' : 'default'}
              sx={{ fontFamily: 'monospace' }}
            />
          )}
        />
        <TextField source="scopeId" label="Scope ID" />
        <TextField source="tenantId" label="Tenant" />
        <FunctionField
          label="Value"
          render={(r: ConfigEntry) => (
            <Box
              component="code"
              sx={{
                display: 'inline-block',
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 12,
                bgcolor: 'action.hover',
                px: 1,
                borderRadius: 0.5,
              }}
            >
              {JSON.stringify(r.value)}
            </Box>
          )}
        />
        <TextField source="description" />
      </Datagrid>
    </List>
  );
}
```

### `apps/dashboard/src/components/module-configs/ModuleConfigCreate.tsx`

```tsx
import { Create, SimpleForm, TextInput, SelectInput, NumberInput, useNotify, useRedirect } from 'react-admin';
import { Box } from '@mui/material';
import { useRegisteredModules } from '@/hooks/useRegisteredModules';

export function ModuleConfigCreate() {
  const modules = useRegisteredModules();          // hits /api/registry/modules
  const notify = useNotify();
  const redirect = useRedirect();

  return (
    <Create
      mutationOptions={{
        onError: (e: Error) => notify(e.message, { type: 'error' }),
        onSuccess: () => {
          notify('Config entry created', { type: 'success' });
          redirect('list', 'module-configs');
        },
      }}
      transform={(data) => ({
        ...data,
        value: tryParseJson(data.value),
      })}
    >
      <SimpleForm>
        <SelectInput
          source="moduleName"
          choices={modules.map((m) => ({ id: m.name, name: m.name }))}
          validate={required}
          sx={{ minWidth: 280 }}
        />
        <TextInput source="key" validate={required} sx={{ minWidth: 280 }} />
        <SelectInput
          source="scope"
          defaultValue="module"
          choices={[
            { id: 'module',   name: 'Module' },
            { id: 'instance', name: 'Instance' },
          ]}
        />
        <TextInput source="scopeId" helperText="Required when scope = instance" />
        <NumberInput source="tenantId" helperText="Leave empty for platform-global" />
        <TextInput
          source="value"
          label="Value (JSON)"
          multiline
          minRows={4}
          sx={{ fontFamily: 'monospace', minWidth: 480 }}
          validate={validateJson}
        />
        <TextInput source="description" multiline minRows={2} sx={{ minWidth: 480 }} />
      </SimpleForm>
    </Create>
  );
}
```

### `apps/dashboard/src/components/module-configs/ModuleConfigEdit.tsx`

Mirror of Create, wrapped in `<Edit>`, pre-populated. Uses the same form.

---

## Menu Integration

```tsx
// apps/dashboard/src/components/CustomMenu.tsx (excerpt)
import { Box, Divider, Typography } from '@mui/material';
import { Menu } from 'react-admin';

export function CustomMenu() {
  return (
    <Menu>
      {/* ... other sections ... */}

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Platform
        </Typography>
      </Box>
      <Menu.ResourceItem name="module-configs" />
    </Menu>
  );
}
```

---

## Styling Rules (CLAUDE.md enforcement)

- **No `style={{ }}`** anywhere in the above components. Use `sx` exclusively.
- **No `styled()`** wrapper calls.
- **No hand-written CSS classes**. Every visual tweak lives in `sx`.
- **`import type`** for all type-only imports (`ConfigEntry`, etc.).
- **No raw px spacing** except where theme units cannot express it (none
  expected in these components).

A grep for `style={{` under `apps/dashboard/src/components/module-configs/`
must return zero results at sprint-02 acceptance.

---

## JSON Value Editor

Ship the v1 as a plain `TextInput multiline` with `sx={{ fontFamily:
'monospace' }}` and a `validateJson` function that calls `JSON.parse` and
returns a human-readable error string. Upgrade to Monaco or CodeMirror only
if a later sprint identifies the plain textarea as a blocker.

`validateJson`:

```typescript
export function validateJson(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return 'Value is required';
  try {
    JSON.parse(value);
    return undefined;
  } catch (e) {
    return `Invalid JSON: ${(e as Error).message}`;
  }
}
```

---

## Accessibility

- Every `TextInput` has a label (default or explicit).
- The JSON textarea has an `aria-describedby` pointing at a helper line
  showing the last parse error.
- List view supports keyboard navigation through RA's default datagrid.
- Colour-only differentiation is avoided: scope chips use both colour and
  textual label.

---

## No-Go Zones

- Do **not** import `registry` directly in a client component. Use the
  `/api/registry/modules` endpoint via `useRegisteredModules`.
- Do **not** call `@oven/module-config/api/...` handler functions from the
  dashboard. Route all traffic through thin route shims under
  `apps/dashboard/src/app/api/module-configs/`.
- Do **not** add portal-side UI for config. Tenant admins read config via
  the public tenant config endpoint; they do not edit rows directly.
