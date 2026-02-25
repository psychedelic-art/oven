'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  BooleanField,
  ReferenceField,
  FunctionField,
} from 'react-admin';
import { Box, Button, Chip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useParams } from 'react-router-dom';

export default function RlsPolicyShow() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" />
        <TextField source="name" />
        <TextField source="slug" />
        <TextField source="description" />
        <TextField source="targetTable" label="Target Table" />
        <TextField source="command" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={record?.status === 'applied' ? 'success' : record?.status === 'draft' ? 'warning' : 'default'}
            />
          )}
        />
        <NumberField source="version" />
        <BooleanField source="enabled" />
        <ReferenceField source="roleId" reference="roles" label="Role" emptyText="All roles">
          <TextField source="name" />
        </ReferenceField>
        <DateField source="appliedAt" label="Applied At" emptyText="Never" />
        <DateField source="createdAt" label="Created" />
        <DateField source="updatedAt" label="Updated" />

        <FunctionField
          label="Compiled SQL"
          render={(record: any) =>
            record?.compiledSql ? (
              <Box
                component="pre"
                sx={{
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  p: 1.5,
                  borderRadius: 1,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: 300,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {record.compiledSql}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Not compiled yet
              </Typography>
            )
          }
        />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/rls-policies/${id}/editor`)}
          >
            Open Visual Builder
          </Button>
        </Box>
      </SimpleShowLayout>
    </Show>
  );
}
