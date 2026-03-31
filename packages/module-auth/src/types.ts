import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { users, authSessions, apiKeys, passwordResetTokens } from './schema';

// ─── Select types (read from DB) ────────────────────────────────
export type User = InferSelectModel<typeof users>;
export type AuthSession = InferSelectModel<typeof authSessions>;
export type ApiKey = InferSelectModel<typeof apiKeys>;
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;

// ─── Insert types (write to DB) ─────────────────────────────────
export type NewUser = InferInsertModel<typeof users>;
export type NewAuthSession = InferInsertModel<typeof authSessions>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;
export type NewPasswordResetToken = InferInsertModel<typeof passwordResetTokens>;

// ─── Auth context ────────────────────────────────────────────────
// Represents the authenticated identity available throughout a request.
// Populated by the auth middleware and consumed by route handlers.
export interface AuthContext {
  userId: number;
  email: string;
  name: string;
  tenantId: number | null;
  roles: string[];
  permissions: string[];
  authMethod: 'jwt' | 'session' | 'api-key' | 'session-token';
}
