import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const ratingChoices = [
  { id: 'positive', name: 'Positive' },
  { id: 'negative', name: 'Negative' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'rating', label: 'Rating', kind: 'status', choices: ratingChoices, alwaysOn: true },
];

function ChatFeedbackListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function ChatFeedbackList() {
  return (
    <List actions={<ChatFeedbackListToolbar />} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid>
        <NumberField source="id" />
        <NumberField source="sessionId" label="Session" />
        <NumberField source="messageId" label="Message" />
        <FunctionField
          label="Rating"
          render={(record: Record<string, unknown>) => (
            <Chip
              label={record.rating === 'positive' ? '👍 Positive' : '👎 Negative'}
              color={record.rating === 'positive' ? 'success' : 'error'}
              size="small"
            />
          )}
        />
        <TextField source="comment" emptyText="—" />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
}
