import type { FilterDefinition, FilterValue } from './types';

/**
 * Serialize a React Admin filter object to URLSearchParams string.
 * Inverse of parseUrlFilters.
 */
export function serializeFilters(
  filters: Record<string, FilterValue>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && ('gte' in value || 'lte' in value)) {
      if (value.gte) params.set(`${key}_gte`, value.gte);
      if (value.lte) params.set(`${key}_lte`, value.lte);
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

/**
 * Parse a URLSearchParams string back to a React Admin filter object.
 * Inverse of serializeFilters.
 */
export function parseUrlFilters(
  search: string,
  definitions: FilterDefinition[],
): Record<string, FilterValue> {
  const params = new URLSearchParams(search);
  const result: Record<string, FilterValue> = {};

  for (const def of definitions) {
    if (def.kind === 'date-range') {
      const gte = params.get(`${def.source}_gte`);
      const lte = params.get(`${def.source}_lte`);
      if (gte || lte) {
        result[def.source] = { gte: gte ?? undefined, lte: lte ?? undefined };
      }
    } else if (def.kind === 'boolean') {
      const val = params.get(def.source);
      if (val !== null) {
        result[def.source] = val === 'true';
      }
    } else {
      const val = params.get(def.source);
      if (val !== null) {
        result[def.source] = val;
      }
    }
  }

  // Preserve any extra params not in definitions (e.g. q, tenantId)
  for (const [key, value] of params.entries()) {
    const stripped = key.replace(/_gte$|_lte$/, '');
    const alreadyHandled = definitions.some((d) => d.source === stripped);
    if (!alreadyHandled && !(key in result)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get display labels for active filters.
 */
export function getActiveFilterLabels(
  filterValues: Record<string, FilterValue>,
  definitions: FilterDefinition[],
): Array<{ source: string; label: string; displayValue: string }> {
  const labels: Array<{ source: string; label: string; displayValue: string }> = [];

  for (const [source, value] of Object.entries(filterValues)) {
    if (value === null || value === undefined || value === '') continue;
    // Skip quick-search — shown as the always-on input, not a chip
    const def = definitions.find((d) => d.source === source);
    if (def?.kind === 'quick-search') continue;
    // Skip tenantId — managed by the tenant context, not the filter chips
    if (source === 'tenantId') continue;

    const label = def?.label ?? source;
    let displayValue: string;

    if (typeof value === 'object' && ('gte' in value || 'lte' in value)) {
      const parts: string[] = [];
      if (value.gte) parts.push(`from ${value.gte}`);
      if (value.lte) parts.push(`to ${value.lte}`);
      displayValue = parts.join(' ');
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (def?.choices) {
      const choice = def.choices.find((c) => String(c.id) === String(value));
      displayValue = choice?.name ?? String(value);
    } else {
      displayValue = String(value);
    }

    labels.push({ source, label, displayValue });
  }

  return labels;
}
