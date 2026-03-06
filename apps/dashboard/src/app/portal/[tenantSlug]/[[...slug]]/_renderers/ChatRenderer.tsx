interface ChatRendererProps {
  title: string;
  welcomeMessage?: string;
  chatProvider?: string;
}

/**
 * Renders a chat page.
 * Currently shows a placeholder — integrations like agent-ui, intercom,
 * or custom widgets can be wired up via the chatProvider field.
 */
export default function ChatRenderer({
  title,
  welcomeMessage,
  chatProvider,
}: ChatRendererProps) {
  return (
    <div className="portal-chat">
      <h2 className="portal-page-title">{title}</h2>
      {welcomeMessage && <p className="chat-welcome">{welcomeMessage}</p>}
      <div className="chat-placeholder">
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
