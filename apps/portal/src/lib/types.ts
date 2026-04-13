export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  borderRadius?: string;
  maxContentWidth?: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}

export interface NavigationItem {
  pageId: string;
  label: string;
  icon?: string;
}

export interface Navigation {
  type: 'sidebar' | 'topbar' | 'tabs';
  items: NavigationItem[];
}

export interface FooterConfig {
  links?: Array<{ label: string; url: string }>;
  copyright?: string;
}

export interface PageDefinition {
  id: number;
  slug: string;
  title: string;
  pageType: string;
  formId: number | null;
  config: Record<string, unknown> | null;
  definition: Record<string, unknown> | null;
}

export interface PortalDefinition {
  pages: PageDefinition[];
  navigation: Navigation;
  footer?: FooterConfig;
  settings: {
    homePage?: string;
    favicon?: string;
    title?: string;
  };
  routing?: {
    redirects?: Array<{ from: string; to: string }>;
    notFoundPage?: string;
  };
}

export interface PortalData {
  definition: PortalDefinition;
  theme: ThemeConfig;
  domain: Record<string, unknown> | null;
  tenantName: string;
}

export interface PortalPageData {
  page: PageDefinition;
  theme: ThemeConfig;
  tenantName: string;
}
