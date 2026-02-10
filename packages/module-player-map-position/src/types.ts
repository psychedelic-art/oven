import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { playerMapAssignments, playerPositions, playerVisitedChunks } from './schema';

// Select types (read from DB)
export type PlayerMapAssignment = InferSelectModel<typeof playerMapAssignments>;
export type PlayerPosition = InferSelectModel<typeof playerPositions>;
export type PlayerVisitedChunk = InferSelectModel<typeof playerVisitedChunks>;

// Insert types (write to DB)
export type NewPlayerMapAssignment = InferInsertModel<typeof playerMapAssignments>;
export type NewPlayerPosition = InferInsertModel<typeof playerPositions>;
export type NewPlayerVisitedChunk = InferInsertModel<typeof playerVisitedChunks>;
