import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { playerSessions } from './schema';

// Select types (read from DB)
export type PlayerSession = InferSelectModel<typeof playerSessions>;

// Insert types (write to DB)
export type NewPlayerSession = InferInsertModel<typeof playerSessions>;
