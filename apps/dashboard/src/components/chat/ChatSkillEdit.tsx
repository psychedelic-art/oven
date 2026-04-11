import {
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  BooleanField,
  required,
} from 'react-admin';

export function ChatSkillEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <TextInput source="slug" disabled fullWidth />
        <TextInput source="description" validate={required()} fullWidth multiline />
        <TextInput
          source="promptTemplate"
          validate={required()}
          fullWidth
          multiline
          rows={4}
          helperText="Use {{var}} for template variables"
        />
        <BooleanInput source="enabled" />
        <BooleanField source="isBuiltIn" label="Built-in (read-only)" />
      </SimpleForm>
    </Edit>
  );
}
