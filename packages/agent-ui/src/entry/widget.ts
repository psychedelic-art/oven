/**
 * Standalone widget entry point.
 *
 * Usage:
 *   <script src="https://cdn.example.com/oven-chat-widget.js" defer></script>
 *   <script>
 *     window.OvenChat.init({
 *       tenantSlug: 'my-clinic',
 *       apiBaseUrl: 'https://api.example.com',
 *       theme: 'light',
 *       position: 'bottom-right',
 *     });
 *   </script>
 *
 * Or via data attributes:
 *   <script
 *     src="https://cdn.example.com/oven-chat-widget.js"
 *     data-tenant="my-clinic"
 *     data-api="https://api.example.com"
 *     data-theme="light"
 *     data-position="bottom-right"
 *     defer
 *   ></script>
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatWidget } from '../widget/ChatWidget';
import { applyTheme } from '../themes/applyTheme';
import type { ThemePresetName } from '../themes/presets';
import type { ChatWidgetProps } from '../types';

// ─── Global API ─────────────────────────────────────────────

interface OvenChatConfig {
  tenantSlug: string;
  apiBaseUrl?: string;
  agentSlug?: string;
  theme?: ThemePresetName;
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  containerId?: string;
  welcomeMessage?: string;
  placeholder?: string;
  quickReplies?: string[];
}

interface OvenChatAPI {
  init: (config: OvenChatConfig) => void;
  destroy: () => void;
}

let currentRoot: ReturnType<typeof createRoot> | null = null;
let currentContainer: HTMLElement | null = null;

function init(config: OvenChatConfig): void {
  // Destroy previous instance
  destroy();

  // Apply theme to shadow host or document
  if (config.theme) {
    applyTheme(config.theme);
  }

  // Create container
  const containerId = config.containerId ?? 'oven-chat-widget';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  // Create Shadow DOM for style isolation
  const shadow = container.attachShadow({ mode: 'open' });

  // Inject minimal reset styles into shadow
  const styleSheet = document.createElement('style');
  styleSheet.textContent = getShadowStyles();
  shadow.appendChild(styleSheet);

  // Mount point inside shadow
  const mountPoint = document.createElement('div');
  mountPoint.id = 'oven-chat-mount';
  shadow.appendChild(mountPoint);

  // Render React widget
  const props: ChatWidgetProps = {
    tenantSlug: config.tenantSlug,
    apiBaseUrl: config.apiBaseUrl,
    agentSlug: config.agentSlug,
    // ChatWidget accepts 'auto'|'light'|'dark'; map our richer ThemePresetName down.
    theme: config.theme === 'light' || config.theme === 'dark' ? config.theme : 'auto',
    position: config.position ?? 'bottom-right',
    welcomeMessage: config.welcomeMessage,
    placeholder: config.placeholder,
    quickReplies: config.quickReplies,
  };

  currentRoot = createRoot(mountPoint);
  currentRoot.render(createElement(ChatWidget, props));
  currentContainer = container;
}

function destroy(): void {
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }
  if (currentContainer) {
    currentContainer.remove();
    currentContainer = null;
  }
}

function getShadowStyles(): string {
  return `
    :host {
      all: initial;
      display: block;
    }
    #oven-chat-mount {
      font-family: var(--oven-widget-font-family, 'Inter', system-ui, sans-serif);
      color: var(--oven-widget-text, #333);
      font-size: 14px;
      line-height: 1.5;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
  `;
}

// ─── Auto-init from script data attributes ──────────────────

function autoInit(): void {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const tenant = script.getAttribute('data-tenant');
  if (!tenant) return;

  init({
    tenantSlug: tenant,
    apiBaseUrl: script.getAttribute('data-api') ?? undefined,
    agentSlug: script.getAttribute('data-agent') ?? undefined,
    theme: (script.getAttribute('data-theme') as ThemePresetName) ?? 'light',
    position: (script.getAttribute('data-position') as OvenChatConfig['position']) ?? 'bottom-right',
  });
}

// ─── Expose Global API ──────────────────────────────────────

const api: OvenChatAPI = { init, destroy };
(window as unknown as Record<string, unknown>).OvenChat = api;

// Auto-init if data attributes present
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

export { init, destroy };
export type { OvenChatConfig, OvenChatAPI };
