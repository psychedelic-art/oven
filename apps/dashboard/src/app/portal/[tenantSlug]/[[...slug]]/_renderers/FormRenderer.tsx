'use client';

import { useEffect, useState } from 'react';

interface FormRendererProps {
  title: string;
  formId?: number | null;
  formRef?: string;
  tenantSlug: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

/**
 * Renders a form page.
 * If a formId or formRef is provided, fetches the form definition from the API.
 * Falls back to a placeholder if no form is configured.
 */
export default function FormRenderer({
  title,
  formId,
  formRef,
  tenantSlug,
}: FormRendererProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [formTitle, setFormTitle] = useState(title);
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
        if (data.name) setFormTitle(data.name);
        if (data.definition?.fields) setFields(data.definition.fields);
      } catch {
        // Silently fail — show placeholder
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [formId, formRef]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    formData.forEach((val, key) => {
      values[key] = val.toString();
    });

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

  if (loading) {
    return (
      <div className="portal-form-container">
        <h2 className="portal-page-title">{title}</h2>
        <p style={{ color: '#999' }}>Loading form...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="portal-form-container" style={{ textAlign: 'center', padding: '3rem 0' }}>
        <h2 style={{ color: 'var(--portal-primary)' }}>Thank you!</h2>
        <p style={{ color: '#555' }}>Your submission has been received.</p>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="portal-form-container">
        <h2 className="portal-page-title">{formTitle}</h2>
        <div
          style={{
            border: '2px dashed #ddd',
            borderRadius: 'var(--portal-radius)',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: '#999',
          }}
        >
          <p>Form not configured yet.</p>
          <p style={{ fontSize: '0.85rem' }}>
            Configure a form reference in the UI Flow editor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-form-container">
      <h2 className="portal-page-title">{formTitle}</h2>
      {error && (
        <div
          style={{
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: 'var(--portal-radius)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#c33',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.id} style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor={field.id}
              style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}
            >
              {field.label}
              {field.required && <span style={{ color: '#c33' }}> *</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.id}
                name={field.id}
                required={field.required}
                placeholder={field.placeholder}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: 'var(--portal-radius)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              />
            ) : field.type === 'select' ? (
              <select
                id={field.id}
                name={field.id}
                required={field.required}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: 'var(--portal-radius)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">Select...</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.id}
                name={field.id}
                type={field.type || 'text'}
                required={field.required}
                placeholder={field.placeholder}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: 'var(--portal-radius)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          style={{
            padding: '0.65rem 2rem',
            background: 'var(--portal-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--portal-radius)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          Submit
        </button>
      </form>
    </div>
  );
}
