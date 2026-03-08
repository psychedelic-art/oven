import type { ComponentRegistryEntry } from './types';

// ─── Input Components ───────────────────────────────────────────
import { TextInput } from './components/inputs/TextInput';
import { Textarea } from './components/inputs/Textarea';
import { NumberInput } from './components/inputs/NumberInput';
import { EmailInput } from './components/inputs/EmailInput';
import { PasswordInput } from './components/inputs/PasswordInput';
import { PhoneInput } from './components/inputs/PhoneInput';
import { DatePicker } from './components/inputs/DatePicker';
import { TimePicker } from './components/inputs/TimePicker';
import { Select } from './components/inputs/Select';
import { Checkbox } from './components/inputs/Checkbox';
import { RadioGroup } from './components/inputs/RadioGroup';
import { FileUpload } from './components/inputs/FileUpload';

// ─── Data Display Components ────────────────────────────────────
import { DataTable } from './components/data-display/DataTable';
import { PaginatedList } from './components/data-display/PaginatedList';
import { ScrolledList } from './components/data-display/ScrolledList';
import { CardView } from './components/data-display/CardView';
import { StatCard } from './components/data-display/StatCard';
import { Badge } from './components/data-display/Badge';
import { ProgressBar } from './components/data-display/ProgressBar';
import { Avatar } from './components/data-display/Avatar';

// ─── Layout Components ─────────────────────────────────────────
import { Container } from './components/layout/Container';
import { Grid2Col } from './components/layout/Grid2Col';
import { Grid3Col } from './components/layout/Grid3Col';
import { GridCell } from './components/layout/GridCell';
import { TabsContainer } from './components/layout/TabsContainer';
import { Accordion } from './components/layout/Accordion';
import { Divider } from './components/layout/Divider';

// ─── Action Components ─────────────────────────────────────────
import { SubmitButton } from './components/actions/SubmitButton';
import { Button } from './components/actions/Button';
import { LinkButton } from './components/actions/LinkButton';
import { IconButton } from './components/actions/IconButton';
import { WorkflowTrigger } from './components/actions/WorkflowTrigger';
import { ApiFetcher } from './components/actions/ApiFetcher';

// ─── Navigation Components ─────────────────────────────────────
import { Breadcrumb } from './components/navigation/Breadcrumb';
import { Stepper } from './components/navigation/Stepper';
import { PaginationControls } from './components/navigation/PaginationControls';

// ─── Content Components ────────────────────────────────────────
import { Heading } from './components/content/Heading';
import { Paragraph } from './components/content/Paragraph';
import { Image } from './components/content/Image';
import { Alert } from './components/content/Alert';
import { RichText } from './components/content/RichText';

// ─── Component Registry ────────────────────────────────────────
// Maps component type slugs to their React component + data contract.
// This is the central mapping used by both the editor and the renderer.

export const componentRegistry: Record<string, ComponentRegistryEntry> = {
  // ── Input Components (12) ──────────────────────────────────────
  'oven-text-input': {
    component: TextInput,
    category: 'input',
    description: 'Single-line text input with label and validation',
    icon: 'TextFields',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string', description: 'Field label' },
        { name: 'name', type: 'string', required: true, description: 'Field name for form data' },
        { name: 'placeholder', type: 'string', description: 'Placeholder text' },
        { name: 'required', type: 'boolean', defaultValue: false },
        { name: 'maxLength', type: 'number', description: 'Maximum character length' },
      ],
      outputs: [
        { name: 'value', type: 'string', description: 'Current input value' },
      ],
    },
  },
  'oven-textarea': {
    component: Textarea,
    category: 'input',
    description: 'Multi-line text input with configurable rows',
    icon: 'Notes',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'placeholder', type: 'string' },
        { name: 'required', type: 'boolean', defaultValue: false },
        { name: 'rows', type: 'number', defaultValue: 4 },
        { name: 'maxLength', type: 'number' },
      ],
      outputs: [{ name: 'value', type: 'string' }],
    },
  },
  'oven-number-input': {
    component: NumberInput,
    category: 'input',
    description: 'Numeric input with min/max/step constraints',
    icon: 'Numbers',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'min', type: 'number' },
        { name: 'max', type: 'number' },
        { name: 'step', type: 'number', defaultValue: 1 },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'value', type: 'number' }],
    },
  },
  'oven-email-input': {
    component: EmailInput,
    category: 'input',
    description: 'Email input with icon and validation',
    icon: 'Email',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'placeholder', type: 'string', defaultValue: 'you@example.com' },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'value', type: 'string' }],
    },
  },
  'oven-password-input': {
    component: PasswordInput,
    category: 'input',
    description: 'Password input with show/hide toggle',
    icon: 'Lock',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'placeholder', type: 'string' },
        { name: 'required', type: 'boolean', defaultValue: false },
        { name: 'showToggle', type: 'boolean', defaultValue: true },
      ],
      outputs: [{ name: 'value', type: 'string' }],
    },
  },
  'oven-phone-input': {
    component: PhoneInput,
    category: 'input',
    description: 'Phone number input with country code selector',
    icon: 'Phone',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'countryCode', type: 'string', defaultValue: '+1' },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'value', type: 'string' }],
    },
  },
  'oven-date-picker': {
    component: DatePicker,
    category: 'input',
    description: 'Date input with calendar picker',
    icon: 'CalendarToday',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'minDate', type: 'string' },
        { name: 'maxDate', type: 'string' },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'value', type: 'string', description: 'ISO date string' }],
    },
  },
  'oven-time-picker': {
    component: TimePicker,
    category: 'input',
    description: 'Time picker with 12h/24h format',
    icon: 'AccessTime',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'format24h', type: 'boolean', defaultValue: false },
        { name: 'minuteStep', type: 'number', defaultValue: 15 },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'value', type: 'string' }],
    },
  },
  'oven-select': {
    component: Select,
    category: 'input',
    description: 'Dropdown select with single/multi selection',
    icon: 'ArrowDropDown',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'options', type: 'array', required: true, description: 'Array of {value, label}' },
        { name: 'placeholder', type: 'string' },
        { name: 'multiple', type: 'boolean', defaultValue: false },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'value', type: 'string', description: 'Selected value(s)' }],
    },
  },
  'oven-checkbox': {
    component: Checkbox,
    category: 'input',
    description: 'Checkbox with label and optional description',
    icon: 'CheckBox',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
      ],
      outputs: [{ name: 'checked', type: 'boolean' }],
    },
  },
  'oven-radio-group': {
    component: RadioGroup,
    category: 'input',
    description: 'Radio button group with horizontal/vertical layout',
    icon: 'RadioButtonChecked',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'options', type: 'array', required: true, description: 'Array of {value, label}' },
        { name: 'orientation', type: 'string', defaultValue: 'vertical' },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'value', type: 'string' }],
    },
  },
  'oven-file-upload': {
    component: FileUpload,
    category: 'input',
    description: 'File upload with drag-and-drop zone',
    icon: 'CloudUpload',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'name', type: 'string', required: true },
        { name: 'accept', type: 'string', description: 'Accepted file types (e.g. .pdf,.jpg)' },
        { name: 'maxSize', type: 'number', description: 'Max file size in bytes' },
        { name: 'multiple', type: 'boolean', defaultValue: false },
        { name: 'required', type: 'boolean', defaultValue: false },
      ],
      outputs: [{ name: 'files', type: 'array', description: 'Selected files' }],
    },
  },

  // ── Data Display Components (8) ────────────────────────────────
  'oven-data-table': {
    component: DataTable,
    category: 'data-display',
    description: 'Paginated data table with sorting, filtering, and row selection',
    icon: 'TableChart',
    dataContract: {
      inputs: [
        { name: 'columns', type: 'array', required: true, description: 'Column definitions [{key, label, type?, sortable?, width?}]' },
        { name: 'pageSize', type: 'number', defaultValue: 10 },
        { name: 'selectable', type: 'boolean', defaultValue: false },
      ],
      outputs: [
        { name: 'selectedRow', type: 'object', description: 'Currently clicked row' },
        { name: 'selectedRows', type: 'array', description: 'Checked rows (multi-select)' },
        { name: 'currentPage', type: 'number' },
      ],
    },
  },
  'oven-paginated-list': {
    component: PaginatedList,
    category: 'data-display',
    description: 'Paginated list view with custom item rendering',
    icon: 'ViewList',
    dataContract: {
      inputs: [
        { name: 'pageSize', type: 'number', defaultValue: 10 },
        { name: 'emptyMessage', type: 'string', defaultValue: 'No items found' },
      ],
      outputs: [
        { name: 'selectedItem', type: 'object' },
        { name: 'currentPage', type: 'number' },
      ],
    },
  },
  'oven-scrolled-list': {
    component: ScrolledList,
    category: 'data-display',
    description: 'Infinite scroll list with automatic loading',
    icon: 'ViewStream',
    dataContract: {
      inputs: [
        { name: 'batchSize', type: 'number', defaultValue: 20 },
        { name: 'emptyMessage', type: 'string', defaultValue: 'No items found' },
      ],
      outputs: [
        { name: 'selectedItem', type: 'object' },
      ],
    },
  },
  'oven-card-view': {
    component: CardView,
    category: 'data-display',
    description: 'Responsive card grid with custom card rendering',
    icon: 'GridView',
    dataContract: {
      inputs: [
        { name: 'columns', type: 'number', defaultValue: 3 },
        { name: 'gap', type: 'string', defaultValue: 'md' },
      ],
      outputs: [
        { name: 'selectedCard', type: 'object' },
      ],
    },
  },
  'oven-stat-card': {
    component: StatCard,
    category: 'data-display',
    description: 'KPI/metric card with value, label, and trend indicator',
    icon: 'TrendingUp',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string', required: true },
        { name: 'value', type: 'string', required: true },
        { name: 'icon', type: 'string' },
        { name: 'trend', type: 'object', description: '{direction: "up"|"down", value: string}' },
      ],
      outputs: [],
    },
  },
  'oven-badge': {
    component: Badge,
    category: 'data-display',
    description: 'Colored pill badge for status indicators',
    icon: 'Label',
    dataContract: {
      inputs: [
        { name: 'text', type: 'string', required: true },
        { name: 'variant', type: 'string', defaultValue: 'default' },
        { name: 'size', type: 'string', defaultValue: 'md' },
      ],
      outputs: [],
    },
  },
  'oven-progress-bar': {
    component: ProgressBar,
    category: 'data-display',
    description: 'Progress bar with label and percentage display',
    icon: 'LinearScale',
    dataContract: {
      inputs: [
        { name: 'value', type: 'number', required: true },
        { name: 'max', type: 'number', defaultValue: 100 },
        { name: 'label', type: 'string' },
        { name: 'showValue', type: 'boolean', defaultValue: true },
        { name: 'color', type: 'string', defaultValue: 'blue' },
        { name: 'size', type: 'string', defaultValue: 'md' },
      ],
      outputs: [],
    },
  },
  'oven-avatar': {
    component: Avatar,
    category: 'data-display',
    description: 'Round avatar with image or initials fallback',
    icon: 'AccountCircle',
    dataContract: {
      inputs: [
        { name: 'src', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'size', type: 'string', defaultValue: 'md' },
        { name: 'fallback', type: 'string' },
      ],
      outputs: [],
    },
  },

  // ── Layout Components (6) ─────────────────────────────────────
  'oven-container': {
    component: Container,
    category: 'layout',
    description: 'Centered container with configurable max-width and padding',
    icon: 'CropFree',
    dataContract: {
      inputs: [
        { name: 'maxWidth', type: 'string', defaultValue: 'lg' },
        { name: 'padding', type: 'string', defaultValue: 'md' },
      ],
      outputs: [],
    },
  },
  'oven-grid-2col': {
    component: Grid2Col,
    category: 'layout',
    description: 'Two-column responsive grid',
    icon: 'ViewColumn',
    dataContract: {
      inputs: [
        { name: 'gap', type: 'string', defaultValue: 'md' },
        { name: 'responsive', type: 'boolean', defaultValue: true },
      ],
      outputs: [],
    },
  },
  'oven-grid-3col': {
    component: Grid3Col,
    category: 'layout',
    description: 'Three-column responsive grid',
    icon: 'ViewModule',
    dataContract: {
      inputs: [
        { name: 'gap', type: 'string', defaultValue: 'md' },
        { name: 'responsive', type: 'boolean', defaultValue: true },
      ],
      outputs: [],
    },
  },
  'oven-grid-cell': {
    component: GridCell,
    category: 'layout',
    description: 'Droppable cell inside a grid row (2col / 3col)',
    icon: 'ViewColumn',
    dataContract: {
      inputs: [
        { name: 'className', type: 'string' },
      ],
      outputs: [],
    },
  },
  'oven-tabs-container': {
    component: TabsContainer,
    category: 'layout',
    description: 'Tabbed content panels',
    icon: 'Tab',
    dataContract: {
      inputs: [
        { name: 'tabs', type: 'array', required: true, description: 'Array of {id, label}' },
        { name: 'defaultTab', type: 'string' },
      ],
      outputs: [{ name: 'activeTab', type: 'string' }],
    },
  },
  'oven-accordion': {
    component: Accordion,
    category: 'layout',
    description: 'Collapsible content sections',
    icon: 'ExpandMore',
    dataContract: {
      inputs: [
        { name: 'items', type: 'array', required: true, description: 'Array of {id, title}' },
        { name: 'multiple', type: 'boolean', defaultValue: true },
        { name: 'defaultOpen', type: 'array' },
      ],
      outputs: [],
    },
  },
  'oven-divider': {
    component: Divider,
    category: 'layout',
    description: 'Horizontal or vertical divider with optional label',
    icon: 'HorizontalRule',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string' },
        { name: 'orientation', type: 'string', defaultValue: 'horizontal' },
      ],
      outputs: [],
    },
  },

  // ── Action Components (6) ─────────────────────────────────────
  'oven-submit-button': {
    component: SubmitButton,
    category: 'action',
    description: 'Form submit button with loading state',
    icon: 'Send',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string', defaultValue: 'Submit' },
        { name: 'variant', type: 'string', defaultValue: 'primary' },
        { name: 'size', type: 'string', defaultValue: 'md' },
        { name: 'fullWidth', type: 'boolean', defaultValue: false },
      ],
      outputs: [],
    },
  },
  'oven-button': {
    component: Button,
    category: 'action',
    description: 'General-purpose button with icon support',
    icon: 'SmartButton',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string', required: true },
        { name: 'variant', type: 'string', defaultValue: 'primary' },
        { name: 'size', type: 'string', defaultValue: 'md' },
      ],
      outputs: [],
    },
  },
  'oven-link-button': {
    component: LinkButton,
    category: 'action',
    description: 'Navigation link styled as button',
    icon: 'Link',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string', required: true },
        { name: 'href', type: 'string', required: true },
        { name: 'target', type: 'string', defaultValue: '_self' },
        { name: 'variant', type: 'string', defaultValue: 'primary' },
      ],
      outputs: [],
    },
  },
  'oven-icon-button': {
    component: IconButton,
    category: 'action',
    description: 'Icon-only button with tooltip',
    icon: 'TouchApp',
    dataContract: {
      inputs: [
        { name: 'tooltip', type: 'string' },
        { name: 'variant', type: 'string', defaultValue: 'ghost' },
        { name: 'size', type: 'string', defaultValue: 'md' },
      ],
      outputs: [],
    },
  },
  'oven-workflow-trigger': {
    component: WorkflowTrigger,
    category: 'action',
    description: 'Button that invokes a workflow with mapped inputs from form context',
    icon: 'PlayCircle',
    dataContract: {
      inputs: [
        { name: 'label', type: 'string', required: true },
        { name: 'workflowSlug', type: 'string', required: true, description: 'Workflow to invoke' },
        { name: 'inputMapping', type: 'object', description: '$.path mappings for workflow payload' },
        { name: 'variant', type: 'string', defaultValue: 'primary' },
      ],
      outputs: [
        { name: 'result', type: 'object', description: 'Workflow execution result' },
      ],
    },
  },
  'oven-api-fetcher': {
    component: ApiFetcher,
    category: 'action',
    description: 'Fetches data from API and exposes to children',
    icon: 'CloudDownload',
    dataContract: {
      inputs: [
        { name: 'endpoint', type: 'string', required: true },
        { name: 'method', type: 'string', defaultValue: 'GET' },
        { name: 'params', type: 'object' },
        { name: 'autoFetch', type: 'boolean', defaultValue: true },
      ],
      outputs: [
        { name: 'data', type: 'object', description: 'Fetched data' },
        { name: 'loading', type: 'boolean' },
        { name: 'error', type: 'string' },
      ],
    },
  },

  // ── Navigation Components (3) ─────────────────────────────────
  'oven-breadcrumb': {
    component: Breadcrumb,
    category: 'navigation',
    description: 'Breadcrumb trail for page hierarchy',
    icon: 'ChevronRight',
    dataContract: {
      inputs: [
        { name: 'items', type: 'array', required: true, description: 'Array of {label, href?}' },
        { name: 'separator', type: 'string', defaultValue: '/' },
      ],
      outputs: [],
    },
  },
  'oven-stepper': {
    component: Stepper,
    category: 'navigation',
    description: 'Multi-step progress indicator',
    icon: 'LinearScale',
    dataContract: {
      inputs: [
        { name: 'steps', type: 'array', required: true, description: 'Array of {label, description?}' },
        { name: 'currentStep', type: 'number', required: true },
        { name: 'orientation', type: 'string', defaultValue: 'horizontal' },
      ],
      outputs: [],
    },
  },
  'oven-pagination-controls': {
    component: PaginationControls,
    category: 'navigation',
    description: 'Page navigation controls',
    icon: 'MoreHoriz',
    dataContract: {
      inputs: [
        { name: 'currentPage', type: 'number', required: true },
        { name: 'totalPages', type: 'number', required: true },
        { name: 'showFirstLast', type: 'boolean', defaultValue: true },
        { name: 'siblingCount', type: 'number', defaultValue: 1 },
      ],
      outputs: [{ name: 'page', type: 'number', description: 'Selected page' }],
    },
  },

  // ── Content Components (5) ────────────────────────────────────
  'oven-heading': {
    component: Heading,
    category: 'content',
    description: 'Heading element (H1-H6) with configurable level',
    icon: 'Title',
    dataContract: {
      inputs: [
        { name: 'text', type: 'string', required: true },
        { name: 'level', type: 'string', defaultValue: 'h2' },
        { name: 'align', type: 'string', defaultValue: 'left' },
      ],
      outputs: [],
    },
  },
  'oven-paragraph': {
    component: Paragraph,
    category: 'content',
    description: 'Paragraph text with configurable typography',
    icon: 'TextFormat',
    dataContract: {
      inputs: [
        { name: 'text', type: 'string', required: true },
        { name: 'size', type: 'string', defaultValue: 'md' },
        { name: 'color', type: 'string', defaultValue: 'default' },
        { name: 'align', type: 'string', defaultValue: 'left' },
      ],
      outputs: [],
    },
  },
  'oven-image': {
    component: Image,
    category: 'content',
    description: 'Responsive image with sizing options',
    icon: 'Image',
    dataContract: {
      inputs: [
        { name: 'src', type: 'string', required: true },
        { name: 'alt', type: 'string', required: true },
        { name: 'width', type: 'number' },
        { name: 'height', type: 'number' },
        { name: 'objectFit', type: 'string', defaultValue: 'cover' },
        { name: 'rounded', type: 'boolean', defaultValue: false },
        { name: 'shadow', type: 'boolean', defaultValue: false },
      ],
      outputs: [],
    },
  },
  'oven-alert': {
    component: Alert,
    category: 'content',
    description: 'Colored alert/notice (info, success, warning, error)',
    icon: 'Info',
    dataContract: {
      inputs: [
        { name: 'title', type: 'string' },
        { name: 'message', type: 'string', required: true },
        { name: 'variant', type: 'string', defaultValue: 'info' },
        { name: 'dismissible', type: 'boolean', defaultValue: false },
      ],
      outputs: [],
    },
  },
  'oven-rich-text': {
    component: RichText,
    category: 'content',
    description: 'Rich text content block with HTML rendering',
    icon: 'Article',
    dataContract: {
      inputs: [
        { name: 'content', type: 'string', required: true, description: 'HTML content' },
      ],
      outputs: [],
    },
  },
};
