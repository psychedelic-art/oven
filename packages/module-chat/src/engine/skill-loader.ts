import { eq, and, isNull, or } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatSkills } from '../schema';
import type { ChatSkill } from '../types';

// ─── Resolve Skill ──────────────────────────────────────────
// Looks up skill by slug. Checks tenant-scoped first, then global.
// Returns null if not found or disabled.

export async function resolveSkill(slug: string, tenantId?: number): Promise<ChatSkill | null> {
  const db = getDb();
  const conditions = [eq(chatSkills.slug, slug)];
  if (tenantId) {
    conditions.push(or(eq(chatSkills.tenantId, tenantId), isNull(chatSkills.tenantId))!);
  }
  const rows = await db.select().from(chatSkills).where(and(...conditions)).limit(1);
  if (rows.length === 0) return null;
  const skill = rows[0] as unknown as ChatSkill;
  if (!skill.enabled) return null;
  return skill;
}

// ─── Render Skill Prompt ────────────────────────────────────
// Substitutes {{var}} placeholders in prompt template with provided params.
// Unmatched placeholders are left as-is.

export function renderSkillPrompt(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

// ─── Execute Skill ──────────────────────────────────────────
// Renders the prompt template and returns the rendered text.
// The caller (message-processor or agent-invoker) is responsible for
// sending the rendered prompt to the LLM.

export async function executeSkill(
  skill: ChatSkill,
  params: Record<string, string>,
  context: { sessionId: number },
): Promise<{ success: boolean; renderedPrompt: string; error?: string }> {
  try {
    const renderedPrompt = renderSkillPrompt(skill.promptTemplate, params);

    await eventBus.emit('chat.skill.invoked', {
      sessionId: context.sessionId,
      skill: skill.slug,
    });

    return { success: true, renderedPrompt };
  } catch (err) {
    return {
      success: false,
      renderedPrompt: '',
      error: err instanceof Error ? err.message : 'Skill execution failed',
    };
  }
}

// ─── List Skills ────────────────────────────────────────────

export async function listSkills(tenantId?: number): Promise<ChatSkill[]> {
  const db = getDb();
  const conditions = [eq(chatSkills.enabled, true)];
  if (tenantId) {
    conditions.push(or(eq(chatSkills.tenantId, tenantId), isNull(chatSkills.tenantId))!);
  }
  const rows = await db.select().from(chatSkills).where(and(...conditions)).orderBy(chatSkills.slug);
  return rows as unknown as ChatSkill[];
}

// ─── Format Skills for System Prompt ────────────────────────
// Returns a text block listing available skills for the agent's system prompt.

export async function getSkillDescriptionsForPrompt(tenantId?: number): Promise<string> {
  const skills = await listSkills(tenantId);
  if (skills.length === 0) return '';
  const lines = skills.map(s => `- /skill ${s.slug}: ${s.description}`);
  return `Available skills:\n${lines.join('\n')}`;
}
