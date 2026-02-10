'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  TextInput,
  SelectInput,
  EditButton,
  ShowButton,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const MODE_COLORS: Record<string, 'info' | 'success' | 'default'> = {
  discovery: 'info',
  prebuilt: 'success',
};

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success'> = {
  draft: 'default',
  generating: 'warning',
  ready: 'success',
};

const mapFilters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="mode"
    source="mode"
    choices={[
      { id: 'discovery', name: 'Discovery' },
      { id: 'prebuilt', name: 'Prebuilt' },
    ]}
    alwaysOn
  />,
  <SelectInput
    key="status"
    source="status"
    choices={[
      { id: 'draft', name: 'Draft' },
      { id: 'generating', name: 'Generating' },
      { id: 'ready', name: 'Ready' },
    ]}
    alwaysOn
  />,
];

export default function MapList() {
  return (
    <List filters={mapFilters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid bulkActionButtons={false}>
        <TextField source="name" />
        <FunctionField
          label="Mode"
          render={(record: any) => (
            <Chip
              label={record?.mode}
              size="small"
              color={MODE_COLORS[record?.mode] || 'default'}
            />
          )}
        />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={STATUS_COLORS[record?.status] || 'default'}
            />
          )}
        />
        <NumberField source="totalChunks" label="Chunks" />
        <ReferenceField source="worldConfigId" reference="world-configs" label="World Config" link="show">
          <TextField source="name" />
        </ReferenceField>
        <DateField source="createdAt" label="Created" />
        <Box>
          <EditButton />
          <ShowButton />
        </Box>
      </Datagrid>
    </List>
  );
}
