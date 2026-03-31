'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { FormContext, FormDefinition } from '../types';
import { OvenFormContextProvider } from '../hooks/useFormContext';

// ─── FormProvider ───────────────────────────────────────────────
// Root context provider for form rendering.
// Manages form field values, data source results, and workflow outputs.

interface FormProviderProps {
  /** Form definition loaded from DB */
  definition: FormDefinition;
  /** Tenant slug for API calls */
  tenantSlug?: string;
  /** Callback when form is submitted */
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  /** Children (rendered inside the provider) */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export function FormProvider({
  definition,
  tenantSlug,
  onSubmit,
  children,
  className,
}: FormProviderProps) {
  const [formFields, setFormFields] = useState<Record<string, unknown>>({});
  const [dataSources, setDataSources] = useState<Record<string, unknown>>({});
  const [workflowResults, setWorkflowResults] = useState<Record<string, unknown>>({});

  const setFieldValue = useCallback((name: string, value: unknown) => {
    setFormFields(prev => ({ ...prev, [name]: value }));
  }, []);

  const setDataSourceResult = useCallback((id: string, data: unknown) => {
    setDataSources(prev => ({ ...prev, [id]: data }));
  }, []);

  const setWorkflowResult = useCallback((id: string, result: unknown) => {
    setWorkflowResults(prev => ({ ...prev, [id]: result }));
  }, []);

  const context: FormContext = useMemo(() => ({
    formFields,
    dataSources,
    workflowResults,
    tenantSlug,
    setFieldValue,
    setDataSourceResult,
    setWorkflowResult,
  }), [formFields, dataSources, workflowResults, tenantSlug, setFieldValue, setDataSourceResult, setWorkflowResult]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      await onSubmit(formFields);
    }
  }, [formFields, onSubmit]);

  return (
    <OvenFormContextProvider value={context}>
      <form onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </OvenFormContextProvider>
  );
}

export default FormProvider;
