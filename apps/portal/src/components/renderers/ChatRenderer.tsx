import { cn } from '@oven/oven-ui';

interface ChatRendererProps {
  title: string;
  welcomeMessage?: string;
  chatProvider?: string;
}

export function ChatRenderer({
  title,
  welcomeMessage,
  chatProvider,
}: ChatRendererProps) {
  return (
    <div className={cn('portal-chat')}>
      <h2 className={cn('portal-page-title')}>{title}</h2>
      {welcomeMessage && <p className={cn('chat-welcome')}>{welcomeMessage}</p>}
      <div className={cn('chat-placeholder')}>
        {chatProvider ? (
          <p>
            Chat provider: <strong>{chatProvider}</strong>
            <br />
            Integration will be rendered here.
          </p>
        ) : (
          <p>
            Chat widget not configured.
            <br />
            Set a chat provider in the UI Flow editor.
          </p>
        )}
      </div>
    </div>
  );
}
