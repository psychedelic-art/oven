/**
 * Pure boundary validator for `POST /api/ai/generate-object`. Extracted
 * from `ai-generate-object.handler.ts` so the validation can be
 * unit-tested without a `NextRequest` mock.
 *
 * F-05-05 (oven-bug-sprint sprint-05-handler-typesafety): the previous
 * implementation only checked `typeof body.schema === 'object'` and
 * fed the raw object straight into `jsonSchema(...)` with an
 * `as any` escape hatch. This module now runs the request body
 * through a typed zod schema and produces a structurally typed
 * `ParsedGenerateObjectInput` so the handler can drop the cast.
 *
 * The validator is intentionally NARROW: it covers the contract that
 * the handler reads (`prompt`, `schema`, `model?`, `system?`,
 * `temperature?`, `maxTokens?`, `tenantId?`) and verifies that
 * `schema` looks like a JSON Schema (object with at least one
 * structural keyword) before handing it to the AI SDK's `jsonSchema()`
 * helper. It does NOT try to validate every JSON-Schema sub-keyword
 * — that's the AI SDK's responsibility, and over-validating would
 * gratuitously break clients who rely on draft-07 / draft-2020-12
 * extensions.
 */

import { z } from 'zod';

/**
 * Structural keywords that any non-trivial JSON Schema is expected
 * to expose at the top level. The validator requires AT LEAST ONE of
 * these to be present, which weeds out empty objects, plain string
 * dictionaries, and prototype-key bypass attempts that would
 * otherwise sail through `typeof === 'object'`.
 */
const JSON_SCHEMA_STRUCTURAL_KEYS = [
  'type',
  '$ref',
  '$schema',
  'properties',
  'items',
  'oneOf',
  'anyOf',
  'allOf',
  'enum',
  'const',
  'not',
] as const;

/**
 * Type-only alias for "any plain JSON object". The handler still
 * passes the raw value through to `jsonSchema(...)` from the AI SDK,
 * which performs its own schema interpretation.
 */
export type JsonSchemaObject = Record<string, unknown>;

const jsonSchemaObjectSchema = z
  .record(z.unknown())
  .refine(
    (value) =>
      JSON_SCHEMA_STRUCTURAL_KEYS.some((key) =>
        Object.prototype.hasOwnProperty.call(value, key),
      ),
    {
      message:
        'schema must look like a JSON Schema (one of: ' +
        JSON_SCHEMA_STRUCTURAL_KEYS.join(', ') +
        ')',
    },
  );

/**
 * Zod schema for the request body. Every optional field uses
 * `.optional()` rather than `.nullable()` so a missing key is the
 * canonical "absent" value — matches the historical hand-rolled
 * checks the handler used to do.
 */
export const generateObjectInputSchema = z.object({
  prompt: z
    .string({ required_error: 'prompt is required and must be a non-empty string' })
    .trim()
    .min(1, 'prompt is required and must be a non-empty string'),
  schema: jsonSchemaObjectSchema,
  model: z.string().min(1).optional(),
  system: z.string().optional(),
  temperature: z.number().finite().optional(),
  maxTokens: z.number().int().positive().optional(),
  tenantId: z.number().int().nonnegative().optional(),
});

export type ParsedGenerateObjectInput = z.infer<typeof generateObjectInputSchema>;

/**
 * Verdict returned by `parseGenerateObjectInput`. `ok = false` means
 * the handler must surface a `400 Bad Request` with `reason` as the
 * error body and `field` as the optional field hint.
 */
export type GenerateObjectInputVerdict =
  | { ok: true; value: ParsedGenerateObjectInput }
  | { ok: false; reason: string; field: string };

/**
 * Validate the parsed JSON body for `POST /api/ai/generate-object`.
 * Pure — no I/O, no clock reads, no DB. Returns a typed verdict the
 * handler converts into a 400 (`{ error, field }`) or threads into
 * the AI SDK call.
 *
 * On rejection the verdict surfaces the FIRST zod issue's message,
 * which is the most actionable error the client gets back. The
 * handler must NOT widen this — `prompt is required` and `schema is
 * required` are tested verbatim.
 */
export function parseGenerateObjectInput(
  body: unknown,
): GenerateObjectInputVerdict {
  // Defence-in-depth: zod will reject non-objects too, but a custom
  // message here gives the client a better hint than zod's "Expected
  // object, received undefined".
  if (body === null || typeof body !== 'object') {
    return {
      ok: false,
      reason: 'request body must be a JSON object',
      field: 'body',
    };
  }

  const result = generateObjectInputSchema.safeParse(body);
  if (result.success) {
    return { ok: true, value: result.data };
  }

  const firstIssue = result.error.issues[0];
  const field = firstIssue?.path?.[0]?.toString() ?? 'body';
  // Re-map the canonical "X is required" message for the two top-
  // level fields so the historical hand-rolled error strings stay
  // stable. Tests pin this exact text — handler clients depend on it.
  let reason = firstIssue?.message ?? 'invalid request body';
  if (field === 'schema' && firstIssue?.code === 'invalid_type') {
    reason = 'schema is required and must be a JSON schema object';
  } else if (field === 'prompt' && firstIssue?.code === 'invalid_type') {
    reason = 'prompt is required and must be a non-empty string';
  }
  return { ok: false, reason, field };
}
