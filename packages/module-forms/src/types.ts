import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  forms,
  formVersions,
  formComponents,
  formDataSources,
  formSubmissions,
} from './schema';

// Select types (read from DB)
export type Form = InferSelectModel<typeof forms>;
export type FormVersion = InferSelectModel<typeof formVersions>;
export type FormComponent = InferSelectModel<typeof formComponents>;
export type FormDataSource = InferSelectModel<typeof formDataSources>;
export type FormSubmission = InferSelectModel<typeof formSubmissions>;

// Insert types (write to DB)
export type NewForm = InferInsertModel<typeof forms>;
export type NewFormVersion = InferInsertModel<typeof formVersions>;
export type NewFormComponent = InferInsertModel<typeof formComponents>;
export type NewFormDataSource = InferInsertModel<typeof formDataSources>;
export type NewFormSubmission = InferInsertModel<typeof formSubmissions>;
