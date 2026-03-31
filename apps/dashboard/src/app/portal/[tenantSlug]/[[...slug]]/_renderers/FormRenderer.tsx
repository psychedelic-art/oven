'use client';

import { useEffect, useState } from 'react';
import {
  ComponentRenderer,
  FormProvider,
  renderComponentTree,
} from '@oven/oven-ui/renderer';
import type { ComponentNode, FormDefinition } from '@oven/oven-ui/types';

interface FormRendererProps {
  title: string;
  formId?: number | null;
  formRef?: string;
  tenantSlug: string;
}

/**
 * Portal form renderer.
 *
 * Fetches the form definition (JSON component tree) from the API and
 * renders it using the oven-ui ComponentRenderer factory pattern.
 * Each component in the tree maps to a real ShadCN/Tailwind React component.
 */
export default function FormRenderer({
  title,
  formId,
  formRef,
  tenantSlug,
}: FormRendererProps) {
  const [definition, setDefinition] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      if (!formId && !formRef) {
        setLoading(false);
        return;
      }

      try {
        const ref = formId || formRef;
        const res = await fetch(`/api/forms/${ref}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.definition) {
          setDefinition(data.definition);
        }
      } catch {
        // Silently fail — show placeholder
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [formId, formRef]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setError(null);
    try {
      const ref = formId || formRef;
      const res = await fetch(`/api/forms/${ref}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, tenantSlug }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Submission failed');
      }

      setSubmitted(true);

      // Track analytics
      fetch(`/api/portal/${tenantSlug}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'form_submit', formRef: ref }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="w-full min-h-full">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-gray-400">Loading form...</p>
      </div>
    );
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="w-full min-h-full text-center py-12">
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Thank you!</h2>
        <p className="text-gray-500">Your submission has been received.</p>
      </div>
    );
  }

  // ── No definition — placeholder ──
  if (!definition?.components || definition.components.length === 0) {
    return (
      <div className="w-full min-h-full">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400">
          <p>Form not configured yet.</p>
          <p className="text-sm mt-1">Configure a form reference in the UI Flow editor.</p>
        </div>
      </div>
    );
  }

  // ── Render component tree ──
  return (
    <div className="w-full min-h-full">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      <FormProvider
        definition={definition}
        tenantSlug={tenantSlug}
        onSubmit={handleSubmit}
      >
        {renderComponentTree(definition.components)}
      </FormProvider>
    </div>
  );
}
