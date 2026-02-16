'use client';

import {
  List,
  Datagrid,
  TextField,
  FunctionField,
  TextInput,
  DateField,
} from 'react-admin';
import { Box } from '@mui/material';

const tilesetFilters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
];

export default function TilesetList() {
  return (
    <List filters={tilesetFilters} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid rowClick="edit">
        <TextField source="id" label="ID" />
        <TextField source="name" />
        <FunctionField
          label="Tile Size"
          render={(record: any) => `${record?.tileWidth ?? '?'}x${record?.tileHeight ?? '?'}`}
        />
        <FunctionField
          label="Grid"
          render={(record: any) =>
            record?.columns && record?.rows
              ? `${record.columns}x${record.rows} (${record.columns * record.rows} tiles)`
              : '—'
          }
        />
        <FunctionField
          label="Image"
          render={(record: any) =>
            record?.imagePath ? (
              <Box
                component="img"
                src={record.imagePath}
                alt={record.name}
                sx={{
                  maxWidth: 64,
                  maxHeight: 40,
                  objectFit: 'contain',
                  imageRendering: 'pixelated',
                  border: '1px solid #eee',
                  borderRadius: 1,
                }}
              />
            ) : (
              <span style={{ color: '#999', fontSize: '0.8em' }}>No image</span>
            )
          }
        />
        <TextField source="description" />
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}
