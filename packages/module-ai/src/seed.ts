import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { permissions } from '@oven/module-roles/schema';
import {
  aiProviders,
  aiTools,
  aiModelAliases,
  aiVectorStores,
} from './schema';
import { encrypt } from './engine/encryption';

export async function seedAI() {
  const db = getDb();

  // ─── Permissions ────────────────────────────────────────────

  const modulePermissions = [
    { resource: 'ai-providers', action: 'read', slug: 'ai-providers.read', description: 'View AI providers' },
    { resource: 'ai-providers', action: 'create', slug: 'ai-providers.create', description: 'Create AI providers' },
    { resource: 'ai-providers', action: 'update', slug: 'ai-providers.update', description: 'Edit AI providers' },
    { resource: 'ai-providers', action: 'delete', slug: 'ai-providers.delete', description: 'Delete AI providers' },
    { resource: 'ai-aliases', action: 'read', slug: 'ai-aliases.read', description: 'View model aliases' },
    { resource: 'ai-aliases', action: 'create', slug: 'ai-aliases.create', description: 'Create model aliases' },
    { resource: 'ai-aliases', action: 'update', slug: 'ai-aliases.update', description: 'Edit model aliases' },
    { resource: 'ai-aliases', action: 'delete', slug: 'ai-aliases.delete', description: 'Delete model aliases' },
    { resource: 'ai-vector-stores', action: 'read', slug: 'ai-vector-stores.read', description: 'View vector stores' },
    { resource: 'ai-vector-stores', action: 'create', slug: 'ai-vector-stores.create', description: 'Create vector stores' },
    { resource: 'ai-vector-stores', action: 'update', slug: 'ai-vector-stores.update', description: 'Edit vector stores' },
    { resource: 'ai-vector-stores', action: 'delete', slug: 'ai-vector-stores.delete', description: 'Delete vector stores' },
    { resource: 'ai-usage-logs', action: 'read', slug: 'ai-usage-logs.read', description: 'View AI usage logs' },
    { resource: 'ai-budgets', action: 'read', slug: 'ai-budgets.read', description: 'View AI budgets' },
    { resource: 'ai-budgets', action: 'create', slug: 'ai-budgets.create', description: 'Create AI budgets' },
    { resource: 'ai-budgets', action: 'update', slug: 'ai-budgets.update', description: 'Edit AI budgets' },
    { resource: 'ai-budgets', action: 'delete', slug: 'ai-budgets.delete', description: 'Delete AI budgets' },
    { resource: 'ai-budget-alerts', action: 'read', slug: 'ai-budget-alerts.read', description: 'View AI budget alerts' },
    { resource: 'ai-tools', action: 'read', slug: 'ai-tools.read', description: 'View AI tools' },
    { resource: 'ai-guardrails', action: 'read', slug: 'ai-guardrails.read', description: 'View AI guardrails' },
    { resource: 'ai-guardrails', action: 'create', slug: 'ai-guardrails.create', description: 'Create AI guardrails' },
    { resource: 'ai-guardrails', action: 'update', slug: 'ai-guardrails.update', description: 'Edit AI guardrails' },
    { resource: 'ai-guardrails', action: 'delete', slug: 'ai-guardrails.delete', description: 'Delete AI guardrails' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing({ target: permissions.slug });
  }

  // ─── Built-in AI Tools (idempotent) ─────────────────────────

  const builtInTools = [
    {
      name: 'Embed Text',
      slug: 'ai.embed',
      category: 'embeddings',
      description: 'Generate an embedding vector for a single text input',
      handler: 'tools/embed#embed',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to embed' },
          model: { type: 'string', description: 'Embedding model (optional)' },
        },
        required: ['text'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          embedding: { type: 'array', items: { type: 'number' }, description: 'Vector representation' },
          tokens: { type: 'number', description: 'Tokens consumed' },
          model: { type: 'string', description: 'Model used' },
        },
      },
    },
    {
      name: 'Embed Many',
      slug: 'ai.embedMany',
      category: 'embeddings',
      description: 'Generate embedding vectors for multiple text inputs in a single batch',
      handler: 'tools/embed#embedMany',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          texts: { type: 'array', items: { type: 'string' }, description: 'Array of texts to embed' },
          model: { type: 'string', description: 'Embedding model (optional)' },
        },
        required: ['texts'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          embeddings: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
          tokens: { type: 'number' },
        },
      },
    },
    {
      name: 'Generate Text',
      slug: 'ai.generateText',
      category: 'generation',
      description: 'Generate text from a prompt using an LLM',
      handler: 'tools/generate#generateText',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'User prompt' },
          system: { type: 'string', description: 'System prompt (optional)' },
          model: { type: 'string', description: 'Model alias or ID (optional)' },
          temperature: { type: 'number', description: 'Sampling temperature 0-2 (optional)' },
          maxTokens: { type: 'number', description: 'Max output tokens (optional)' },
        },
        required: ['prompt'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Generated text' },
          tokens: { type: 'object', properties: { input: { type: 'number' }, output: { type: 'number' }, total: { type: 'number' } } },
          costCents: { type: 'number', description: 'Cost in cents' },
          model: { type: 'string' },
        },
      },
    },
    {
      name: 'Stream Text',
      slug: 'ai.streamText',
      category: 'generation',
      description: 'Stream text generation from a prompt using an LLM',
      handler: 'tools/generate#streamText',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'User prompt' },
          system: { type: 'string', description: 'System prompt (optional)' },
          model: { type: 'string', description: 'Model alias or ID (optional)' },
          temperature: { type: 'number' },
          maxTokens: { type: 'number' },
        },
        required: ['prompt'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          stream: { type: 'string', description: 'Server-Sent Events stream (text/event-stream)' },
        },
      },
    },
    {
      name: 'Generate Image',
      slug: 'ai.generateImage',
      category: 'generation',
      description: 'Generate an image from a text prompt',
      handler: 'tools/generate-image#generateImage',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image description' },
          model: { type: 'string', description: 'Image model (dall-e-3, dall-e-2)' },
          size: { type: 'string', enum: ['256x256', '512x512', '1024x1024', '1792x1024'], description: 'Image size' },
          quality: { type: 'string', enum: ['standard', 'hd'], description: 'Image quality' },
        },
        required: ['prompt'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Generated image URL' },
          revisedPrompt: { type: 'string', description: 'Revised prompt (if model modified it)' },
        },
      },
    },
    {
      name: 'Generate Object',
      slug: 'ai.generateObject',
      category: 'generation',
      description: 'Generate a structured JSON object from a prompt and schema',
      handler: 'tools/generate-object#generateObject',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Instructions for object generation' },
          schema: { type: 'object', description: 'JSON Schema defining the output structure' },
          model: { type: 'string', description: 'Model alias or ID (optional)' },
        },
        required: ['prompt', 'schema'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          object: { type: 'object', description: 'Generated object matching the provided schema' },
          tokens: { type: 'object', properties: { input: { type: 'number' }, output: { type: 'number' } } },
        },
      },
    },
    // ─── Multimodal Tools ──────────────────────────────────────
    {
      name: 'Generate Text with Images (Vision)',
      slug: 'ai.generateTextWithImages',
      category: 'vision',
      description: 'Generate text from a prompt with image inputs. Supports all vision-capable models (GPT-4o, Claude, Gemini).',
      handler: 'tools/generate-multimodal#generateTextWithImages',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          messages: { type: 'array', description: 'Messages with text and/or image content. Each item: { role, content: [{ type: "text", text } | { type: "image", image: "base64 or URL" }] }' },
          system: { type: 'string', description: 'System prompt (optional)' },
          model: { type: 'string', description: 'Model alias or ID (optional, must support vision)' },
          temperature: { type: 'number', description: 'Sampling temperature 0-2' },
          maxTokens: { type: 'number', description: 'Max output tokens' },
        },
        required: ['messages'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Generated response text' },
          tokens: { type: 'object', properties: { input: { type: 'number' }, output: { type: 'number' }, total: { type: 'number' } } },
          costCents: { type: 'number' },
          model: { type: 'string' },
          provider: { type: 'string' },
        },
      },
    },
    {
      name: 'Describe Video',
      slug: 'ai.describeVideo',
      category: 'vision',
      description: 'Analyze and describe video content. Pass a video URL to get a text description. Supports GPT-4o and Gemini.',
      handler: 'tools/generate-multimodal#describeVideo',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          videoUrl: { type: 'string', description: 'URL to the video file' },
          prompt: { type: 'string', description: 'Instructions for what to describe (optional)' },
          model: { type: 'string', description: 'Model alias or ID (optional)' },
        },
        required: ['videoUrl'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Video description' },
          tokens: { type: 'object', properties: { input: { type: 'number' }, output: { type: 'number' }, total: { type: 'number' } } },
          model: { type: 'string' },
        },
      },
    },
    {
      name: 'Transcribe Audio (Speech-to-Text)',
      slug: 'ai.transcribeAudio',
      category: 'audio',
      description: 'Convert audio to text using Whisper or GPT-4o transcription. Returns text with timestamp segments.',
      handler: 'tools/transcribe#transcribeAudio',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          audio: { type: 'string', description: 'Audio file as base64 data URL or HTTP URL. Supports mp3, wav, m4a, flac, webm.' },
          model: { type: 'string', description: 'Model (default: whisper-1). Options: whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe' },
          language: { type: 'string', description: 'ISO-639-1 language code (optional, e.g., "en", "es")' },
        },
        required: ['audio'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Full transcription text' },
          segments: { type: 'array', description: 'Timestamped segments: [{ text, startSecond, endSecond }]' },
          language: { type: 'string', description: 'Detected language' },
          durationInSeconds: { type: 'number' },
        },
      },
    },
    {
      name: 'Generate Speech (Text-to-Speech)',
      slug: 'ai.generateSpeech',
      category: 'audio',
      description: 'Convert text to spoken audio. Returns an audio file URL. OpenAI voices: alloy, echo, fable, onyx, nova, shimmer.',
      handler: 'tools/speech#generateSpeech',
      isSystem: true,
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to convert to speech' },
          voice: { type: 'string', description: 'Voice: alloy, echo, fable, onyx, nova, shimmer (default: alloy)' },
          model: { type: 'string', description: 'Model: tts-1 (fast) or tts-1-hd (high quality). Default: tts-1' },
          outputFormat: { type: 'string', description: 'Format: mp3 or wav (default: mp3)' },
          speed: { type: 'number', description: 'Speed: 0.25 to 4.0 (default: 1.0)' },
        },
        required: ['text'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          audioUrl: { type: 'string', description: 'URL to the generated audio file' },
          format: { type: 'string', description: 'Audio format (mp3 or wav)' },
        },
      },
    },
  ];

  for (const tool of builtInTools) {
    await db.insert(aiTools).values(tool).onConflictDoUpdate({
      target: aiTools.slug,
      set: {
        name: tool.name,
        category: tool.category,
        description: tool.description,
        handler: tool.handler,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        updatedAt: new Date(),
      },
    });
  }

  // ─── Default AI Providers (no API keys — configure via dashboard) ──

  // If env vars are set, encrypt and store them in DB so dashboard works without .env
  const openaiKey = process.env.OPENAI_API_KEY ? encrypt(process.env.OPENAI_API_KEY) : null;
  const anthropicKey = process.env.ANTHROPIC_API_KEY ? encrypt(process.env.ANTHROPIC_API_KEY) : null;
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ? encrypt(process.env.GOOGLE_GENERATIVE_AI_API_KEY) : null;

  const providerSeeds = [
    {
      name: 'OpenAI',
      slug: 'openai',
      type: 'openai',
      defaultModel: 'gpt-4o-mini',
      apiKeyEncrypted: openaiKey,
      rateLimitRpm: 500,
      rateLimitTpm: 200000,
      enabled: true,
      metadata: { website: 'https://openai.com', docsUrl: 'https://platform.openai.com/docs' },
    },
    {
      name: 'Anthropic',
      slug: 'anthropic',
      type: 'anthropic',
      defaultModel: 'claude-sonnet-4-20250514',
      apiKeyEncrypted: anthropicKey,
      rateLimitRpm: 300,
      rateLimitTpm: 100000,
      enabled: true,
      metadata: { website: 'https://anthropic.com', docsUrl: 'https://docs.anthropic.com' },
    },
    {
      name: 'Google AI',
      slug: 'google',
      type: 'google',
      defaultModel: 'gemini-2.0-flash',
      apiKeyEncrypted: googleKey,
      rateLimitRpm: 300,
      rateLimitTpm: 100000,
      enabled: true,
      metadata: { website: 'https://ai.google.dev', docsUrl: 'https://ai.google.dev/docs' },
    },
  ];

  for (const provider of providerSeeds) {
    await db.insert(aiProviders).values(provider).onConflictDoNothing({ target: aiProviders.slug });
  }

  // Resolve provider IDs for alias linking
  const [openaiRow] = await db.select({ id: aiProviders.id }).from(aiProviders).where(eq(aiProviders.slug, 'openai')).limit(1);
  const [anthropicRow] = await db.select({ id: aiProviders.id }).from(aiProviders).where(eq(aiProviders.slug, 'anthropic')).limit(1);
  const [googleRow] = await db.select({ id: aiProviders.id }).from(aiProviders).where(eq(aiProviders.slug, 'google')).limit(1);

  // ─── Default Model Aliases (linked to seeded providers) ─────
  // Uses onConflictDoUpdate to fix stale provider_id and add parametersSchema

  const textParamsSchema = {
    temperature: { type: 'number', label: 'Temperature', description: 'Controls randomness. Lower = more deterministic.', min: 0, max: 2, step: 0.1, default: 0.7 },
    maxTokens: { type: 'integer', label: 'Max Tokens', description: 'Maximum output length in tokens.', min: 1, max: 128000, default: 2048 },
    topP: { type: 'number', label: 'Top P', description: 'Nucleus sampling threshold.', min: 0, max: 1, step: 0.01, default: 1 },
  };

  const imageParamsSchema = {
    size: { type: 'select', label: 'Size', description: 'Output image dimensions.', options: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'], default: '1024x1024' },
    quality: { type: 'select', label: 'Quality', description: 'Image quality level.', options: ['standard', 'hd'], default: 'standard' },
  };

  const imageParamsSchemaBasic = {
    size: { type: 'select', label: 'Size', description: 'Output image dimensions.', options: ['256x256', '512x512', '1024x1024'], default: '1024x1024' },
  };

  const embeddingParamsSchema = {
    dimensions: { type: 'integer', label: 'Dimensions', description: 'Output vector dimensions (if model supports it).', min: 256, max: 3072, default: 1536 },
  };

  const aliasSeeds = [
    {
      alias: 'fast',
      providerId: openaiRow.id,
      modelId: 'gpt-4o-mini',
      type: 'text',
      defaultSettings: { temperature: 0.7, maxTokens: 2048 },
      parametersSchema: textParamsSchema,
    },
    {
      alias: 'smart',
      providerId: openaiRow.id,
      modelId: 'gpt-4o',
      type: 'text',
      defaultSettings: { temperature: 0.7, maxTokens: 4096 },
      parametersSchema: textParamsSchema,
    },
    {
      alias: 'embed',
      providerId: openaiRow.id,
      modelId: 'text-embedding-3-small',
      type: 'embedding',
      defaultSettings: {},
      parametersSchema: embeddingParamsSchema,
    },
    {
      alias: 'claude',
      providerId: anthropicRow.id,
      modelId: 'claude-sonnet-4-20250514',
      type: 'text',
      defaultSettings: { temperature: 0.7, maxTokens: 4096 },
      parametersSchema: textParamsSchema,
    },
    {
      alias: 'gemini',
      providerId: googleRow.id,
      modelId: 'gemini-2.0-flash',
      type: 'text',
      defaultSettings: { temperature: 0.7, maxTokens: 4096 },
      parametersSchema: textParamsSchema,
    },
    // Image aliases
    {
      alias: 'dalle3',
      providerId: openaiRow.id,
      modelId: 'dall-e-3',
      type: 'image',
      defaultSettings: { size: '1024x1024', quality: 'standard' },
      parametersSchema: imageParamsSchema,
    },
    {
      alias: 'dalle2',
      providerId: openaiRow.id,
      modelId: 'dall-e-2',
      type: 'image',
      defaultSettings: { size: '1024x1024' },
      parametersSchema: imageParamsSchemaBasic,
    },
    // Audio aliases
    {
      alias: 'whisper',
      providerId: openaiRow.id,
      modelId: 'whisper-1',
      type: 'audio',
      defaultSettings: {},
      parametersSchema: {
        language: { type: 'string', label: 'Language', description: 'ISO-639-1 code (e.g., en, es). Auto-detected if omitted.', default: '' },
      },
    },
    {
      alias: 'tts',
      providerId: openaiRow.id,
      modelId: 'tts-1',
      type: 'audio',
      defaultSettings: { voice: 'alloy', speed: 1.0, outputFormat: 'mp3' },
      parametersSchema: {
        voice: { type: 'select', label: 'Voice', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], default: 'alloy', description: 'Speaker voice' },
        speed: { type: 'number', label: 'Speed', min: 0.25, max: 4, step: 0.25, default: 1.0, description: 'Playback speed' },
        outputFormat: { type: 'select', label: 'Format', options: ['mp3', 'wav'], default: 'mp3', description: 'Audio format' },
      },
    },
    {
      alias: 'tts-hd',
      providerId: openaiRow.id,
      modelId: 'tts-1-hd',
      type: 'audio',
      defaultSettings: { voice: 'alloy', speed: 1.0, outputFormat: 'mp3' },
      parametersSchema: {
        voice: { type: 'select', label: 'Voice', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], default: 'alloy', description: 'High quality voice' },
        speed: { type: 'number', label: 'Speed', min: 0.25, max: 4, step: 0.25, default: 1.0, description: 'Playback speed' },
        outputFormat: { type: 'select', label: 'Format', options: ['mp3', 'wav'], default: 'mp3', description: 'Audio format' },
      },
    },
  ];

  for (const alias of aliasSeeds) {
    await db.insert(aiModelAliases).values(alias)
      .onConflictDoUpdate({
        target: aiModelAliases.alias,
        set: {
          providerId: alias.providerId,
          modelId: alias.modelId,
          type: alias.type,
          defaultSettings: alias.defaultSettings,
          parametersSchema: alias.parametersSchema,
          updatedAt: new Date(),
        },
      });
  }

  // ─── Default Vector Store (pgvector, global) ────────────────

  await db.insert(aiVectorStores).values({
    tenantId: 0,
    name: 'Default pgvector Store',
    slug: 'default-pgvector',
    adapter: 'pgvector',
    connectionConfig: {},
    embeddingModel: 'text-embedding-3-small',
    dimensions: 1536,
    distanceMetric: 'cosine',
    enabled: true,
    metadata: { description: 'Built-in pgvector store using the application database' },
  }).onConflictDoNothing({ target: [aiVectorStores.tenantId, aiVectorStores.slug] });
}
