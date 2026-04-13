'use client';

import { useEffect, useState } from 'react';
import { cn } from '@oven/oven-ui';
import { trackEvent } from '@/lib/analytics-client';

interface FormRendererProps {
  title: string;
  formId?: number | null;
  formRef?: string;
  tenantSlug: string;
}

export function FormRenderer({
  title,
  formId,
  formRef,
  tenantSlug,
}: FormRendererProps) {
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formHtml, setFormHtml] = useState<string | null>(null);

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
        if (data.definition?.html) {
          setFormHtml(data.definition.html);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [formId, formRef]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const values = Object.fromEntries(formData.entries());
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
      trackEvent(tenantSlug, 'form_submit', { formRef: ref });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (loading) {
    return (
      <div className={cn('w-full min-h-full')}>
        <h2 className={cn('text-2xl font-bold mb-4')}>{title}</h2>
        <p className={cn('text-gray-400')}>Loading form...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={cn('w-full min-h-full text-center py-12')}>
        <h2 className={cn('text-2xl font-bold text-blue-600 mb-2')}>Thank you!</h2>
        <p className={cn('text-gray-500')}>Your submission has been received.</p>
      </div>
    );
  }

  if (!formHtml) {
    return (
      <div className={cn('w-full min-h-full')}>
        <h2 className={cn('text-2xl font-bold mb-4')}>{title}</h2>
        <div className={cn('border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400')}>
          <p>Form not configured yet.</p>
          <p className={cn('text-sm mt-1')}>Configure a form reference in the UI Flow editor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full min-h-full')}>
      {error && (
        <div className={cn('bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm')}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div dangerouslySetInnerHTML={{ __html: formHtml }} />
      </form>
    </div>
  );
}
