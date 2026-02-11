import type { PayloadProperty } from '@oven/module-workflows/types';

/**
 * Generate an example payload JSON from a payload schema.
 * Useful for "Copy JSON Example" in the execute dialog.
 */
export function generatePayloadExample(
  schema: PayloadProperty[]
): Record<string, unknown> {
  const example: Record<string, unknown> = {};

  for (const prop of schema) {
    if (prop.defaultValue !== undefined) {
      example[prop.name] = prop.defaultValue;
      continue;
    }

    switch (prop.type) {
      case 'string':
        example[prop.name] = 'example';
        break;
      case 'number':
        example[prop.name] = 0;
        break;
      case 'boolean':
        example[prop.name] = false;
        break;
      case 'object':
        example[prop.name] = {};
        break;
      case 'array':
        example[prop.name] = [];
        break;
      default:
        example[prop.name] = null;
    }
  }

  return example;
}

/**
 * Infer a payload schema from a runtime payload object.
 * Useful when no schema is defined but past execution payloads are available.
 */
export function inferSchemaFromPayload(
  payload: Record<string, unknown>
): PayloadProperty[] {
  const schema: PayloadProperty[] = [];

  for (const [name, value] of Object.entries(payload)) {
    let type: PayloadProperty['type'] = 'string';

    if (typeof value === 'string') {
      type = 'string';
    } else if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (Array.isArray(value)) {
      type = 'array';
    } else if (value !== null && typeof value === 'object') {
      type = 'object';
    }

    schema.push({
      name,
      type,
      required: true,
      description: `Inferred from execution payload (${type})`,
    });
  }

  return schema;
}
