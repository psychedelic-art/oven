// ─── Component Node (JSON tree stored in forms.definition) ──────
// This is what GrapeJS exports and what the factory renderer consumes.

export interface ComponentNode {
  /** Unique instance ID */
  id: string;
  /** Component type slug — maps to registry key (e.g. 'oven-text-input') */
  type: string;
  /** Component-specific props */
  props: Record<string, unknown>;
  /** Nested child components */
  children?: ComponentNode[];
  /** Data fetching configuration */
  dataSource?: DataSourceConfig;
  /** Event → workflow/API action bindings */
  actions?: ActionBinding[];
  /** Prop → $.path bindings from form context */
  bindings?: Record<string, string>;
}

// ─── Data Source Config ─────────────────────────────────────────
// Components can fetch data from APIs or workflows (like workflow invoke).

export interface DataSourceConfig {
  type: 'api' | 'workflow' | 'static';
  /** API route (for type='api') */
  endpoint?: string;
  /** Workflow slug (for type='workflow') */
  workflowSlug?: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** $.path param mappings resolved from form context */
  params?: Record<string, string>;
  /** Pagination config */
  pagination?: {
    enabled: boolean;
    pageSize: number;
    mode: 'offset' | 'cursor';
  };
  /** Cache policy */
  cachePolicy?: 'none' | 'session' | 'ttl';
  ttlSeconds?: number;
}

// ─── Action Binding ─────────────────────────────────────────────
// Binds component events to workflows, API calls, or navigation.

export interface ActionBinding {
  /** Component event name: 'onClick', 'onSubmit', 'onRowSelect', etc. */
  event: string;
  /** Action type */
  type: 'workflow' | 'api' | 'navigate' | 'setContext';
  /** Workflow slug (for type='workflow') */
  workflowSlug?: string;
  /** API endpoint (for type='api') */
  endpoint?: string;
  /** HTTP method (for type='api') */
  method?: string;
  /** Navigation URL (for type='navigate') */
  href?: string;
  /** $.path mappings from form context → action payload */
  inputMapping?: Record<string, string>;
  /** What to do on completion */
  onComplete?: 'refresh' | 'navigate' | 'notify' | 'setContext';
  onCompleteConfig?: Record<string, unknown>;
}

// ─── Data Contract (like workflow NodeTypeDefinition) ───────────
// Defines what a component accepts (inputs) and produces (outputs).

export interface DataContract {
  inputs: ParamDefinition[];
  outputs: ParamDefinition[];
}

export interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}

// ─── Component Registry Entry ───────────────────────────────────

export interface ComponentRegistryEntry {
  /** React component to render */
  component: React.ComponentType<any>;
  /** Data contract (inputs/outputs) */
  dataContract: DataContract;
  /** Category for grouping in editor sidebar */
  category: string;
  /** Human-readable description */
  description: string;
  /** Icon name (for editor sidebar) */
  icon?: string;
}

// ─── Form Context ───────────────────────────────────────────────
// Runtime state of the form — field values, data source results, workflow outputs.

export interface FormContext {
  /** Current values of all form fields */
  formFields: Record<string, unknown>;
  /** Data source results keyed by source ID */
  dataSources: Record<string, unknown>;
  /** Workflow execution results */
  workflowResults: Record<string, unknown>;
  /** Tenant slug for API calls */
  tenantSlug?: string;
  /** Update a form field value */
  setFieldValue: (name: string, value: unknown) => void;
  /** Update data source result */
  setDataSourceResult: (id: string, data: unknown) => void;
  /** Update workflow result */
  setWorkflowResult: (id: string, result: unknown) => void;
}

// ─── Form Definition (stored in forms.definition JSONB) ─────────

export interface FormDefinition {
  /** Component tree */
  components: ComponentNode[];
  /** Global data sources */
  dataSources?: DataSourceConfig[];
  /** Workflow bindings */
  workflows?: WorkflowBinding[];
}

export interface WorkflowBinding {
  id: string;
  name: string;
  workflowSlug: string;
  inputMapping: Record<string, string>;
  onComplete?: 'refresh' | 'navigate' | 'notify';
  onCompleteConfig?: Record<string, unknown>;
}

// ─── Shared component prop interfaces ───────────────────────────

export interface OvenComponentProps {
  /** CSS class name override */
  className?: string;
  /** Component children */
  children?: React.ReactNode;
}

export interface OvenInputProps extends OvenComponentProps {
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
}

export interface OvenDataProps extends OvenComponentProps {
  /** Data from data source */
  data?: unknown[];
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
}
