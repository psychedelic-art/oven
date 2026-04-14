import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { chatSchema } from './schema';
import { seedChat } from './seed';
import * as chatSessionsHandler from './api/chat-sessions.handler';
import * as chatSessionsByIdHandler from './api/chat-sessions-by-id.handler';
import * as chatSessionsMessagesHandler from './api/chat-sessions-messages.handler';
import * as chatSessionsExportHandler from './api/chat-sessions-export.handler';
import * as chatActionsHandler from './api/chat-actions.handler';
import * as chatFeedbackHandler from './api/chat-feedback.handler';
import * as chatCommandsHandler from './api/chat-commands.handler';
import * as chatCommandsByIdHandler from './api/chat-commands-by-id.handler';
import * as chatSkillsHandler from './api/chat-skills.handler';
import * as chatSkillsByIdHandler from './api/chat-skills-by-id.handler';
import * as chatHooksHandler from './api/chat-hooks.handler';
import * as chatHooksByIdHandler from './api/chat-hooks-by-id.handler';
import * as chatMcpConnectionsHandler from './api/chat-mcp-connections.handler';
import * as chatMcpConnectionsByIdHandler from './api/chat-mcp-connections-by-id.handler';
import * as chatCapabilitiesHandler from './api/chat-capabilities.handler';

// ─── Event Schemas ──────────────────────────────────────────

const eventSchemas: EventSchemaMap = {
  'chat.session.created': { id: { type: 'number', required: true }, tenantId: { type: 'number' }, agentId: { type: 'number' }, userId: { type: 'number' }, channel: { type: 'string' } },
  'chat.session.archived': { id: { type: 'number', required: true }, tenantId: { type: 'number' }, agentId: { type: 'number' } },
  'chat.session.closed': { id: { type: 'number', required: true }, tenantId: { type: 'number' } },
  'chat.message.sent': { id: { type: 'number', required: true }, sessionId: { type: 'number', required: true }, role: { type: 'string' } },
  'chat.message.streamed': { sessionId: { type: 'number', required: true }, tokensUsed: { type: 'number' } },
  'chat.command.executed': { sessionId: { type: 'number', required: true }, command: { type: 'string', required: true }, success: { type: 'boolean' } },
  'chat.skill.invoked': { sessionId: { type: 'number', required: true }, skill: { type: 'string', required: true } },
  'chat.hook.executed': { sessionId: { type: 'number', required: true }, hookId: { type: 'number' }, event: { type: 'string' }, result: { type: 'string' } },
  'chat.mcp.connected': { connectionId: { type: 'number', required: true }, tenantId: { type: 'number' }, name: { type: 'string' } },
  'chat.mcp.disconnected': { connectionId: { type: 'number', required: true }, tenantId: { type: 'number' } },
  'chat.feedback.submitted': { sessionId: { type: 'number', required: true }, messageId: { type: 'number', required: true }, rating: { type: 'string' } },
  'chat.escalation.triggered': { sessionId: { type: 'number', required: true }, reason: { type: 'string' } },
};

// ─── Module Definition ──────────────────────────────────────

export const chatModule: ModuleDefinition = {
  name: 'chat',
  dependencies: ['agent-core', 'ai'],
  description: 'Conversational interface with commands, skills, hooks, MCP integration, and streaming. Delegates reasoning to agent-core.',
  capabilities: [
    'manage chat sessions',
    'send and receive messages',
    'execute slash commands',
    'invoke skills',
    'connect MCP servers',
    'collect user feedback',
    'stream responses via SSE',
  ],
  schema: chatSchema,
  seed: seedChat,
  resources: [
    { name: 'chat-sessions', options: { label: 'Chat Sessions' } },
    { name: 'chat-commands', options: { label: 'Chat Commands' } },
    { name: 'chat-skills', options: { label: 'Chat Skills' } },
    { name: 'chat-hooks', options: { label: 'Chat Hooks' } },
    { name: 'chat-mcp-connections', options: { label: 'MCP Connections' } },
    { name: 'chat-feedback', options: { label: 'Chat Feedback' } },
  ],
  menuItems: [
    { label: 'Chat Sessions', to: '/chat-sessions' },
    { label: 'Commands', to: '/chat-commands' },
    { label: 'Skills', to: '/chat-skills' },
    { label: 'Hooks', to: '/chat-hooks' },
    { label: 'MCP Connections', to: '/chat-mcp-connections' },
    { label: 'Feedback', to: '/chat-feedback' },
  ],
  apiHandlers: {
    'chat-sessions': { GET: chatSessionsHandler.GET, POST: chatSessionsHandler.POST },
    'chat-sessions/[id]': { GET: chatSessionsByIdHandler.GET, PUT: chatSessionsByIdHandler.PUT, DELETE: chatSessionsByIdHandler.DELETE },
    'chat-sessions/[id]/messages': { GET: chatSessionsMessagesHandler.GET, POST: chatSessionsMessagesHandler.POST },
    'chat-sessions/[id]/export': { GET: chatSessionsExportHandler.GET },
    'chat-actions': { GET: chatActionsHandler.GET },
    'chat-feedback': { GET: chatFeedbackHandler.GET, POST: chatFeedbackHandler.POST },
    'chat-commands': { GET: chatCommandsHandler.GET, POST: chatCommandsHandler.POST },
    'chat-commands/[id]': { GET: chatCommandsByIdHandler.GET, PUT: chatCommandsByIdHandler.PUT, DELETE: chatCommandsByIdHandler.DELETE },
    'chat-skills': { GET: chatSkillsHandler.GET, POST: chatSkillsHandler.POST },
    'chat-skills/[id]': { GET: chatSkillsByIdHandler.GET, PUT: chatSkillsByIdHandler.PUT, DELETE: chatSkillsByIdHandler.DELETE },
    'chat-hooks': { GET: chatHooksHandler.GET, POST: chatHooksHandler.POST },
    'chat-hooks/[id]': { GET: chatHooksByIdHandler.GET, PUT: chatHooksByIdHandler.PUT, DELETE: chatHooksByIdHandler.DELETE },
    'chat-mcp-connections': { GET: chatMcpConnectionsHandler.GET, POST: chatMcpConnectionsHandler.POST },
    'chat-mcp-connections/[id]': { GET: chatMcpConnectionsByIdHandler.GET, PUT: chatMcpConnectionsByIdHandler.PUT, DELETE: chatMcpConnectionsByIdHandler.DELETE },
    'chat-capabilities': { GET: chatCapabilitiesHandler.GET },
  },
  configSchema: [
    { key: 'CHAT_DEFAULT_AGENT', type: 'string', description: 'Default agent slug for new chat sessions', defaultValue: '', instanceScoped: true },
    { key: 'CHAT_SESSION_TTL_HOURS', type: 'number', description: 'Anonymous session TTL in hours', defaultValue: 24, instanceScoped: false },
    { key: 'CHAT_MAX_MESSAGE_LENGTH', type: 'number', description: 'Maximum message character length', defaultValue: 10000, instanceScoped: false },
    { key: 'CHAT_RATE_LIMIT_RPM', type: 'number', description: 'Rate limit: messages per minute per session', defaultValue: 30, instanceScoped: true },
    { key: 'CHAT_PROMPT_MAX_TOKENS', type: 'number', description: 'Maximum tokens for system prompt assembly', defaultValue: 8192, instanceScoped: false },
    { key: 'CHAT_CONTEXT_WINDOW_MESSAGES', type: 'number', description: 'Number of recent messages included in context', defaultValue: 50, instanceScoped: true },
    { key: 'CHAT_ENABLE_COMMANDS', type: 'boolean', description: 'Enable slash commands in chat', defaultValue: true, instanceScoped: true },
    { key: 'CHAT_ENABLE_SKILLS', type: 'boolean', description: 'Enable skill invocation in chat', defaultValue: true, instanceScoped: true },
    { key: 'CHAT_ENABLE_MCP', type: 'boolean', description: 'Enable MCP server connections', defaultValue: false, instanceScoped: true },
  ],
  events: eventSchemas,
};

// ─── Re-exports ─────────────────────────────────────────────

export { chatSchema } from './schema';
export { createSession, resumeSession, archiveSession, validateSessionAccess } from './engine/session-manager';
export { recordUserMessage, recordAssistantMessage, recordToolAction, isCommand, parseCommandInput, processMessage } from './engine/message-processor';
export { formatSSEEvent, createSSEStream, createSSEResponse } from './engine/streaming-handler';
export { resolveCommand, executeCommand, listCommands, getCommandDescriptionsForPrompt } from './engine/command-registry';
export { resolveSkill, renderSkillPrompt, executeSkill, listSkills, getSkillDescriptionsForPrompt } from './engine/skill-loader';
export { loadHooks, executeHooks } from './engine/hook-manager';
export type { HookResult, HookContext } from './engine/hook-manager';
export { getRecentMessages, estimateTokens, truncateToTokenBudget, buildContextMessages, extractTextFromContent, dbMessagesToHistory } from './engine/context-manager';
export { buildSystemPrompt, buildPromptSection, formatMCPToolsForPrompt } from './engine/prompt-builder';
export { getDiscoveredTools, bridgeToolsForAgent, executeMCPTool, getConnectionStatus, getMCPToolDescriptions } from './engine/mcp-connector';
export type { MCPTool, MCPToolSpec, MCPExecutionResult } from './engine/mcp-connector';
export type * from './types';
