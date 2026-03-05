/** Configuration passed to the FormEditor component */
export interface EditorConfig {
  /** Initial GrapeJS editor state (components + styles JSON) */
  definition?: Record<string, unknown>;
  /** Data layer configuration (data sources, bindings) */
  dataLayerConfig?: Record<string, unknown>;
  /** Business layer configuration (transformations, validations) */
  businessLayerConfig?: Record<string, unknown>;
  /** Available component blocks for the sidebar */
  blocks?: BlockDefinition[];
  /** Callback when the editor state changes */
  onChange?: (state: EditorState) => void;
  /** Callback when save is triggered */
  onSave?: (state: EditorState) => void;
  /** Read-only mode (preview) */
  readOnly?: boolean;
}

/** A custom block definition for the GrapeJS block manager */
export interface BlockDefinition {
  /** Unique block identifier */
  id: string;
  /** Display label in the sidebar */
  label: string;
  /** Category for grouping (input, display, data, layout, action) */
  category: string;
  /** GrapeJS component definition */
  content: string | Record<string, unknown>;
  /** Optional icon (MUI icon name or SVG string) */
  icon?: string;
}

/** State snapshot from the editor */
export interface EditorState {
  /** GrapeJS component tree and styles */
  definition: Record<string, unknown>;
  /** Data layer configuration */
  dataLayerConfig: Record<string, unknown>;
  /** Business layer configuration */
  businessLayerConfig: Record<string, unknown>;
}
