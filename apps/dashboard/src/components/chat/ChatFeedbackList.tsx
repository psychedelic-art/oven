import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const ratingChoices = [
  { id: 'positive', name: 'Positive' },
  { id: 'negative', name: 'Negative' },
];

const filters = [
  <SelectInput key="rating" source="rating" choices={ratingChoices} alwaysOn />,
];

export function ChatFeedbackList() {
  return (
    <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}>
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
