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
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const referenceFilters = [
  <ReferenceInput key="providerId" source="providerId" reference="providers" label="Provider" alwaysOn>
    <SelectInput optionText="name" />
  </ReferenceInput>,
  <ReferenceInput key="serviceId" source="serviceId" reference="services" label="Service">
    <SelectInput optionText="name" />
  </ReferenceInput>,
];

const filterDefinitions: FilterDefinition[] = [];

function ProviderServiceListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ProviderServiceList() {
  return (
    <List filters={referenceFilters} actions={<ProviderServiceListToolbar />} sort={{ field: 'id', order: 'DESC' }}>
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
