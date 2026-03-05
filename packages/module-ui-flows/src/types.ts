import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { uiFlows, uiFlowVersions, uiFlowPages, uiFlowAnalytics } from './schema';

export type UiFlow = InferSelectModel<typeof uiFlows>;
export type UiFlowVersion = InferSelectModel<typeof uiFlowVersions>;
export type UiFlowPage = InferSelectModel<typeof uiFlowPages>;
export type UiFlowAnalytic = InferSelectModel<typeof uiFlowAnalytics>;

export type NewUiFlow = InferInsertModel<typeof uiFlows>;
export type NewUiFlowVersion = InferInsertModel<typeof uiFlowVersions>;
export type NewUiFlowPage = InferInsertModel<typeof uiFlowPages>;
export type NewUiFlowAnalytic = InferInsertModel<typeof uiFlowAnalytics>;
