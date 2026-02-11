import Handlebars from 'handlebars';

/**
 * Register custom Handlebars helpers for the workflow compiler.
 */
export function registerHelpers(hbs: typeof Handlebars): void {
  // Indent a block of text by N spaces
  hbs.registerHelper('indent', function (this: any, spaces: number, options: any) {
    const content = typeof options === 'object' ? options.fn(this) : '';
    const pad = ' '.repeat(spaces);
    return content
      .split('\n')
      .map((line: string) => (line.trim() ? pad + line : ''))
      .join('\n');
  });

  // JSON stringify with optional indent
  hbs.registerHelper('json', function (obj: unknown, indent?: number) {
    return new Handlebars.SafeString(
      JSON.stringify(obj, null, typeof indent === 'number' ? indent : 2)
    );
  });

  // Sanitize a name for use as a JS identifier
  hbs.registerHelper('sanitize', function (name: string) {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1')
      .replace(/_+/g, '_');
  });

  // Resolve a $.path expression to context.?.prop access
  hbs.registerHelper('resolvePath', function (expr: string) {
    if (typeof expr !== 'string' || !expr.startsWith('$.')) return JSON.stringify(expr);
    const segments = expr.slice(2).split('.');
    let result = 'context';
    for (const seg of segments) {
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg)) {
        result += `?.${seg}`;
      } else {
        result += `?.['${seg}']`;
      }
    }
    return result;
  });

  // Equality check
  hbs.registerHelper('ifEq', function (this: any, a: unknown, b: unknown, options: any) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  // Not equal
  hbs.registerHelper('ifNeq', function (this: any, a: unknown, b: unknown, options: any) {
    return a !== b ? options.fn(this) : options.inverse(this);
  });

  // Comparison operator to JS
  hbs.registerHelper('toJsOperator', function (op: string) {
    const map: Record<string, string> = {
      '==': '==',
      '!=': '!=',
      '>': '>',
      '<': '<',
      '>=': '>=',
      '<=': '<=',
    };
    return map[op] ?? '===';
  });
}
