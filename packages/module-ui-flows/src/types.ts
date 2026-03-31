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

// ─── UI Flow Definition types (stored as definition JSONB) ──────

export type PageType = 'landing' | 'form' | 'faq' | 'chat' | 'custom';

export interface UiFlowPageDefinition {
  /** Unique node ID for ReactFlow */
  id: string;
  /** URL slug for the page (e.g. "auth", "faq") */
  slug: string;
  /** Display title */
  title: string;
  /** Page type */
  type: PageType;
  /** Form ID reference (for type=form or type=custom) */
  formRef?: string;
  /** Page-specific configuration */
  config?: Record<string, unknown>;
  /** ReactFlow canvas position */
  position?: { x: number; y: number };
}

export interface NavigationConfig {
  type: 'sidebar' | 'topbar' | 'tabs';
  items: { pageId: string; label: string; icon?: string }[];
}

export interface PortalSettings {
  /** Slug of the default home page */
  homePage?: string;
  /** Favicon URL */
  favicon?: string;
  /** Browser tab title */
  title?: string;
}

export interface UiFlowDefinition {
  pages: UiFlowPageDefinition[];
  navigation: NavigationConfig;
  settings: PortalSettings;
}

// ─── Theme Config (stored as themeConfig JSONB) ─────────────────

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  customCss?: string;
  borderRadius?: number;
}
