import type { ComponentNode } from '@oven/oven-ui/types';

/** Discovery data for populating dynamic trait dropdowns */
export interface DiscoveryData {
  workflows?: Array<{ id: number; name: string; slug: string }>;
  apiEndpoints?: Array<{ module: string; route: string; method: string }>;
}

/** Configuration passed to the FormEditor component */
export interface EditorConfig {
  /** Initial form definition (component tree JSON) */
  definition?: FormDefinitionData;
  /** Available component blocks for the sidebar (fetched from form_components API) */
  blocks?: BlockDefinition[];
  /** Discovery data for trait dropdowns (workflows, API endpoints) */
  discovery?: DiscoveryData;
  /** Callback when the editor state changes */
  onChange?: (state: EditorState) => void;
  /** Callback when save is triggered */
  onSave?: (state: EditorState) => void;
  /** Read-only mode (preview) */
  readOnly?: boolean;
  /** Base API URL for data sources / workflows */
  apiBaseUrl?: string;
}

/** A custom block definition for the GrapeJS block manager */
export interface BlockDefinition {
  /** Unique block identifier (slug from form_components, e.g. 'oven-text-input') */
  id: string;
  /** Display label in the sidebar */
  label: string;
  /** Category for grouping (inputs, data-display, layout, actions, navigation, content) */
  category: string;
  /** GrapeJS component HTML/definition */
  content: string | Record<string, unknown>;
  /** Optional icon (MUI icon name) */
  icon?: string;
  /** Default props from form_components.default_props */
  defaultProps?: Record<string, unknown>;
  /** Data contract from form_components.data_contract */
  dataContract?: {
    inputs?: Array<{ name: string; type: string; required?: boolean; description?: string; defaultValue?: unknown; options?: Array<{ id: string; name: string }> }>;
    outputs?: Array<{ name: string; type: string; description?: string }>;
  };
}

/** State snapshot from the editor — stored in forms.definition */
export interface EditorState {
  /** Component tree (serialized from GrapeJS project data) */
  components: ComponentNode[];
  /** GrapeJS styles */
  styles: Record<string, unknown>[];
  /** GrapeJS project data (full state for reload) */
  projectData?: Record<string, unknown>;
}

/** The form definition data stored in forms.definition JSONB */
export interface FormDefinitionData {
  /** Component tree */
  components?: ComponentNode[];
  /** Styles */
  styles?: Record<string, unknown>[];
  /** Full GrapeJS project data for re-loading */
  projectData?: Record<string, unknown>;
}
