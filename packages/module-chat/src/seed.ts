import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { chatCommands, chatSkills } from './schema';
import { eq } from 'drizzle-orm';

export async function seedChat(db: NeonHttpDatabase<Record<string, never>>) {
  // ─── Built-in Commands ──────────────────────────────────────

  const builtInCommands = [
    { name: 'Help', slug: 'help', description: 'List available commands and skills', category: 'general', handler: 'builtin:help' },
    { name: 'Clear', slug: 'clear', description: 'Clear chat message history', category: 'general', handler: 'builtin:clear' },
    { name: 'Agent', slug: 'agent', description: 'Switch or view the backing agent', category: 'agent', handler: 'builtin:agent' },
    { name: 'Tools', slug: 'tools', description: 'List tools available to the current agent', category: 'agent', handler: 'builtin:tools' },
    { name: 'Search', slug: 'search', description: 'Search the knowledge base', category: 'knowledge', handler: 'builtin:search' },
    { name: 'Mode', slug: 'mode', description: 'Switch conversation mode (concise, detailed, creative)', category: 'general', handler: 'builtin:mode' },
    { name: 'Export', slug: 'export', description: 'Export conversation as JSON, Markdown, or text', category: 'general', handler: 'builtin:export' },
    { name: 'Status', slug: 'status', description: 'Show session status and usage info', category: 'general', handler: 'builtin:status' },
    { name: 'Feedback', slug: 'feedback', description: 'Rate the last assistant response', category: 'general', handler: 'builtin:feedback' },
    { name: 'Reset', slug: 'reset', description: 'Reset session context and start fresh', category: 'general', handler: 'builtin:reset' },
    { name: 'Model', slug: 'model', description: 'Change the AI model for this session', category: 'agent', handler: 'builtin:model' },
    { name: 'Temperature', slug: 'temperature', description: 'Adjust the response temperature', category: 'agent', handler: 'builtin:temperature' },
    { name: 'Skill', slug: 'skill', description: 'List or invoke a skill', category: 'skills', handler: 'builtin:skill' },
    { name: 'MCP', slug: 'mcp', description: 'Manage MCP server connections', category: 'integrations', handler: 'builtin:mcp' },
    { name: 'Pin', slug: 'pin', description: 'Pin or unpin the current session', category: 'general', handler: 'builtin:pin' },
  ];

  for (const cmd of builtInCommands) {
    await db
      .insert(chatCommands)
      .values({ ...cmd, isBuiltIn: true, tenantId: null, enabled: true })
      .onConflictDoUpdate({
        target: [chatCommands.slug, chatCommands.tenantId],
        set: { name: cmd.name, description: cmd.description, handler: cmd.handler, category: cmd.category },
      });
  }

  // ─── Built-in Skills ────────────────────────────────────────

  const builtInSkills = [
    { name: 'Summarize', slug: 'summarize', description: 'Summarize the conversation or a specific topic', promptTemplate: 'Summarize the following in a concise way: {{input}}', source: 'built-in' as const },
    { name: 'Translate', slug: 'translate', description: 'Translate text to another language', promptTemplate: 'Translate the following to {{language}}: {{input}}', source: 'built-in' as const },
    { name: 'Extract', slug: 'extract', description: 'Extract structured data from text', promptTemplate: 'Extract the key information from the following as structured data: {{input}}', source: 'built-in' as const },
    { name: 'Analyze', slug: 'analyze', description: 'Analyze text for sentiment, themes, or insights', promptTemplate: 'Analyze the following for {{aspect}}: {{input}}', source: 'built-in' as const },
    { name: 'FAQ Create', slug: 'faq-create', description: 'Generate FAQ entries from content', promptTemplate: 'Generate frequently asked questions and answers from the following content: {{input}}', source: 'built-in' as const },
    { name: 'Report', slug: 'report', description: 'Generate a structured report from data', promptTemplate: 'Generate a structured report on {{topic}} based on the following data: {{input}}', source: 'built-in' as const },
  ];

  for (const skill of builtInSkills) {
    await db
      .insert(chatSkills)
      .values({ ...skill, isBuiltIn: true, tenantId: null, enabled: true })
      .onConflictDoUpdate({
        target: [chatSkills.slug, chatSkills.tenantId],
        set: { name: skill.name, description: skill.description, promptTemplate: skill.promptTemplate },
      });
  }
}
