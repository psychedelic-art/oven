'use client';

import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  TextInput,
  SelectInput,
  FunctionField,
  ReferenceField,
} from 'react-admin';
import { Chip, Box, Typography, Paper, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  company: 'primary',
  group: 'secondary',
  team: 'success',
  department: 'warning',
};

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="type"
    source="type"
    choices={[
      { id: 'company', name: 'Company' },
      { id: 'group', name: 'Group' },
      { id: 'team', name: 'Team' },
      { id: 'department', name: 'Department' },
    ]}
  />,
];

export default function HierarchyList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <FunctionField
          label="Type"
          render={(record: any) => (
            <Chip
              label={record?.type}
              size="small"
              color={TYPE_COLORS[record?.type] || 'default'}
              variant="outlined"
            />
          )}
        />
        <ReferenceField source="parentId" reference="hierarchy-nodes" label="Parent" emptyText="Root">
          <TextField source="name" />
        </ReferenceField>
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}
