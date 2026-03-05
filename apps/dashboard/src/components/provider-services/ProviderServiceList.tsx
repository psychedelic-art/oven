'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  FunctionField,
  ReferenceField,
  ReferenceInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <ReferenceInput key="providerId" source="providerId" reference="providers" label="Provider" alwaysOn>
    <SelectInput optionText="name" />
  </ReferenceInput>,
  <ReferenceInput key="serviceId" source="serviceId" reference="services" label="Service">
    <SelectInput optionText="name" />
  </ReferenceInput>,
];

export default function ProviderServiceList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <ReferenceField source="providerId" reference="providers" label="Provider">
          <TextField source="name" />
        </ReferenceField>
        <ReferenceField source="serviceId" reference="services" label="Service">
          <TextField source="name" />
        </ReferenceField>
        <NumberField source="costPerUnit" label="Cost/Unit" />
        <TextField source="currency" label="Currency" />
        <FunctionField
          label="Default"
          render={(record: any) => (
            <Chip label={record?.isDefault ? 'Yes' : 'No'} size="small" color={record?.isDefault ? 'primary' : 'default'} />
          )}
        />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip label={record?.enabled ? 'Enabled' : 'Disabled'} size="small" color={record?.enabled ? 'success' : 'default'} />
          )}
        />
      </Datagrid>
    </List>
  );
}
