import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { players, playerSessions, playerPositions } from './schema';

// Select types (read from DB)
export type Player = InferSelectModel<typeof players>;
export type PlayerSession = InferSelectModel<typeof playerSessions>;
export type PlayerPosition = InferSelectModel<typeof playerPositions>;

// Insert types (write to DB)
export type NewPlayer = InferInsertModel<typeof players>;
export type NewPlayerSession = InferInsertModel<typeof playerSessions>;
export type NewPlayerPosition = InferInsertModel<typeof playerPositions>;

// Player statuses
export type PlayerStatus = 'active' | 'banned' | 'inactive';
