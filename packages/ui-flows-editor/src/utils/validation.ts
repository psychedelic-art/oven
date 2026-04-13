import type { UiFlowDefinition, PageType } from '@oven/module-ui-flows/types';
import { normalizePageSlug } from '@oven/module-ui-flows/slug-utils';

const VALID_PAGE_TYPES: readonly PageType[] = [
  'landing',
  'form',
  'faq',
  'chat',
  'custom',
];

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a UiFlowDefinition against the module schema.
 *
 * Checks:
 * - pages[] is present and non-empty
 * - Each page has a valid `type`
 * - No duplicate slugs after normalization
 * - At least one page with an empty slug (home page)
 * - `formRef` required for form/custom pages
 * - `agentSlug` config required for chat pages
 * - Optional `maxPages` hard cap (from MAX_PAGES_PER_FLOW config)
 */
export function validateDefinition(
  definition: unknown,
  maxPages?: number,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!definition || typeof definition !== 'object') {
    return {
      valid: false,
      errors: [{ path: '', message: 'Definition must be an object' }],
    };
  }

  const def = definition as Partial<UiFlowDefinition>;

  if (!Array.isArray(def.pages)) {
    errors.push({ path: 'pages', message: 'pages must be an array' });
    return { valid: false, errors };
  }

  if (def.pages.length === 0) {
    errors.push({ path: 'pages', message: 'pages must not be empty' });
    return { valid: errors.length === 0, errors };
  }

  if (maxPages != null && def.pages.length > maxPages) {
    errors.push({
      path: 'pages',
      message: `Too many pages (${def.pages.length}). Maximum is ${maxPages}`,
    });
  }

  const slugs = new Set<string>();
  let hasHomePage = false;

  for (let i = 0; i < def.pages.length; i++) {
    const page = def.pages[i];
    const prefix = `pages[${i}]`;

    // Valid type
    if (!VALID_PAGE_TYPES.includes(page.type)) {
      errors.push({
        path: `${prefix}.type`,
        message: `Invalid page type "${page.type}". Must be one of: ${VALID_PAGE_TYPES.join(', ')}`,
      });
    }

    // Unique slug
    const slug = normalizePageSlug(page.slug);
    if (slugs.has(slug)) {
      errors.push({
        path: `${prefix}.slug`,
        message: `Duplicate slug "${slug || '(home)'}"`,
      });
    }
    slugs.add(slug);

    if (slug === '') {
      hasHomePage = true;
    }

    // formRef required for form/custom
    if ((page.type === 'form' || page.type === 'custom') && !page.formRef) {
      errors.push({
        path: `${prefix}.formRef`,
        message: `formRef is required for "${page.type}" pages`,
      });
    }

    // agentSlug required for chat
    if (page.type === 'chat') {
      const agentSlug = (page.config as Record<string, unknown> | undefined)
        ?.agentSlug;
      if (!agentSlug) {
        errors.push({
          path: `${prefix}.config.agentSlug`,
          message: 'agentSlug is required for chat pages',
        });
      }
    }
  }

  if (!hasHomePage) {
    errors.push({
      path: 'pages',
      message: 'At least one page must have an empty slug (home page)',
    });
  }

  return { valid: errors.length === 0, errors };
}
