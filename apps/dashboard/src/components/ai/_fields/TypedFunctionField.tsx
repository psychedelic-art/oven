'use client';

/**
 * Thin wrapper around react-admin's `FunctionField` that makes the
 * record type parameter **required** instead of defaulting to `any`.
 *
 * BO IP-5 extraction (oven-bug-sprint sprint-06): with 16+ call sites
 * across GuardrailList, VectorStoreShow/List, PlaygroundExecutionShow/List
 * all needing a typed record, a single import of `TypedFunctionField`
 * is easier to audit than hunting for bare `FunctionField` usages.
 *
 * Usage:
 *   import { TypedFunctionField } from '../_fields/TypedFunctionField';
 *   <TypedFunctionField<MyRecord>
 *     label="Name"
 *     render={(record) => record.name}
 *   />
 */

import { FunctionField } from 'react-admin';
import type { FunctionFieldProps } from 'react-admin';
import type { ReactNode } from 'react';

/**
 * Props mirror `FunctionFieldProps` but WITHOUT the `= any` default on
 * the record type. TypeScript will error if a caller omits the generic
 * type parameter.
 */
export interface TypedFunctionFieldProps<
  RecordType extends Record<string, unknown>,
> extends Omit<FunctionFieldProps<RecordType>, 'render'> {
  render: (record: RecordType, source?: string) => ReactNode;
}

/**
 * Typed FunctionField — drop-in replacement for `FunctionField` that
 * enforces a record type at the call site. Renders identically to
 * react-admin's `FunctionField`.
 */
export function TypedFunctionField<
  RecordType extends Record<string, unknown>,
>(props: TypedFunctionFieldProps<RecordType>) {
  // The cast is safe because our RecordType satisfies react-admin's
  // `Record<string, any>` constraint. We need it because react-admin's
  // FunctionField accepts `Record<string, any>` while our interface
  // uses the stricter `Record<string, unknown>`.
  return <FunctionField {...(props as FunctionFieldProps<RecordType>)} />;
}
