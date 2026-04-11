# Chat Module — Skill System

> Specification for the skill system in module-chat.
> Inspired by Claude Code's skill architecture.

---

## Overview

Skills are reusable prompt templates that enhance the agent's capabilities. Unlike commands (which bypass the agent), skills work *through* the agent by injecting specialized instructions into the system prompt.

## Skill Interface

```typescript
interface ChatSkill {
  name: string;
  slug: string;
  description: string;
  whenToUse: string;          // LLM instruction for auto-selection
  promptTemplate: string;     // Handlebars template
  allowedTools?: string[];    // tool subset this skill can use
  parameters?: JsonSchema;    // configurable params (exposed in UI)
  source: 'builtin' | 'custom' | 'mcp' | 'plugin';
}
```

## Built-in Skills (6)

### summarize
- **When to use**: When user asks to summarize a conversation, document, or data
- **Template**: "Analyze the following content and provide a structured summary with: key points (3-5 bullets), main conclusions, and action items if any."
- **Allowed tools**: None (operates on conversation context)

### translate
- **When to use**: When user asks to translate content between languages
- **Template**: "Translate the following content from {{sourceLanguage}} to {{targetLanguage}}. Preserve formatting and technical terms."
- **Parameters**: `{ sourceLanguage: string, targetLanguage: string }`

### extract
- **When to use**: When user asks to extract structured data from text
- **Template**: "Extract the following fields from the provided text: {{fields}}. Return as a JSON object."
- **Parameters**: `{ fields: string[] }`
- **Allowed tools**: `['ai.generateObject']`

### analyze
- **When to use**: When user provides data for analysis or asks for insights
- **Template**: "Analyze the provided data and generate: summary statistics, trends, anomalies, and actionable recommendations."
- **Allowed tools**: `['ai.generate', 'ai.generateObject']`

### faq-create
- **When to use**: When user wants to save a Q&A exchange as a knowledge base entry
- **Template**: "Based on the conversation, create a knowledge base entry with: question (concise), answer (comprehensive), keywords (5-10), and suggested category."
- **Allowed tools**: `['kb.createEntry']`

### report
- **When to use**: When user asks for a formatted report
- **Template**: "Generate a formatted report with: title, executive summary, sections with headings, data tables where applicable, and conclusions."
- **Allowed tools**: `['ai.generate']`

## Skill Loading Pipeline

```
1. Load built-in skills from skills/builtin/
   ↓
2. Load custom skills from chat_skills table (filtered by tenantId)
   ↓
3. Load MCP-provided skills from connected MCP servers
   ↓
4. Merge and deduplicate by slug (custom overrides builtin)
   ↓
5. Inject skill descriptions into system prompt for auto-selection
```

## Auto-Invocation

Skills include a `whenToUse` field that is included in the system prompt:

```
Available skills:
- summarize: Use when user asks to summarize a conversation, document, or data
- translate: Use when user asks to translate content between languages
- extract: Use when user asks to extract structured data from text
...

When a skill matches the user's intent, invoke it by calling the skill tool.
```

The LLM can automatically select the right skill based on user intent without the user typing `/skill`.

## Manual Invocation

Users can also invoke skills explicitly:
```
/skill summarize
/skill translate --target=en
```

## Database

Uses the `chat_skills` table defined in `08-chat.md` section 5.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/chat-skills` | List available skills (builtin + custom + MCP) |
| POST | `/api/chat-skills` | Create custom skill |
| GET | `/api/chat-skills/[id]` | Get skill details |
| PUT | `/api/chat-skills/[id]` | Update custom skill |
| DELETE | `/api/chat-skills/[id]` | Delete custom skill |

## Tests

```
skill-loader.test.ts — 10 tests:
  - loads built-in skills
  - loads custom skills from DB
  - loads MCP-provided skills
  - merges skills with custom overriding builtin
  - deduplicates by slug
  - formats skill descriptions for system prompt
  - resolves Handlebars template with parameters
  - validates parameter schema
  - filters skills by allowed tools
  - returns empty array when no skills available

skills/builtin/*.test.ts — 6 tests (one per built-in skill)
```
