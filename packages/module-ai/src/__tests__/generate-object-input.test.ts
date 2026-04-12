import { describe, it, expect } from 'vitest';
import {
  parseGenerateObjectInput,
  generateObjectInputSchema,
} from '../api/_utils/generate-object-input';

// F-05-05: regression tests for the boundary validator on
// `POST /api/ai/generate-object`. The validator is pure and consumes
// the parsed JSON body, so the handler can be tested here without a
// `NextRequest` mock — the handler owns `await request.json()`, the
// helper owns the type narrowing.

describe('parseGenerateObjectInput — happy path', () => {
  it('accepts a minimal { prompt, schema } body', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'Generate a user',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
    });
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.value.prompt).toBe('Generate a user');
      expect(verdict.value.schema).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } },
      });
    }
  });

  it('accepts every optional field at the right type', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'Hi',
      schema: { type: 'string' },
      model: 'gpt-4o-mini',
      system: 'You are a helpful assistant.',
      temperature: 0.7,
      maxTokens: 256,
      tenantId: 1,
    });
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.value.model).toBe('gpt-4o-mini');
      expect(verdict.value.temperature).toBe(0.7);
      expect(verdict.value.maxTokens).toBe(256);
      expect(verdict.value.tenantId).toBe(1);
    }
  });

  it('accepts a tenantId of 0 (anonymous / platform default)', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { type: 'string' },
      tenantId: 0,
    });
    expect(verdict.ok).toBe(true);
  });

  it('trims prompt whitespace before validating min length', () => {
    const verdict = parseGenerateObjectInput({
      prompt: '   real prompt   ',
      schema: { type: 'string' },
    });
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.value.prompt).toBe('real prompt');
  });

  it.each([
    { type: 'object', properties: {} },
    { type: 'array', items: { type: 'string' } },
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'null' },
    { $ref: '#/definitions/User' },
    { oneOf: [{ type: 'string' }, { type: 'number' }] },
    { anyOf: [{ type: 'string' }] },
    { allOf: [{ type: 'string' }] },
    { enum: ['a', 'b'] },
    { const: 42 },
    { not: { type: 'null' } },
  ])('accepts JSON schema with structural keyword %o', (schema) => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema,
    });
    expect(verdict.ok).toBe(true);
  });
});

describe('parseGenerateObjectInput — body shape failures', () => {
  it.each([null, undefined, 'string', 42, true, [1, 2, 3]])(
    'rejects non-object body %o',
    (body) => {
      const verdict = parseGenerateObjectInput(body);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
        // arrays are typeof === 'object' so they fall through to zod,
        // which surfaces a type error. Either path is acceptable as
        // long as the verdict is false.
        expect(typeof verdict.reason).toBe('string');
        expect(verdict.reason.length).toBeGreaterThan(0);
      }
    },
  );

  it('explicit "request body must be a JSON object" reason for null/string', () => {
    expect(parseGenerateObjectInput(null)).toEqual({
      ok: false,
      reason: 'request body must be a JSON object',
      field: 'body',
    });
    expect(parseGenerateObjectInput('not an object')).toEqual({
      ok: false,
      reason: 'request body must be a JSON object',
      field: 'body',
    });
    expect(parseGenerateObjectInput(undefined)).toEqual({
      ok: false,
      reason: 'request body must be a JSON object',
      field: 'body',
    });
  });
});

describe('parseGenerateObjectInput — prompt failures', () => {
  it('rejects a missing prompt with the canonical message', () => {
    const verdict = parseGenerateObjectInput({
      schema: { type: 'string' },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.field).toBe('prompt');
      expect(verdict.reason).toBe(
        'prompt is required and must be a non-empty string',
      );
    }
  });

  it('rejects a non-string prompt with the canonical message', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 42,
      schema: { type: 'string' },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.field).toBe('prompt');
      expect(verdict.reason).toBe(
        'prompt is required and must be a non-empty string',
      );
    }
  });

  it('rejects an empty string prompt', () => {
    const verdict = parseGenerateObjectInput({
      prompt: '',
      schema: { type: 'string' },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('prompt');
  });

  it('rejects a whitespace-only prompt (post-trim min length)', () => {
    const verdict = parseGenerateObjectInput({
      prompt: '     ',
      schema: { type: 'string' },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('prompt');
  });
});

describe('parseGenerateObjectInput — schema failures', () => {
  it('rejects a missing schema with the canonical message', () => {
    const verdict = parseGenerateObjectInput({ prompt: 'X' });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.field).toBe('schema');
      expect(verdict.reason).toBe(
        'schema is required and must be a JSON schema object',
      );
    }
  });

  it('rejects a null schema with the canonical message', () => {
    const verdict = parseGenerateObjectInput({ prompt: 'X', schema: null });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.field).toBe('schema');
      expect(verdict.reason).toBe(
        'schema is required and must be a JSON schema object',
      );
    }
  });

  it('rejects a string schema with the canonical message', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: 'object',
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('schema');
  });

  it('rejects a number schema', () => {
    const verdict = parseGenerateObjectInput({ prompt: 'X', schema: 42 });
    expect(verdict.ok).toBe(false);
  });

  it('rejects an empty object schema (no JSON-Schema structural keyword)', () => {
    const verdict = parseGenerateObjectInput({ prompt: 'X', schema: {} });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.field).toBe('schema');
      expect(verdict.reason).toContain('JSON Schema');
    }
  });

  it('rejects a plain dictionary schema with no structural keyword', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { foo: 'bar', baz: 42 },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('schema');
  });

  it('rejects an array schema (arrays are not plain JSON Schemas)', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: [{ type: 'string' }],
    });
    expect(verdict.ok).toBe(false);
  });
});

describe('parseGenerateObjectInput — optional field failures', () => {
  it('rejects a non-string model', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { type: 'string' },
      model: 42,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('model');
  });

  it('rejects an empty string model', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { type: 'string' },
      model: '',
    });
    expect(verdict.ok).toBe(false);
  });

  it('rejects a non-finite temperature', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { type: 'string' },
      temperature: Number.POSITIVE_INFINITY,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('temperature');
  });

  it('rejects a non-integer maxTokens', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { type: 'string' },
      maxTokens: 12.5,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('maxTokens');
  });

  it('rejects a zero / negative maxTokens', () => {
    expect(
      parseGenerateObjectInput({
        prompt: 'X',
        schema: { type: 'string' },
        maxTokens: 0,
      }).ok,
    ).toBe(false);
    expect(
      parseGenerateObjectInput({
        prompt: 'X',
        schema: { type: 'string' },
        maxTokens: -10,
      }).ok,
    ).toBe(false);
  });

  it('rejects a negative tenantId', () => {
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { type: 'string' },
      tenantId: -1,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.field).toBe('tenantId');
  });
});

describe('parseGenerateObjectInput — defence-in-depth', () => {
  it('normalises a __proto__ literal into a clean own-property object', () => {
    // `{ __proto__: { type: 'object' } }` in JS object-literal syntax
    // sets the prototype, not an own key. Zod's `z.record(...)`
    // sanitises this by enumerating with `for...in` into a fresh
    // null-prototype object — the resulting parsed value is a clean
    // `{ type: 'object' }` with no prototype contamination, which IS
    // a valid JSON Schema. This is the safe outcome: prototype tricks
    // get FLATTENED to own properties, not refused.
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: { __proto__: { type: 'object' } },
    });
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      // The parsed value carries `type` as an OWN property (zod
      // flattens the inherited key during the for...in copy) and
      // exposes no other JSON-Schema keywords.
      expect(Object.prototype.hasOwnProperty.call(verdict.value.schema, 'type')).toBe(true);
      expect(verdict.value.schema.type).toBe('object');
      // No leaked structural keys other than `type`.
      const ownKeys = Object.keys(verdict.value.schema);
      expect(ownKeys).toEqual(['type']);
    }
  });

  it('rejects a JSON-parsed __proto__ object that has no structural keys', () => {
    // `JSON.parse` treats `"__proto__"` as a regular key (NOT a
    // prototype assignment), so the parsed value has `__proto__` as
    // an own property AND zero structural JSON-Schema keywords. The
    // refine guard rejects it.
    const polluted = JSON.parse('{ "__proto__": { "polluted": true } }');
    const verdict = parseGenerateObjectInput({
      prompt: 'X',
      schema: polluted,
    });
    expect(verdict.ok).toBe(false);
  });

  it('does NOT pollute Object.prototype on a malformed input', () => {
    parseGenerateObjectInput({
      prompt: 'X',
      schema: JSON.parse('{ "__proto__": { "polluted": true } }'),
    });
    // A separate object should NOT have a `polluted` key inherited.
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('exports a usable zod schema for downstream re-use', () => {
    // Smoke check that the exported schema is a real zod object —
    // future callers can compose it with `.extend(...)` for stricter
    // per-tenant variants without re-implementing the validator.
    const result = generateObjectInputSchema.safeParse({
      prompt: 'X',
      schema: { type: 'string' },
    });
    expect(result.success).toBe(true);
  });
});
