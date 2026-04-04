import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { aiTools } from '../schema';

// ─── Types ───────────────────────────────────────────────────

export interface AIToolDefinition {
  name: string;
  slug: string;
  category: string;
  description: string;
  handler: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  isSystem: boolean;
}

// ─── Built-in Tool Definitions ───────────────────────────────

const BUILT_IN_TOOLS: AIToolDefinition[] = [
  {
    name: 'Embed Text',
    slug: 'ai.embed',
    category: 'embedding',
    description: 'Generate an embedding vector for a single text input',
    handler: '@oven/module-ai/tools/embed#aiEmbed',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to embed' },
        model: { type: 'string', description: 'Embedding model alias or ID (optional)' },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        embedding: { type: 'array', items: { type: 'number' }, description: 'Embedding vector' },
        tokens: { type: 'number', description: 'Tokens consumed' },
      },
    },
    isSystem: true,
  },
  {
    name: 'Embed Many',
    slug: 'ai.embedMany',
    category: 'embedding',
    description: 'Generate embedding vectors for multiple text inputs in a single batch',
    handler: '@oven/module-ai/tools/embed#aiEmbedMany',
    inputSchema: {
      type: 'object',
      properties: {
        texts: { type: 'array', items: { type: 'string' }, description: 'Texts to embed' },
        model: { type: 'string', description: 'Embedding model alias or ID (optional)' },
      },
      required: ['texts'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        embeddings: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
        tokens: { type: 'number', description: 'Total tokens consumed' },
      },
    },
    isSystem: true,
  },
  {
    name: 'Generate Text',
    slug: 'ai.generateText',
    category: 'generation',
    description: 'Generate text using an AI language model',
    handler: '@oven/module-ai/tools/generate#aiGenerateText',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'User prompt' },
        model: { type: 'string', description: 'Model alias or ID (optional)' },
        system: { type: 'string', description: 'System prompt (optional)' },
        temperature: { type: 'number', description: 'Sampling temperature 0-2 (optional)' },
        maxTokens: { type: 'number', description: 'Max output tokens (optional)' },
      },
      required: ['prompt'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        tokens: { type: 'object', properties: { input: { type: 'number' }, output: { type: 'number' }, total: { type: 'number' } } },
        costCents: { type: 'number' },
        latencyMs: { type: 'number' },
        model: { type: 'string' },
        provider: { type: 'string' },
      },
    },
    isSystem: true,
  },
  {
    name: 'Stream Text',
    slug: 'ai.streamText',
    category: 'generation',
    description: 'Stream text from an AI language model in real time',
    handler: '@oven/module-ai/tools/generate#aiStreamText',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'User prompt' },
        model: { type: 'string', description: 'Model alias or ID (optional)' },
        system: { type: 'string', description: 'System prompt (optional)' },
        temperature: { type: 'number', description: 'Sampling temperature 0-2 (optional)' },
        maxTokens: { type: 'number', description: 'Max output tokens (optional)' },
      },
      required: ['prompt'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        stream: { type: 'string', description: 'Server-Sent Events text stream' },
      },
    },
    isSystem: true,
  },
  {
    name: 'Generate Image',
    slug: 'ai.generateImage',
    category: 'generation',
    description: 'Generate an image from a text prompt',
    handler: '@oven/module-ai/tools/generate-image#aiGenerateImage',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image description prompt' },
        model: { type: 'string', description: 'Image model (default: dall-e-3)' },
        size: { type: 'string', description: 'Image size (default: 1024x1024)' },
        quality: { type: 'string', description: 'Quality: standard or hd (default: standard)' },
      },
      required: ['prompt'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Generated image URL' },
        revisedPrompt: { type: 'string', description: 'Model-revised prompt (if applicable)' },
      },
    },
    isSystem: true,
  },
  {
    name: 'Generate Object',
    slug: 'ai.generateObject',
    category: 'generation',
    description: 'Generate a structured JSON object conforming to a Zod schema',
    handler: '@oven/module-ai/tools/generate-object#aiGenerateObject',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Prompt describing the desired object' },
        schema: { type: 'object', description: 'Zod schema (passed programmatically)' },
        model: { type: 'string', description: 'Model alias or ID (optional)' },
      },
      required: ['prompt', 'schema'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        object: { type: 'object', description: 'Generated object matching the schema' },
        tokens: { type: 'object', properties: { input: { type: 'number' }, output: { type: 'number' } } },
        costCents: { type: 'number' },
        latencyMs: { type: 'number' },
      },
    },
    isSystem: true,
  },
];

// ─── Public API ──────────────────────────────────────────────

/**
 * Get all built-in AI tool definitions.
 */
export function getBuiltInTools(): AIToolDefinition[] {
  return [...BUILT_IN_TOOLS];
}

/**
 * Get all AI tools: built-in + custom tools from the database.
 */
export async function getAllTools(): Promise<AIToolDefinition[]> {
  const db = getDb();

  const dbTools = await db
    .select()
    .from(aiTools)
    .where(eq(aiTools.enabled, true));

  const customTools: AIToolDefinition[] = dbTools.map((t) => ({
    name: t.name,
    slug: t.slug,
    category: t.category ?? 'custom',
    description: t.description ?? '',
    handler: t.handler ?? '',
    inputSchema: (t.inputSchema as Record<string, unknown>) ?? {},
    outputSchema: (t.outputSchema as Record<string, unknown>) ?? {},
    isSystem: t.isSystem,
  }));

  // Merge: built-in tools first, then custom (no duplicates by slug)
  const slugSet = new Set(BUILT_IN_TOOLS.map((t) => t.slug));
  const deduped = customTools.filter((t) => !slugSet.has(t.slug));

  return [...BUILT_IN_TOOLS, ...deduped];
}

/**
 * Get a specific tool by slug.
 */
export async function getToolBySlug(slug: string): Promise<AIToolDefinition | null> {
  // Check built-in first
  const builtIn = BUILT_IN_TOOLS.find((t) => t.slug === slug);
  if (builtIn) return builtIn;

  // Check DB
  const db = getDb();
  const [row] = await db
    .select()
    .from(aiTools)
    .where(eq(aiTools.slug, slug))
    .limit(1);

  if (!row) return null;

  return {
    name: row.name,
    slug: row.slug,
    category: row.category ?? 'custom',
    description: row.description ?? '',
    handler: row.handler ?? '',
    inputSchema: (row.inputSchema as Record<string, unknown>) ?? {},
    outputSchema: (row.outputSchema as Record<string, unknown>) ?? {},
    isSystem: row.isSystem,
  };
}
