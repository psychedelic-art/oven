export interface VariableData {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description?: string;
  defaultValue?: string;
  color?: string;
}

export type ToolbarItem =
  | 'bold' | 'italic' | 'underline'
  | 'heading1' | 'heading2'
  | 'bulletList' | 'orderedList'
  | 'link'
  | 'variable'
  | 'undo' | 'redo'
  | '|';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  variables?: VariableData[];
  onVariableInsert?: (variable: VariableData) => void;
  minHeight?: number;
  maxHeight?: number;
  showToolbar?: boolean;
  toolbarItems?: ToolbarItem[];
}

/**
 * Convert HTML with variable spans back to plain text with {{var}} syntax.
 */
export function htmlToPrompt(html: string): string {
  if (!html) return '';
  return html
    .replace(/<span[^>]*data-variable="([^"]*)"[^>]*>[^<]*<\/span>/g, '{{$1}}')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>\s*<p[^>]*>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Convert plain text with {{var}} syntax to HTML with variable spans.
 */
export function promptToHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{\{(\w+)\}\}/g,
      '<span data-variable="$1" class="variable-badge" contenteditable="false">{{$1}}</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>');
}
