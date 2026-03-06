interface CustomRendererProps {
  title: string;
  content: string;
}

/**
 * Renders a custom content page.
 * Content is rendered as raw HTML — useful for markdown-rendered or
 * HTML content configured in the UI Flow editor.
 */
export default function CustomRenderer({ title, content }: CustomRendererProps) {
  if (!content) {
    return (
      <div className="portal-custom-content">
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
          <p>No content configured yet.</p>
          <p style={{ fontSize: '0.85rem' }}>
            Add HTML or markdown content in the UI Flow editor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-custom-content">
      <h2 className="portal-page-title">{title}</h2>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
