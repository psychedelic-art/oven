'use client';

import { createContext, useContext } from 'react';
import type { FormContext } from '../types';

// ─── Form Context ────────────────────────────────────────────────
// Provides form-level state to all oven-ui components in the tree.
// Manages field values, data source results, and workflow outputs.

const OvenFormContext = createContext<FormContext | null>(null);

export const OvenFormContextProvider = OvenFormContext.Provider;

/**
 * Access the form context from any oven-ui component.
 * Provides field values, data source results, workflow outputs,
 * and setters for updating each.
 */
export function useFormContext(): FormContext {
  const ctx = useContext(OvenFormContext);
  if (!ctx) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return ctx;
}

// ─── $.path Resolution ──────────────────────────────────────────
// Resolves $.path expressions from the form context, same pattern as workflows.

/**
 * Resolve a single $.path expression against the form context.
 * Returns the value at the path, or the original value if not a $.path.
 *
 * Examples:
 *   resolveValue('$.formFields.email', ctx) → ctx.formFields.email
 *   resolveValue('$.dataSources.patients.0.name', ctx) → first patient name
 *   resolveValue('$.workflowResults.spawn.sessionId', ctx) → workflow result
 *   resolveValue('hello', ctx) → 'hello' (literal passthrough)
 */
export function resolveValue(expr: unknown, context: FormContext): unknown {
  if (typeof expr !== 'string' || !expr.startsWith('$.')) {
    return expr;
  }

  const path = expr.slice(2).split('.');
  let value: unknown = context;

  for (const segment of path) {
    if (value == null) return undefined;
    if (typeof value === 'object' && segment in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Resolve all $.path bindings in a props object.
 * Returns a new object with resolved values.
 */
export function resolveBindings(
  props: Record<string, unknown>,
  bindings: Record<string, string> | undefined,
  context: FormContext,
): Record<string, unknown> {
  if (!bindings) return props;

  const resolved = { ...props };
  for (const [propName, pathExpr] of Object.entries(bindings)) {
    resolved[propName] = resolveValue(pathExpr, context);
  }
  return resolved;
}

/**
 * Resolve an entire params object where values may be $.path expressions.
 */
export function resolveParams(
  params: Record<string, string> | undefined,
  context: FormContext,
): Record<string, unknown> {
  if (!params) return {};

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    resolved[key] = resolveValue(value, context);
  }
  return resolved;
}

export default useFormContext;
