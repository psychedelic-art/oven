import { cn } from '@oven/oven-ui';

interface CustomRendererProps {
  title: string;
  content: string;
}

export function CustomRenderer({ title, content }: CustomRendererProps) {
  if (!content) {
    return (
      <div className={cn('portal-custom-content')}>
        <h2 className={cn('portal-page-title')}>{title}</h2>
        <div className={cn('portal-chat chat-placeholder')}>
          <p>No content configured yet.</p>
          <p className={cn('text-sm mt-1')}>Add HTML or markdown content in the UI Flow editor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('portal-custom-content')}>
      <h2 className={cn('portal-page-title')}>{title}</h2>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
