'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  NumberInput,
  SelectInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const decisionColors: Record<string, 'success' | 'error' | 'warning'> = {
  approve: 'success',
  reject: 'error',
  'request-changes': 'warning',
};

const flowReviewFilters = [
  <NumberInput key="flowItemId" source="flowItemId" label="Flow Item ID" />,
  <NumberInput key="reviewerId" source="reviewerId" label="Reviewer ID" />,
  <SelectInput
    key="decision"
    source="decision"
    label="Decision"
    choices={[
      { id: 'approve', name: 'Approve' },
      { id: 'reject', name: 'Reject' },
      { id: 'request-changes', name: 'Request Changes' },
    ]}
  />,
];

export default function FlowReviewList() {
  return (
    <List filters={flowReviewFilters}>
      <Datagrid rowClick="show">
        <NumberField source="id" />
        <NumberField source="flowItemId" label="Flow Item ID" />
        <NumberField source="stageId" label="Stage ID" />
        <NumberField source="reviewerId" label="Reviewer ID" />
        <FunctionField
          source="decision"
          label="Decision"
          render={(record: { decision: string }) => (
            <Chip
              label={record.decision}
              color={decisionColors[record.decision] || 'default'}
              size="small"
            />
          )}
        />
        <NumberField source="score" label="Score" />
        <DateField source="createdAt" label="Created At" showTime />
      </Datagrid>
    </List>
  );
}
