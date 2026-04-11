'use client';

import { useState, useEffect } from 'react';
import { cn } from '@oven/oven-ui';
import { useChat } from '../hooks/useChat';
import { useTenantConfig } from '../hooks/useTenantConfig';
import { useBusinessHours } from '../hooks/useBusinessHours';
import { MessageList } from '../shared/MessageList';
import { MessageInput } from '../shared/MessageInput';
import { WelcomeScreen } from './WelcomeScreen';
import { EscalationBanner } from './EscalationBanner';
import { WidgetLauncher } from './WidgetLauncher';
import type { ChatWidgetProps } from '../types';

const positionStyles: Record<string, string> = {
  'bottom-right': 'fixed bottom-4 right-4 z-50',
  'bottom-left': 'fixed bottom-4 left-4 z-50',
  'inline': 'relative',
};

export function ChatWidget({
  tenantSlug,
  agentSlug,
  theme = 'light',
  position = 'bottom-right',
  initialOpen = false,
  welcomeMessage,
  placeholder,
  quickReplies,
  apiBaseUrl = '',
  onEscalation,
  className,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [escalation, setEscalation] = useState<string | null>(null);
  const { config } = useTenantConfig(tenantSlug, apiBaseUrl);
  const { isOpen: isBusinessOpen } = useBusinessHours(config?.schedule);
  const chat = useChat({ tenantSlug, agentSlug, apiBaseUrl });

  const displayWelcome = welcomeMessage ?? config?.welcomeMessage ?? 'How can we help you today?';
  const isInline = position === 'inline';

  // Apply theme CSS custom properties
  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    if (config.primaryColor) root.style.setProperty('--oven-widget-primary', config.primaryColor);
    if (config.surfaceColor) root.style.setProperty('--oven-widget-surface', config.surfaceColor);
    if (config.fontFamily) root.style.setProperty('--oven-widget-font-family', config.fontFamily);
  }, [config]);

  const handleEscalation = (reason: string) => {
    setEscalation(reason);
    onEscalation?.(reason);
  };

  if (!isInline && !isOpen) {
    return (
      <div className={cn(positionStyles[position])}>
        <WidgetLauncher isOpen={false} onClick={() => setIsOpen(true)} />
      </div>
    );
  }

  return (
    <div className={cn(
      !isInline && positionStyles[position],
      className,
    )}>
      {!isInline && (
        <div className={cn('mb-2 flex justify-end')}>
          <WidgetLauncher isOpen={true} onClick={() => setIsOpen(false)} />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col bg-[var(--oven-widget-background,#FFFFFF)] border border-[var(--oven-widget-border,#E0E0E0)]',
          'rounded-[var(--oven-widget-border-radius,12px)] shadow-xl overflow-hidden',
          'w-[var(--oven-widget-max-width,400px)] h-[var(--oven-widget-max-height,600px)]',
          'font-[var(--oven-widget-font-family,Inter,system-ui,sans-serif)]',
        )}
        role="dialog"
        aria-label="Chat"
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between px-4 py-3 border-b bg-[var(--oven-widget-primary,#1976D2)] text-white')}>
          <div>
            <p className={cn('text-sm font-semibold')}>{config?.name ?? tenantSlug}</p>
            <p className={cn('text-xs opacity-80')}>
              {isBusinessOpen ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        {/* Messages */}
        {chat.messages.length === 0 && !chat.isStreaming ? (
          <WelcomeScreen
            message={displayWelcome}
            quickReplies={quickReplies}
            onQuickReply={chat.sendMessage}
            className={cn('flex-1')}
          />
        ) : (
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            showTimestamps
          />
        )}

        {/* Escalation */}
        {escalation && config?.contactInfo && (
          <EscalationBanner contactInfo={config.contactInfo} reason={escalation} />
        )}

        {/* Input */}
        <div className={cn('border-t p-3')}>
          <MessageInput
            onSend={chat.sendMessage}
            disabled={!chat.isSessionReady || chat.isStreaming}
            placeholder={placeholder ?? 'Type a message...'}
          />
        </div>
      </div>
    </div>
  );
}
