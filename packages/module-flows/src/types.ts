import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { flows, flowVersions, flowStages, flowItems, flowTransitions, flowComments, flowReviews } from './schema';

// Select types (read from DB)
export type Flow = InferSelectModel<typeof flows>;
export type FlowVersion = InferSelectModel<typeof flowVersions>;
export type FlowStage = InferSelectModel<typeof flowStages>;
export type FlowItem = InferSelectModel<typeof flowItems>;
export type FlowTransition = InferSelectModel<typeof flowTransitions>;
export type FlowComment = InferSelectModel<typeof flowComments>;
export type FlowReview = InferSelectModel<typeof flowReviews>;

// Insert types (write to DB)
export type NewFlow = InferInsertModel<typeof flows>;
export type NewFlowVersion = InferInsertModel<typeof flowVersions>;
export type NewFlowStage = InferInsertModel<typeof flowStages>;
export type NewFlowItem = InferInsertModel<typeof flowItems>;
export type NewFlowTransition = InferInsertModel<typeof flowTransitions>;
export type NewFlowComment = InferInsertModel<typeof flowComments>;
export type NewFlowReview = InferInsertModel<typeof flowReviews>;
