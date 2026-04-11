import type { PromptSection } from '../types';
import { getCommandDescriptionsForPrompt } from './command-registry';
import { getSkillDescriptionsForPrompt } from './skill-loader';
import { estimateTokens } from './context-manager';

// ─── Build Prompt Section ───────────────────────────────────

export function buildPromptSection(
  name: string,
  content: string,
  priority: number,
  isStatic: boolean = true,
): PromptSection {
  return { name, content, priority, isStatic };
}

// ─── Build System Prompt ────────────────────────────────────
// Assembles the system prompt from sections in priority order.
// Sections:
//   1. Base instructions (always present)
//   2. Agent-specific instructions (from agent config)
//   3. Tenant context (business info, hours, etc.)
//   4. Command descriptions (if enabled)
//   5. Skill descriptions (if enabled)
//   6. MCP tool descriptions (if connected)
//   7. Session context (accumulated knowledge)

export async function buildSystemPrompt(options: {
  agentSystemPrompt?: string;
  tenantContext?: string;
  sessionContext?: string;
  includeCommands?: boolean;
  includeSkills?: boolean;
  mcpToolDescriptions?: string;
  tenantId?: number;
  maxTokens?: number;
}): Promise<string> {
  const sections: PromptSection[] = [];
  const maxTokens = options.maxTokens ?? 8192;

  // 1. Base instructions (priority 1 — always included)
  sections.push(buildPromptSection(
    'base',
    'You are a helpful, knowledgeable assistant. Answer clearly and concisely. If you don\'t know something, say so. Use tools when they can help answer the question.',
    1,
    true,
  ));

  // 2. Agent instructions (priority 2)
  if (options.agentSystemPrompt) {
    sections.push(buildPromptSection('agent', options.agentSystemPrompt, 2, true));
  }

  // 3. Tenant context (priority 3)
  if (options.tenantContext) {
    sections.push(buildPromptSection('tenant', `Context:\n${options.tenantContext}`, 3, true));
  }

  // 4. Commands (priority 4 — dynamic)
  if (options.includeCommands) {
    const commandText = await getCommandDescriptionsForPrompt(options.tenantId);
    if (commandText) {
      sections.push(buildPromptSection('commands', commandText, 4, false));
    }
  }

  // 5. Skills (priority 5 — dynamic)
  if (options.includeSkills) {
    const skillText = await getSkillDescriptionsForPrompt(options.tenantId);
    if (skillText) {
      sections.push(buildPromptSection('skills', skillText, 5, false));
    }
  }

  // 6. MCP tools (priority 6 — dynamic)
  if (options.mcpToolDescriptions) {
    sections.push(buildPromptSection('mcp-tools', options.mcpToolDescriptions, 6, false));
  }

  // 7. Session context (priority 7 — dynamic)
  if (options.sessionContext) {
    sections.push(buildPromptSection('session', `Previous context:\n${options.sessionContext}`, 7, false));
  }

  // Sort by priority and assemble
  sections.sort((a, b) => a.priority - b.priority);

  return assembleSections(sections, maxTokens);
}

// ─── Assemble Sections with Token Budget ────────────────────
// Includes sections in priority order, dropping lowest-priority sections
// if the budget is exceeded. Higher priority sections are always kept.

function assembleSections(sections: PromptSection[], maxTokens: number): string {
  const parts: string[] = [];
  let tokenCount = 0;

  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);
    if (tokenCount + sectionTokens > maxTokens && parts.length > 0) {
      // Budget exceeded — skip remaining sections
      break;
    }
    parts.push(section.content);
    tokenCount += sectionTokens;
  }

  return parts.join('\n\n');
}

// ─── Format MCP Tools for Prompt ────────────────────────────

export function formatMCPToolsForPrompt(
  tools: Array<{ name: string; description: string }>,
): string {
  if (tools.length === 0) return '';
  const lines = tools.map(t => `- ${t.name}: ${t.description}`);
  return `Available MCP tools:\n${lines.join('\n')}`;
}
