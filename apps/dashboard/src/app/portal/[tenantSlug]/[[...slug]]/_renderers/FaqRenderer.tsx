interface FaqItem {
  question: string;
  answer: string;
}

interface FaqRendererProps {
  title: string;
  faqItems: FaqItem[];
}

/**
 * Renders an FAQ page with collapsible question/answer items.
 */
export default function FaqRenderer({ title, faqItems }: FaqRendererProps) {
  if (!faqItems || faqItems.length === 0) {
    return (
      <div className="portal-faq">
        <h2 className="portal-page-title">{title}</h2>
        <div
          style={{
            border: '2px dashed #ddd',
            borderRadius: 'var(--portal-radius)',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: '#999',
          }}
        >
          <p>No FAQ items configured yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-faq">
      <h2 className="portal-page-title">{title}</h2>
      {faqItems.map((item, index) => (
        <details key={index} className="portal-faq-item">
          <summary>{item.question}</summary>
          <div className="faq-answer">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
