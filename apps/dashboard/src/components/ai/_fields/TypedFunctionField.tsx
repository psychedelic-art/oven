'use client';

/**
 * Thin typed wrapper around react-admin's `FunctionField` for the AI
 * dashboard pages. Exists to centralise the typed-record pattern so
 * new AI resource views automatically get type-safe `render` callbacks
 * without each file rediscovering the `<FunctionField<RecordType>>`
 * generic syntax.
 *
 * Created per BO IP-5 threshold (3+ call-sites with the same
 * `record: any` pattern across GuardrailList, VectorStoreShow,
 * VectorStoreList, PlaygroundExecutionShow, PlaygroundExecutionList).
 *
 * Usage:
 *   import { TypedFunctionField } from './_fields/TypedFunctionField';
 *   <TypedFunctionField<MyRecord>
 *     label="Status"
 *     render={(record) => record?.status}
 *   />
 */

import { FunctionField } from 'react-admin';
import type { FunctionFieldProps } from 'react-admin';

/**
 * Re-export of react-admin's `FunctionField` with an explicit generic
 * constraint. Callers MUST supply a record type parameter — the
 * default of `Record<string, any>` is intentionally kept as a
 * fallback but all AI resource views should narrow it to their own
 * record interface (e.g., `GuardrailRecord`, `VectorStoreRecord`,
 * `PlaygroundExecutionRecord`).
 */
export function TypedFunctionField<
  RecordType extends Record<string, any> = Record<string, any>,
>(props: FunctionFieldProps<RecordType>) {
  return <FunctionField<RecordType> {...props} />;
}
