export type FilterKind = 'combo' | 'date-range' | 'status' | 'quick-search' | 'boolean';

export type StatusChoice = {
  id: string;
  name: string;
  colour?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
};

export type FilterDefinition = {
  source: string;
  label: string;
  kind: FilterKind;
  /** Always visible in the toolbar (not behind the "Filters" popover) */
  alwaysOn?: boolean;
  /** For combo/status filters: static choices */
  choices?: StatusChoice[];
  /** For combo filters: React Admin reference resource name */
  reference?: string;
  /** For combo filters: field to display from reference records */
  optionText?: string;
};

export type FilterValue = string | number | boolean | null | {
  gte?: string;
  lte?: string;
};

export type ActiveFilter = {
  source: string;
  label: string;
  displayValue: string;
};
