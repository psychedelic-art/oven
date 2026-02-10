import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { players } from './schema';

// Select types (read from DB)
export type Player = InferSelectModel<typeof players>;

// Insert types (write to DB)
export type NewPlayer = InferInsertModel<typeof players>;

// Player statuses
export type PlayerStatus = 'active' | 'banned' | 'inactive';
