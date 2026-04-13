import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import type { Tenant } from './types';
import { useTenantContext } from './useTenantContext';

interface TenantSelectorProps {
  label?: string;
  allowAllOption?: boolean;
}

const ALL_TENANTS_OPTION: Tenant = { id: 0, name: 'All tenants', slug: '' };

export function TenantSelector({
  label = 'Tenant',
  allowAllOption = true,
}: TenantSelectorProps) {
  const tenants = useTenantContext((s) => s.tenants);
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);
  const setActiveTenantId = useTenantContext((s) => s.setActiveTenantId);

  // Only render for users who can see all tenants
  if (!isAdminMode && activeTenantId !== null) {
    // Non-admin users see their own tenant only — no selector needed
  }

  const options = allowAllOption
    ? [ALL_TENANTS_OPTION, ...tenants]
    : tenants;

  const selectedTenant = activeTenantId === null
    ? (allowAllOption ? ALL_TENANTS_OPTION : null)
    : tenants.find((t) => t.id === activeTenantId) ?? null;

  return (
    <Autocomplete
      sx={{ minWidth: 200 }}
      options={options}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={selectedTenant}
      onChange={(_event, newValue) => {
        if (!newValue || newValue.id === 0) {
          setActiveTenantId(null);
        } else {
          setActiveTenantId(newValue.id);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper' } }}
        />
      )}
    />
  );
}
