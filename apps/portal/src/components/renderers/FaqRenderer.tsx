import { cn } from '@oven/oven-ui';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqRendererProps {
  title: string;
  faqItems: FaqItem[];
}

export function FaqRenderer({ title, faqItems }: FaqRendererProps) {
  if (!faqItems || faqItems.length === 0) {
    return (
      <div className={cn('portal-faq')}>
        <h2 className={cn('portal-page-title')}>{title}</h2>
        <div className={cn('portal-chat chat-placeholder')}>
          <p>No FAQ items configured yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('portal-faq')}>
      <h2 className={cn('portal-page-title')}>{title}</h2>
      {faqItems.map((item, index) => (
        <details key={index} className={cn('portal-faq-item')}>
          <summary>{item.question}</summary>
          <div className={cn('faq-answer')}>{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
