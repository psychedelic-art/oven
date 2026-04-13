'use client';
import { Show, SimpleShowLayout, TextField, NumberField, DateField, FunctionField } from 'react-admin';
import { Avatar, Chip } from '@mui/material';

export default function UserShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="email" label="Email" />
        <TextField source="name" label="Name" />
        <FunctionField
          label="Avatar"
          render={(record: { avatar?: string; name?: string }) =>
            record.avatar ? (
              <Avatar
                src={record.avatar}
                alt={record.name || 'avatar'}
                sx={{ width: 48, height: 48 }}
              />
            ) : (
              <Avatar sx={{ width: 48, height: 48 }}>
                {record.name?.[0] ?? '?'}
              </Avatar>
            )
          }
        />
        <FunctionField
          label="Status"
          render={(record: { status?: string }) => {
            const color =
              record.status === 'active'
                ? 'success'
                : record.status === 'suspended'
                  ? 'error'
                  : 'default';
            return <Chip label={record.status} color={color} size="small" />;
          }}
        />
        <NumberField source="defaultTenantId" label="Default Tenant ID" />
        <DateField source="lastLoginAt" label="Last Login" showTime />
        <DateField source="createdAt" label="Created" />
        <DateField source="updatedAt" label="Updated" />
      </SimpleShowLayout>
    </Show>
  );
}
