import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  required,
} from 'react-admin';

export function ChatSkillCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <TextInput source="slug" validate={required()} fullWidth helperText="Lowercase slug (e.g., summarize-email)" />
        <TextInput source="description" validate={required()} fullWidth multiline />
        <TextInput
          source="promptTemplate"
          validate={required()}
          fullWidth
          multiline
          rows={4}
          helperText="Use {{var}} for template variables (e.g., Summarize: {{input}})"
        />
        <BooleanInput source="enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
