import { inArray } from 'drizzle-orm';
import { permissions } from '@oven/module-roles/schema';
import { formComponents, forms } from './schema';

export async function seedForms(db: any): Promise<void> {
  // ─── Permissions ──────────────────────────────────────────────
  const modulePermissions = [
    { resource: 'forms', action: 'read', slug: 'forms.read', description: 'View forms' },
    { resource: 'forms', action: 'create', slug: 'forms.create', description: 'Create forms' },
    { resource: 'forms', action: 'update', slug: 'forms.update', description: 'Edit forms' },
    { resource: 'forms', action: 'delete', slug: 'forms.delete', description: 'Delete forms' },
    { resource: 'forms', action: 'publish', slug: 'forms.publish', description: 'Publish forms' },
    { resource: 'form-submissions', action: 'read', slug: 'form-submissions.read', description: 'View submissions' },
    { resource: 'form-submissions', action: 'create', slug: 'form-submissions.create', description: 'Submit forms' },
    { resource: 'form-components', action: 'read', slug: 'form-components.read', description: 'View components' },
    { resource: 'form-components', action: 'create', slug: 'form-components.create', description: 'Register components' },
    { resource: 'form-components', action: 'update', slug: 'form-components.update', description: 'Edit components' },
    { resource: 'form-components', action: 'delete', slug: 'form-components.delete', description: 'Delete components' },
    { resource: 'form-data-sources', action: 'read', slug: 'form-data-sources.read', description: 'View data sources' },
    { resource: 'form-data-sources', action: 'create', slug: 'form-data-sources.create', description: 'Create data sources' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }
  console.log('[module-forms] Seeded 13 forms permissions');

  // ─── 40 Form Components ──────────────────────────────────────
  const components = [
    // ── Inputs (12) ──
    {
      name: 'Text Input', slug: 'oven-text-input', category: 'inputs',
      description: 'Single-line text input field',
      definition: { type: 'oven-text-input', template: '<div data-gjs-type="oven-text-input"></div>' },
      defaultProps: { placeholder: '', required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true, description: 'Field label' },
          { name: 'name', type: 'string', required: true, description: 'Field name for form data' },
          { name: 'placeholder', type: 'string', description: 'Placeholder text' },
          { name: 'required', type: 'boolean', defaultValue: false },
          { name: 'disabled', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string', description: 'Current input value' }],
      },
    },
    {
      name: 'Textarea', slug: 'oven-textarea', category: 'inputs',
      description: 'Multi-line text input area',
      definition: { type: 'oven-textarea', template: '<div data-gjs-type="oven-textarea"></div>' },
      defaultProps: { rows: 4, placeholder: '', required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'rows', type: 'number', defaultValue: 4 },
          { name: 'placeholder', type: 'string' },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string' }],
      },
    },
    {
      name: 'Number Input', slug: 'oven-number-input', category: 'inputs',
      description: 'Numeric input with optional min/max',
      definition: { type: 'oven-number-input', template: '<div data-gjs-type="oven-number-input"></div>' },
      defaultProps: { required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'min', type: 'number' },
          { name: 'max', type: 'number' },
          { name: 'step', type: 'number', defaultValue: 1 },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'number' }],
      },
    },
    {
      name: 'Email Input', slug: 'oven-email-input', category: 'inputs',
      description: 'Email address input with validation',
      definition: { type: 'oven-email-input', template: '<div data-gjs-type="oven-email-input"></div>' },
      defaultProps: { required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'placeholder', type: 'string' },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string' }],
      },
    },
    {
      name: 'Password Input', slug: 'oven-password-input', category: 'inputs',
      description: 'Password input with show/hide toggle',
      definition: { type: 'oven-password-input', template: '<div data-gjs-type="oven-password-input"></div>' },
      defaultProps: { required: false, showToggle: true },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'required', type: 'boolean', defaultValue: false },
          { name: 'showToggle', type: 'boolean', defaultValue: true },
        ],
        outputs: [{ name: 'value', type: 'string' }],
      },
    },
    {
      name: 'Phone Input', slug: 'oven-phone-input', category: 'inputs',
      description: 'Phone number input with formatting',
      definition: { type: 'oven-phone-input', template: '<div data-gjs-type="oven-phone-input"></div>' },
      defaultProps: { required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'placeholder', type: 'string' },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string' }],
      },
    },
    {
      name: 'Date Picker', slug: 'oven-date-picker', category: 'inputs',
      description: 'Date selection input',
      definition: { type: 'oven-date-picker', template: '<div data-gjs-type="oven-date-picker"></div>' },
      defaultProps: { required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'min', type: 'string', description: 'Minimum date (YYYY-MM-DD)' },
          { name: 'max', type: 'string', description: 'Maximum date (YYYY-MM-DD)' },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string', description: 'Selected date as ISO string' }],
      },
    },
    {
      name: 'Time Picker', slug: 'oven-time-picker', category: 'inputs',
      description: 'Time selection input',
      definition: { type: 'oven-time-picker', template: '<div data-gjs-type="oven-time-picker"></div>' },
      defaultProps: { required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string' }],
      },
    },
    {
      name: 'Select', slug: 'oven-select', category: 'inputs',
      description: 'Dropdown select with options',
      definition: { type: 'oven-select', template: '<div data-gjs-type="oven-select"></div>' },
      defaultProps: { required: false, options: [] },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'options', type: 'array', required: true, description: 'Array of {label, value}' },
          { name: 'placeholder', type: 'string' },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string' }],
      },
    },
    {
      name: 'Checkbox', slug: 'oven-checkbox', category: 'inputs',
      description: 'Single checkbox with label',
      definition: { type: 'oven-checkbox', template: '<div data-gjs-type="oven-checkbox"></div>' },
      defaultProps: { defaultChecked: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'defaultChecked', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'checked', type: 'boolean' }],
      },
    },
    {
      name: 'Radio Group', slug: 'oven-radio-group', category: 'inputs',
      description: 'Radio button group for single selection',
      definition: { type: 'oven-radio-group', template: '<div data-gjs-type="oven-radio-group"></div>' },
      defaultProps: { options: [], required: false },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'options', type: 'array', required: true, description: 'Array of {label, value}' },
          { name: 'required', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'value', type: 'string' }],
      },
    },
    {
      name: 'File Upload', slug: 'oven-file-upload', category: 'inputs',
      description: 'File upload with drag-and-drop',
      definition: { type: 'oven-file-upload', template: '<div data-gjs-type="oven-file-upload"></div>' },
      defaultProps: { multiple: false, maxSizeMb: 10 },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'accept', type: 'string', description: 'Accepted file types (e.g. image/*,.pdf)' },
          { name: 'multiple', type: 'boolean', defaultValue: false },
          { name: 'maxSizeMb', type: 'number', defaultValue: 10 },
        ],
        outputs: [{ name: 'files', type: 'array', description: 'Uploaded file objects' }],
      },
    },

    // ── Data Display (8) ──
    {
      name: 'Data Table', slug: 'oven-data-table', category: 'data-display',
      description: 'Paginated table with sorting, filtering, and row selection',
      definition: { type: 'oven-data-table', template: '<div data-gjs-type="oven-data-table"></div>' },
      defaultProps: { pageSize: 10, sortable: true, filterable: false, selectable: false },
      dataContract: {
        inputs: [
          { name: 'columns', type: 'array', required: true, description: 'Column defs [{key, label, sortable}]' },
          { name: 'pageSize', type: 'number', defaultValue: 10 },
          { name: 'sortable', type: 'boolean', defaultValue: true },
          { name: 'filterable', type: 'boolean', defaultValue: false },
          { name: 'selectable', type: 'boolean', defaultValue: false },
        ],
        outputs: [
          { name: 'selectedRow', type: 'object', description: 'Currently selected row' },
          { name: 'selectedRows', type: 'array', description: 'All selected rows' },
          { name: 'currentPage', type: 'number' },
        ],
      },
    },
    {
      name: 'Paginated List', slug: 'oven-paginated-list', category: 'data-display',
      description: 'Paginated list view with configurable item rendering',
      definition: { type: 'oven-paginated-list', template: '<div data-gjs-type="oven-paginated-list"></div>' },
      defaultProps: { pageSize: 10 },
      dataContract: {
        inputs: [
          { name: 'pageSize', type: 'number', defaultValue: 10 },
          { name: 'emptyMessage', type: 'string', defaultValue: 'No items found' },
        ],
        outputs: [
          { name: 'currentPage', type: 'number' },
          { name: 'totalItems', type: 'number' },
        ],
      },
    },
    {
      name: 'Scrolled List', slug: 'oven-scrolled-list', category: 'data-display',
      description: 'Infinite scroll list with automatic data loading',
      definition: { type: 'oven-scrolled-list', template: '<div data-gjs-type="oven-scrolled-list"></div>' },
      defaultProps: { batchSize: 20, maxHeight: '400px' },
      dataContract: {
        inputs: [
          { name: 'batchSize', type: 'number', defaultValue: 20 },
          { name: 'maxHeight', type: 'string', defaultValue: '400px' },
          { name: 'emptyMessage', type: 'string', defaultValue: 'No items found' },
        ],
        outputs: [
          { name: 'loadedCount', type: 'number' },
          { name: 'hasMore', type: 'boolean' },
        ],
      },
    },
    {
      name: 'Card View', slug: 'oven-card-view', category: 'data-display',
      description: 'Grid of cards with data source binding',
      definition: { type: 'oven-card-view', template: '<div data-gjs-type="oven-card-view"></div>' },
      defaultProps: { columns: 3, gap: '1rem' },
      dataContract: {
        inputs: [
          { name: 'columns', type: 'number', defaultValue: 3 },
          { name: 'gap', type: 'string', defaultValue: '1rem' },
        ],
        outputs: [{ name: 'selectedCard', type: 'object' }],
      },
    },
    {
      name: 'Stat Card', slug: 'oven-stat-card', category: 'data-display',
      description: 'KPI / metric display card',
      definition: { type: 'oven-stat-card', template: '<div data-gjs-type="oven-stat-card"></div>' },
      defaultProps: {},
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'value', type: 'string', required: true },
          { name: 'change', type: 'string', description: 'Change indicator (e.g. +12%)' },
          { name: 'trend', type: 'string', description: 'up | down | neutral' },
          { name: 'icon', type: 'string' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Badge', slug: 'oven-badge', category: 'data-display',
      description: 'Status badge / tag label',
      definition: { type: 'oven-badge', template: '<div data-gjs-type="oven-badge"></div>' },
      defaultProps: { variant: 'default' },
      dataContract: {
        inputs: [
          { name: 'text', type: 'string', required: true },
          { name: 'variant', type: 'string', defaultValue: 'default', description: 'default|success|warning|error|info' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Progress Bar', slug: 'oven-progress-bar', category: 'data-display',
      description: 'Visual progress indicator',
      definition: { type: 'oven-progress-bar', template: '<div data-gjs-type="oven-progress-bar"></div>' },
      defaultProps: { value: 0, max: 100, showLabel: true },
      dataContract: {
        inputs: [
          { name: 'value', type: 'number', required: true },
          { name: 'max', type: 'number', defaultValue: 100 },
          { name: 'label', type: 'string' },
          { name: 'showLabel', type: 'boolean', defaultValue: true },
          { name: 'color', type: 'string' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Avatar', slug: 'oven-avatar', category: 'data-display',
      description: 'User avatar with fallback initials',
      definition: { type: 'oven-avatar', template: '<div data-gjs-type="oven-avatar"></div>' },
      defaultProps: { size: 'md' },
      dataContract: {
        inputs: [
          { name: 'src', type: 'string', description: 'Image URL' },
          { name: 'alt', type: 'string' },
          { name: 'fallback', type: 'string', description: 'Initials fallback (e.g. JD)' },
          { name: 'size', type: 'string', defaultValue: 'md', description: 'sm|md|lg' },
        ],
        outputs: [],
      },
    },

    // ── Layout (6) ──
    {
      name: 'Container', slug: 'oven-container', category: 'layout',
      description: 'Flexible container with padding and max-width',
      definition: { type: 'oven-container', template: '<div data-gjs-type="oven-container"></div>' },
      defaultProps: { maxWidth: '960px', padding: '1rem' },
      dataContract: {
        inputs: [
          { name: 'maxWidth', type: 'string', defaultValue: '960px' },
          { name: 'padding', type: 'string', defaultValue: '1rem' },
          { name: 'className', type: 'string' },
        ],
        outputs: [],
      },
    },
    {
      name: '2-Column Grid', slug: 'oven-grid-2col', category: 'layout',
      description: 'Two-column responsive grid layout',
      definition: { type: 'oven-grid-2col', template: '<div data-gjs-type="oven-grid-2col"></div>' },
      defaultProps: { gap: '1rem' },
      dataContract: {
        inputs: [{ name: 'gap', type: 'string', defaultValue: '1rem' }],
        outputs: [],
      },
    },
    {
      name: '3-Column Grid', slug: 'oven-grid-3col', category: 'layout',
      description: 'Three-column responsive grid layout',
      definition: { type: 'oven-grid-3col', template: '<div data-gjs-type="oven-grid-3col"></div>' },
      defaultProps: { gap: '1rem' },
      dataContract: {
        inputs: [{ name: 'gap', type: 'string', defaultValue: '1rem' }],
        outputs: [],
      },
    },
    {
      name: 'Tabs Container', slug: 'oven-tabs-container', category: 'layout',
      description: 'Tabbed content container',
      definition: { type: 'oven-tabs-container', template: '<div data-gjs-type="oven-tabs-container"></div>' },
      defaultProps: { tabs: [{ label: 'Tab 1', id: 'tab-1' }, { label: 'Tab 2', id: 'tab-2' }] },
      dataContract: {
        inputs: [
          { name: 'tabs', type: 'array', required: true, description: 'Array of {label, id}' },
          { name: 'defaultTab', type: 'string' },
        ],
        outputs: [{ name: 'activeTab', type: 'string' }],
      },
    },
    {
      name: 'Accordion', slug: 'oven-accordion', category: 'layout',
      description: 'Expandable/collapsible sections',
      definition: { type: 'oven-accordion', template: '<div data-gjs-type="oven-accordion"></div>' },
      defaultProps: { items: [{ title: 'Section 1', content: '' }], allowMultiple: false },
      dataContract: {
        inputs: [
          { name: 'items', type: 'array', required: true, description: 'Array of {title, content}' },
          { name: 'allowMultiple', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'openItems', type: 'array' }],
      },
    },
    {
      name: 'Divider', slug: 'oven-divider', category: 'layout',
      description: 'Horizontal divider line',
      definition: { type: 'oven-divider', template: '<div data-gjs-type="oven-divider"></div>' },
      defaultProps: { label: '' },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', description: 'Optional text in the divider' },
          { name: 'className', type: 'string' },
        ],
        outputs: [],
      },
    },

    // ── Actions (6) ──
    {
      name: 'Submit Button', slug: 'oven-submit-button', category: 'actions',
      description: 'Form submission button',
      definition: { type: 'oven-submit-button', template: '<div data-gjs-type="oven-submit-button"></div>' },
      defaultProps: { label: 'Submit', variant: 'primary' },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', defaultValue: 'Submit' },
          { name: 'variant', type: 'string', defaultValue: 'primary' },
          { name: 'disabled', type: 'boolean', defaultValue: false },
          { name: 'loading', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'clicked', type: 'boolean' }],
      },
    },
    {
      name: 'Button', slug: 'oven-button', category: 'actions',
      description: 'General purpose button',
      definition: { type: 'oven-button', template: '<div data-gjs-type="oven-button"></div>' },
      defaultProps: { label: 'Button', variant: 'default' },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'variant', type: 'string', defaultValue: 'default' },
          { name: 'disabled', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'clicked', type: 'boolean' }],
      },
    },
    {
      name: 'Link Button', slug: 'oven-link-button', category: 'actions',
      description: 'Button that navigates to a URL',
      definition: { type: 'oven-link-button', template: '<div data-gjs-type="oven-link-button"></div>' },
      defaultProps: { label: 'Go', href: '#' },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'href', type: 'string', required: true },
          { name: 'target', type: 'string', defaultValue: '_self' },
          { name: 'variant', type: 'string', defaultValue: 'default' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Icon Button', slug: 'oven-icon-button', category: 'actions',
      description: 'Icon-only action button',
      definition: { type: 'oven-icon-button', template: '<div data-gjs-type="oven-icon-button"></div>' },
      defaultProps: { icon: 'settings', size: 'md' },
      dataContract: {
        inputs: [
          { name: 'icon', type: 'string', required: true },
          { name: 'ariaLabel', type: 'string', required: true },
          { name: 'size', type: 'string', defaultValue: 'md' },
          { name: 'variant', type: 'string', defaultValue: 'ghost' },
        ],
        outputs: [{ name: 'clicked', type: 'boolean' }],
      },
    },
    {
      name: 'Workflow Trigger', slug: 'oven-workflow-trigger', category: 'actions',
      description: 'Button that invokes a workflow with mapped inputs',
      definition: { type: 'oven-workflow-trigger', template: '<div data-gjs-type="oven-workflow-trigger"></div>' },
      defaultProps: { label: 'Run Workflow' },
      dataContract: {
        inputs: [
          { name: 'label', type: 'string', required: true },
          { name: 'workflowSlug', type: 'string', required: true, description: 'Workflow to invoke' },
          { name: 'inputMapping', type: 'object', description: '$.path mappings for workflow inputs' },
          { name: 'variant', type: 'string', defaultValue: 'primary' },
          { name: 'confirmMessage', type: 'string', description: 'Optional confirmation prompt' },
        ],
        outputs: [
          { name: 'result', type: 'object', description: 'Workflow execution result' },
          { name: 'loading', type: 'boolean' },
          { name: 'error', type: 'string' },
        ],
      },
    },
    {
      name: 'API Fetcher', slug: 'oven-api-fetcher', category: 'actions',
      description: 'Fetches data from API and provides it to child components',
      definition: { type: 'oven-api-fetcher', template: '<div data-gjs-type="oven-api-fetcher"></div>' },
      defaultProps: { method: 'GET', autoFetch: true },
      dataContract: {
        inputs: [
          { name: 'endpoint', type: 'string', required: true },
          { name: 'method', type: 'string', defaultValue: 'GET' },
          { name: 'params', type: 'object', description: '$.path param mappings' },
          { name: 'autoFetch', type: 'boolean', defaultValue: true },
        ],
        outputs: [
          { name: 'data', type: 'object', description: 'Fetched response data' },
          { name: 'loading', type: 'boolean' },
          { name: 'error', type: 'string' },
        ],
      },
    },

    // ── Navigation (3) ──
    {
      name: 'Breadcrumb', slug: 'oven-breadcrumb', category: 'navigation',
      description: 'Breadcrumb trail navigation',
      definition: { type: 'oven-breadcrumb', template: '<div data-gjs-type="oven-breadcrumb"></div>' },
      defaultProps: { items: [] },
      dataContract: {
        inputs: [
          { name: 'items', type: 'array', required: true, description: 'Array of {label, href}' },
          { name: 'separator', type: 'string', defaultValue: '/' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Stepper', slug: 'oven-stepper', category: 'navigation',
      description: 'Multi-step progress indicator and navigator',
      definition: { type: 'oven-stepper', template: '<div data-gjs-type="oven-stepper"></div>' },
      defaultProps: { steps: [], currentStep: 0 },
      dataContract: {
        inputs: [
          { name: 'steps', type: 'array', required: true, description: 'Array of {label, description}' },
          { name: 'currentStep', type: 'number', defaultValue: 0 },
          { name: 'orientation', type: 'string', defaultValue: 'horizontal' },
        ],
        outputs: [{ name: 'activeStep', type: 'number' }],
      },
    },
    {
      name: 'Pagination Controls', slug: 'oven-pagination-controls', category: 'navigation',
      description: 'Page navigation controls for paginated data',
      definition: { type: 'oven-pagination-controls', template: '<div data-gjs-type="oven-pagination-controls"></div>' },
      defaultProps: { pageSize: 10, totalItems: 0 },
      dataContract: {
        inputs: [
          { name: 'currentPage', type: 'number', required: true },
          { name: 'totalItems', type: 'number', required: true },
          { name: 'pageSize', type: 'number', defaultValue: 10 },
          { name: 'onPageChange', type: 'string', description: 'Callback binding' },
        ],
        outputs: [{ name: 'page', type: 'number' }],
      },
    },

    // ── Content (5) ──
    {
      name: 'Heading', slug: 'oven-heading', category: 'content',
      description: 'Section heading (h1-h6)',
      definition: { type: 'oven-heading', template: '<div data-gjs-type="oven-heading"></div>' },
      defaultProps: { level: 'h2', text: 'Heading' },
      dataContract: {
        inputs: [
          { name: 'text', type: 'string', required: true },
          { name: 'level', type: 'string', defaultValue: 'h2', description: 'h1|h2|h3|h4|h5|h6' },
          { name: 'className', type: 'string' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Paragraph', slug: 'oven-paragraph', category: 'content',
      description: 'Text paragraph',
      definition: { type: 'oven-paragraph', template: '<div data-gjs-type="oven-paragraph"></div>' },
      defaultProps: { text: '' },
      dataContract: {
        inputs: [
          { name: 'text', type: 'string', required: true },
          { name: 'className', type: 'string' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Image', slug: 'oven-image', category: 'content',
      description: 'Responsive image with alt text',
      definition: { type: 'oven-image', template: '<div data-gjs-type="oven-image"></div>' },
      defaultProps: {},
      dataContract: {
        inputs: [
          { name: 'src', type: 'string', required: true },
          { name: 'alt', type: 'string', required: true },
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'objectFit', type: 'string', defaultValue: 'cover' },
        ],
        outputs: [],
      },
    },
    {
      name: 'Alert', slug: 'oven-alert', category: 'content',
      description: 'Alert / notification banner',
      definition: { type: 'oven-alert', template: '<div data-gjs-type="oven-alert"></div>' },
      defaultProps: { variant: 'info', dismissible: false },
      dataContract: {
        inputs: [
          { name: 'title', type: 'string' },
          { name: 'message', type: 'string', required: true },
          { name: 'variant', type: 'string', defaultValue: 'info', description: 'info|success|warning|error' },
          { name: 'dismissible', type: 'boolean', defaultValue: false },
        ],
        outputs: [{ name: 'dismissed', type: 'boolean' }],
      },
    },
    {
      name: 'Rich Text', slug: 'oven-rich-text', category: 'content',
      description: 'Rich HTML content block',
      definition: { type: 'oven-rich-text', template: '<div data-gjs-type="oven-rich-text"></div>' },
      defaultProps: { content: '' },
      dataContract: {
        inputs: [
          { name: 'content', type: 'string', required: true, description: 'HTML content string' },
          { name: 'className', type: 'string' },
        ],
        outputs: [],
      },
    },
  ];

  // Delete existing seed components to avoid duplicates on re-run
  const seedSlugs = components.map((c) => c.slug);
  await db.delete(formComponents).where(inArray(formComponents.slug, seedSlugs));

  for (const comp of components) {
    await db.insert(formComponents).values({
      name: comp.name,
      slug: comp.slug,
      category: comp.category,
      description: comp.description,
      definition: comp.definition,
      defaultProps: comp.defaultProps,
      dataContract: comp.dataContract,
      tenantId: null, // Global / shared components
    }).onConflictDoNothing();
  }
  console.log(`[module-forms] Seeded ${components.length} form components`);

  // ─── Sample Forms ─────────────────────────────────────────────
  // Delete existing seed forms to avoid duplicates on re-run
  const seedFormSlugs = ['contact-form', 'patient-intake', 'login-form'];
  await db.delete(forms).where(inArray(forms.slug, seedFormSlugs));

  // 1. Contact Form
  await db.insert(forms).values({
    tenantId: 1,
    name: 'Contact Form',
    slug: 'contact-form',
    description: 'Simple contact form with name, email, and message fields',
    status: 'published',
    version: 1,
    definition: {
      components: [
        {
          id: 'contact-heading',
          type: 'oven-heading',
          props: { text: 'Contact Us', level: 'h2' },
        },
        {
          id: 'contact-paragraph',
          type: 'oven-paragraph',
          props: { text: 'Fill out the form below and we will get back to you shortly.' },
        },
        {
          id: 'contact-grid',
          type: 'oven-grid-2col',
          props: { gap: '1rem' },
          children: [
            {
              id: 'contact-name',
              type: 'oven-text-input',
              props: { label: 'Full Name', name: 'fullName', placeholder: 'John Doe', required: true },
            },
            {
              id: 'contact-email',
              type: 'oven-email-input',
              props: { label: 'Email Address', name: 'email', placeholder: 'john@example.com', required: true },
            },
          ],
        },
        {
          id: 'contact-phone',
          type: 'oven-phone-input',
          props: { label: 'Phone Number', name: 'phone', placeholder: '+1 (555) 000-0000' },
        },
        {
          id: 'contact-subject',
          type: 'oven-select',
          props: {
            label: 'Subject',
            name: 'subject',
            required: true,
            options: [
              { label: 'General Inquiry', value: 'general' },
              { label: 'Support', value: 'support' },
              { label: 'Sales', value: 'sales' },
              { label: 'Partnership', value: 'partnership' },
            ],
          },
        },
        {
          id: 'contact-message',
          type: 'oven-textarea',
          props: { label: 'Message', name: 'message', placeholder: 'How can we help?', rows: 5, required: true },
        },
        {
          id: 'contact-submit',
          type: 'oven-submit-button',
          props: { label: 'Send Message', variant: 'primary' },
        },
      ],
      styles: [],
    },
  }).onConflictDoNothing();

  // 2. Patient Intake Form (dental clinic example)
  await db.insert(forms).values({
    tenantId: 1,
    name: 'Patient Intake Form',
    slug: 'patient-intake',
    description: 'New patient registration form for dental clinic',
    status: 'published',
    version: 1,
    definition: {
      components: [
        {
          id: 'intake-heading',
          type: 'oven-heading',
          props: { text: 'New Patient Registration', level: 'h1' },
        },
        {
          id: 'intake-alert',
          type: 'oven-alert',
          props: { message: 'Please complete all required fields before your first visit.', variant: 'info' },
        },
        {
          id: 'intake-tabs',
          type: 'oven-tabs-container',
          props: {
            tabs: [
              { label: 'Personal Info', id: 'personal' },
              { label: 'Medical History', id: 'medical' },
              { label: 'Insurance', id: 'insurance' },
            ],
          },
          children: [
            {
              id: 'intake-container-personal',
              type: 'oven-container',
              props: { padding: '1rem' },
              children: [
                {
                  id: 'intake-name-grid',
                  type: 'oven-grid-2col',
                  props: { gap: '1rem' },
                  children: [
                    { id: 'intake-first', type: 'oven-text-input', props: { label: 'First Name', name: 'firstName', required: true } },
                    { id: 'intake-last', type: 'oven-text-input', props: { label: 'Last Name', name: 'lastName', required: true } },
                  ],
                },
                {
                  id: 'intake-contact-grid',
                  type: 'oven-grid-2col',
                  props: { gap: '1rem' },
                  children: [
                    { id: 'intake-dob', type: 'oven-date-picker', props: { label: 'Date of Birth', name: 'dob', required: true } },
                    { id: 'intake-phone2', type: 'oven-phone-input', props: { label: 'Phone', name: 'phone', required: true } },
                  ],
                },
                { id: 'intake-email2', type: 'oven-email-input', props: { label: 'Email', name: 'email', required: true } },
              ],
            },
            {
              id: 'intake-container-medical',
              type: 'oven-container',
              props: { padding: '1rem' },
              children: [
                {
                  id: 'intake-allergies',
                  type: 'oven-textarea',
                  props: { label: 'Known Allergies', name: 'allergies', placeholder: 'List any allergies...', rows: 3 },
                },
                {
                  id: 'intake-medications',
                  type: 'oven-textarea',
                  props: { label: 'Current Medications', name: 'medications', placeholder: 'List current medications...', rows: 3 },
                },
                {
                  id: 'intake-conditions',
                  type: 'oven-checkbox',
                  props: { label: 'I have a heart condition', name: 'heartCondition' },
                },
                {
                  id: 'intake-diabetic',
                  type: 'oven-checkbox',
                  props: { label: 'I am diabetic', name: 'diabetic' },
                },
              ],
            },
            {
              id: 'intake-container-insurance',
              type: 'oven-container',
              props: { padding: '1rem' },
              children: [
                { id: 'intake-provider', type: 'oven-text-input', props: { label: 'Insurance Provider', name: 'insuranceProvider' } },
                { id: 'intake-policy', type: 'oven-text-input', props: { label: 'Policy Number', name: 'policyNumber' } },
                { id: 'intake-group', type: 'oven-text-input', props: { label: 'Group Number', name: 'groupNumber' } },
                {
                  id: 'intake-upload',
                  type: 'oven-file-upload',
                  props: { label: 'Upload Insurance Card', name: 'insuranceCard', accept: 'image/*,.pdf' },
                },
              ],
            },
          ],
        },
        {
          id: 'intake-divider',
          type: 'oven-divider',
          props: {},
        },
        {
          id: 'intake-consent',
          type: 'oven-checkbox',
          props: { label: 'I agree to the terms and conditions and consent to treatment', name: 'consent' },
        },
        {
          id: 'intake-submit',
          type: 'oven-submit-button',
          props: { label: 'Complete Registration', variant: 'primary' },
        },
      ],
      styles: [],
    },
  }).onConflictDoNothing();

  // 3. Login Form (enterprise login page)
  await db.insert(forms).values({
    tenantId: 1,
    name: 'Login Form',
    slug: 'login-form',
    description: 'Enterprise login page with branding panel and authentication form',
    status: 'published',
    version: 1,
    definition: {
      components: [
        {
          id: 'login-root',
          type: 'oven-grid-2col',
          props: { gap: 'none', className: 'min-h-screen' },
          children: [
            // ── Left: Branding panel ──
            {
              id: 'login-branding',
              type: 'oven-container',
              props: {
                padding: 'lg',
                className: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col justify-between min-h-screen relative overflow-hidden',
              },
              children: [
                {
                  id: 'login-logo',
                  type: 'oven-image',
                  props: {
                    src: '/logo-white.svg',
                    alt: 'Company Logo',
                    width: 160,
                    height: 40,
                    className: 'mb-8',
                  },
                },
                {
                  id: 'login-brand-heading',
                  type: 'oven-heading',
                  props: {
                    text: 'Supply Chain Dashboard',
                    level: 'h1',
                    className: 'text-4xl font-bold text-white mb-4',
                  },
                },
                {
                  id: 'login-brand-description',
                  type: 'oven-paragraph',
                  props: {
                    text: 'Manage your entire supply chain from a single platform. Real-time tracking, analytics, and intelligent automation.',
                    className: 'text-blue-100 text-lg mb-12',
                  },
                },
                {
                  id: 'login-stats-grid',
                  type: 'oven-grid-3col',
                  props: { gap: 'md', className: 'mt-auto' },
                  children: [
                    {
                      id: 'login-stat-uptime',
                      type: 'oven-stat-card',
                      props: {
                        label: 'Uptime',
                        value: '99.9%',
                        className: 'bg-white/10 border-white/20 text-white',
                      },
                    },
                    {
                      id: 'login-stat-support',
                      type: 'oven-stat-card',
                      props: {
                        label: 'Support',
                        value: '24/7',
                        className: 'bg-white/10 border-white/20 text-white',
                      },
                    },
                    {
                      id: 'login-stat-ai',
                      type: 'oven-stat-card',
                      props: {
                        label: 'Intelligence',
                        value: 'AI',
                        className: 'bg-white/10 border-white/20 text-white',
                      },
                    },
                  ],
                },
              ],
            },
            // ── Right: Login form panel ──
            {
              id: 'login-form-panel',
              type: 'oven-container',
              props: {
                padding: 'lg',
                maxWidth: 'sm',
                className: 'flex flex-col justify-center min-h-screen mx-auto w-full',
              },
              children: [
                {
                  id: 'login-form-heading',
                  type: 'oven-heading',
                  props: {
                    text: 'Welcome Back',
                    level: 'h2',
                    className: 'text-2xl font-bold text-gray-900 mb-1',
                  },
                },
                {
                  id: 'login-form-subtitle',
                  type: 'oven-paragraph',
                  props: {
                    text: 'Sign in to your account to continue',
                    className: 'text-gray-500 mb-6',
                  },
                },
                {
                  id: 'login-error-alert',
                  type: 'oven-alert',
                  props: {
                    message: 'Invalid credentials. Please try again.',
                    variant: 'error',
                    dismissible: true,
                  },
                },
                {
                  id: 'login-email',
                  type: 'oven-email-input',
                  props: {
                    label: 'Email Address',
                    name: 'email',
                    placeholder: 'you@company.com',
                    required: true,
                  },
                },
                {
                  id: 'login-password',
                  type: 'oven-password-input',
                  props: {
                    label: 'Password',
                    name: 'password',
                    required: true,
                    showToggle: true,
                  },
                },
                {
                  id: 'login-remember',
                  type: 'oven-checkbox',
                  props: {
                    label: 'Remember me for 30 days',
                    name: 'rememberMe',
                  },
                },
                {
                  id: 'login-submit',
                  type: 'oven-submit-button',
                  props: {
                    label: 'Sign In',
                    variant: 'primary',
                    fullWidth: true,
                    className: 'mt-4',
                  },
                },
                {
                  id: 'login-divider',
                  type: 'oven-divider',
                  props: { label: 'or continue with', className: 'my-6' },
                },
                {
                  id: 'login-google-btn',
                  type: 'oven-button',
                  props: {
                    label: 'Sign in with Google',
                    variant: 'outline',
                    className: 'w-full',
                  },
                },
                {
                  id: 'login-domains-grid',
                  type: 'oven-grid-3col',
                  props: { gap: 'sm', className: 'mt-6' },
                  children: [
                    {
                      id: 'login-badge-1',
                      type: 'oven-badge',
                      props: { text: '@company.com', variant: 'info' },
                    },
                    {
                      id: 'login-badge-2',
                      type: 'oven-badge',
                      props: { text: '@partner.org', variant: 'info' },
                    },
                    {
                      id: 'login-badge-3',
                      type: 'oven-badge',
                      props: { text: '@corp.net', variant: 'info' },
                    },
                  ],
                },
                {
                  id: 'login-footer',
                  type: 'oven-paragraph',
                  props: {
                    text: 'By signing in, you agree to our Terms of Service and Privacy Policy.',
                    className: 'text-xs text-gray-400 text-center mt-8',
                  },
                },
              ],
            },
          ],
        },
      ],
      styles: [],
    },
  }).onConflictDoNothing();

  console.log('[module-forms] Seeded 3 sample forms');
}
