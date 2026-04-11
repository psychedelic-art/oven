import { sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { permissions } from '@oven/module-roles/schema';
import {
  serviceCategories,
  services,
  providers,
  providerServices,
  billingPlans,
  planQuotas,
} from './schema';

/**
 * Idempotent seed. Safe to run repeatedly. Never deletes or truncates.
 * Uses ON CONFLICT … DO UPDATE so every row is returned (new or existing).
 */
export async function seedSubscriptions() {
  const db: any = getDb();

  // ─── 1. Permissions ─────────────────────────────────────────
  const modulePermissions = [
    { resource: 'service-categories', action: 'read', slug: 'service-categories.read', description: 'View service categories' },
    { resource: 'service-categories', action: 'create', slug: 'service-categories.create', description: 'Create service categories' },
    { resource: 'service-categories', action: 'update', slug: 'service-categories.update', description: 'Edit service categories' },
    { resource: 'service-categories', action: 'delete', slug: 'service-categories.delete', description: 'Delete service categories' },
    { resource: 'services', action: 'read', slug: 'services.read', description: 'View services' },
    { resource: 'services', action: 'create', slug: 'services.create', description: 'Create services' },
    { resource: 'services', action: 'update', slug: 'services.update', description: 'Edit services' },
    { resource: 'services', action: 'delete', slug: 'services.delete', description: 'Delete services' },
    { resource: 'providers', action: 'read', slug: 'providers.read', description: 'View providers' },
    { resource: 'providers', action: 'create', slug: 'providers.create', description: 'Create providers' },
    { resource: 'providers', action: 'update', slug: 'providers.update', description: 'Edit providers' },
    { resource: 'providers', action: 'delete', slug: 'providers.delete', description: 'Delete providers' },
    { resource: 'provider-services', action: 'read', slug: 'provider-services.read', description: 'View provider-service mappings' },
    { resource: 'provider-services', action: 'create', slug: 'provider-services.create', description: 'Create provider-service mappings' },
    { resource: 'provider-services', action: 'update', slug: 'provider-services.update', description: 'Edit provider-service mappings' },
    { resource: 'provider-services', action: 'delete', slug: 'provider-services.delete', description: 'Delete provider-service mappings' },
    { resource: 'billing-plans', action: 'read', slug: 'billing-plans.read', description: 'View billing plans' },
    { resource: 'billing-plans', action: 'create', slug: 'billing-plans.create', description: 'Create billing plans' },
    { resource: 'billing-plans', action: 'update', slug: 'billing-plans.update', description: 'Edit billing plans' },
    { resource: 'billing-plans', action: 'delete', slug: 'billing-plans.delete', description: 'Delete billing plans' },
    { resource: 'tenant-subscriptions', action: 'read', slug: 'tenant-subscriptions.read', description: 'View tenant subscriptions' },
    { resource: 'tenant-subscriptions', action: 'create', slug: 'tenant-subscriptions.create', description: 'Create tenant subscriptions' },
    { resource: 'tenant-subscriptions', action: 'update', slug: 'tenant-subscriptions.update', description: 'Edit tenant subscriptions' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing({ target: permissions.slug });
  }

  // ─── 2. Categories (upsert by slug) ─────────────────────────
  const categoryRows = await db
    .insert(serviceCategories)
    .values([
      { name: 'Messaging', slug: 'messaging', icon: 'Chat', order: 1 },
      { name: 'AI', slug: 'ai', icon: 'Psychology', order: 2 },
      { name: 'Storage', slug: 'storage', icon: 'CloudUpload', order: 3 },
    ])
    .onConflictDoUpdate({
      target: serviceCategories.slug,
      set: {
        name: sql`excluded.name`,
        order: sql`excluded."order"`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  const catBySlug = new Map<string, { id: number }>(
    (categoryRows as Array<{ id: number; slug: string }>).map((c) => [c.slug, c]),
  );
  const messaging = catBySlug.get('messaging')!;
  const ai = catBySlug.get('ai')!;
  const storage = catBySlug.get('storage')!;

  // ─── 3. Services (upsert by slug) ───────────────────────────
  const serviceRows = await db
    .insert(services)
    .values([
      { categoryId: messaging.id, name: 'WhatsApp', slug: 'whatsapp', unit: 'messages' },
      { categoryId: messaging.id, name: 'SMS', slug: 'sms', unit: 'messages' },
      { categoryId: messaging.id, name: 'Email', slug: 'email', unit: 'messages' },
      { categoryId: messaging.id, name: 'Web Chat', slug: 'web-chat', unit: 'messages' },
      { categoryId: ai.id, name: 'AI Chat', slug: 'ai-chat', unit: 'tokens' },
      { categoryId: storage.id, name: 'File Storage', slug: 'file-storage', unit: 'gb' },
      { categoryId: ai.id, name: 'LLM Prompt Tokens', slug: 'llm-prompt-tokens', unit: 'tokens' },
      { categoryId: ai.id, name: 'LLM Completion Tokens', slug: 'llm-completion-tokens', unit: 'tokens' },
      { categoryId: ai.id, name: 'AI Embeddings', slug: 'ai-embeddings', unit: 'vectors' },
      { categoryId: ai.id, name: 'AI Image Generation', slug: 'ai-image-generation', unit: 'images' },
      { categoryId: ai.id, name: 'AI Vector Queries', slug: 'ai-vector-queries', unit: 'queries' },
      { categoryId: ai.id, name: 'AI Agent Executions', slug: 'ai-agent-executions', unit: 'executions' },
    ])
    .onConflictDoUpdate({
      target: services.slug,
      set: {
        name: sql`excluded.name`,
        categoryId: sql`excluded.category_id`,
        unit: sql`excluded.unit`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  const svcBySlug = new Map<string, { id: number }>(
    (serviceRows as Array<{ id: number; slug: string }>).map((s) => [s.slug, s]),
  );
  const whatsapp = svcBySlug.get('whatsapp')!;
  const sms = svcBySlug.get('sms')!;
  const email = svcBySlug.get('email')!;
  const webChat = svcBySlug.get('web-chat')!;
  const aiChat = svcBySlug.get('ai-chat')!;
  const llmPrompt = svcBySlug.get('llm-prompt-tokens')!;
  const llmCompletion = svcBySlug.get('llm-completion-tokens')!;
  const aiEmbeddings = svcBySlug.get('ai-embeddings')!;
  const aiImageGen = svcBySlug.get('ai-image-generation')!;
  const aiVectorQueries = svcBySlug.get('ai-vector-queries')!;
  const aiAgentExec = svcBySlug.get('ai-agent-executions')!;

  // ─── 4. Providers (upsert by slug) ──────────────────────────
  const providerRows = await db
    .insert(providers)
    .values([
      { name: 'Twilio', slug: 'twilio', website: 'https://twilio.com' },
      { name: 'Meta Business', slug: 'meta', website: 'https://business.facebook.com' },
      { name: 'Resend', slug: 'resend', website: 'https://resend.com' },
      { name: 'OpenAI', slug: 'openai', website: 'https://openai.com' },
      { name: 'Anthropic', slug: 'anthropic', website: 'https://anthropic.com' },
      { name: 'Google AI', slug: 'google', website: 'https://ai.google.dev' },
      { name: 'Pinecone', slug: 'pinecone', website: 'https://pinecone.io' },
    ])
    .onConflictDoUpdate({
      target: providers.slug,
      set: {
        name: sql`excluded.name`,
        website: sql`excluded.website`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  const provBySlug = new Map<string, { id: number }>(
    (providerRows as Array<{ id: number; slug: string }>).map((p) => [p.slug, p]),
  );
  const twilio = provBySlug.get('twilio')!;
  const resend = provBySlug.get('resend')!;
  const openai = provBySlug.get('openai')!;
  const anthropic = provBySlug.get('anthropic')!;
  const google = provBySlug.get('google')!;
  const pinecone = provBySlug.get('pinecone')!;

  // ─── 5. Provider-service mappings (upsert on (provider_id, service_id)) ──
  await db
    .insert(providerServices)
    .values([
      {
        providerId: twilio.id, serviceId: whatsapp.id, isDefault: true,
        configSchema: [
          { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', type: 'string', required: true },
          { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', type: 'secret', required: true },
          { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', type: 'string', required: true },
        ],
      },
      {
        providerId: twilio.id, serviceId: sms.id, isDefault: true,
        configSchema: [
          { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', type: 'string', required: true },
          { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', type: 'secret', required: true },
          { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', type: 'string', required: true },
        ],
      },
      {
        providerId: resend.id, serviceId: email.id, isDefault: true,
        configSchema: [
          { key: 'RESEND_API_KEY', label: 'API Key', type: 'secret', required: true },
          { key: 'RESEND_FROM_EMAIL', label: 'From Email', type: 'string', required: true },
        ],
      },
      {
        providerId: openai.id, serviceId: aiChat.id, isDefault: true,
        configSchema: [
          { key: 'OPENAI_API_KEY', label: 'API Key', type: 'secret', required: true },
          { key: 'OPENAI_MODEL', label: 'Model', type: 'string', required: false },
        ],
      },
      { providerId: openai.id, serviceId: llmPrompt.id, isDefault: true, costPerUnit: 15, currency: 'USD' },
      { providerId: openai.id, serviceId: llmCompletion.id, isDefault: true, costPerUnit: 60, currency: 'USD' },
      { providerId: openai.id, serviceId: aiEmbeddings.id, isDefault: true, costPerUnit: 2, currency: 'USD' },
      { providerId: openai.id, serviceId: aiImageGen.id, isDefault: true, costPerUnit: 4000, currency: 'USD' },
      { providerId: anthropic.id, serviceId: llmPrompt.id, isDefault: false, costPerUnit: 25, currency: 'USD' },
      { providerId: anthropic.id, serviceId: llmCompletion.id, isDefault: false, costPerUnit: 125, currency: 'USD' },
      { providerId: google.id, serviceId: llmPrompt.id, isDefault: false, costPerUnit: 8, currency: 'USD' },
      { providerId: google.id, serviceId: llmCompletion.id, isDefault: false, costPerUnit: 30, currency: 'USD' },
      { providerId: pinecone.id, serviceId: aiVectorQueries.id, isDefault: true, costPerUnit: 8, currency: 'USD' },
    ])
    .onConflictDoUpdate({
      target: [providerServices.providerId, providerServices.serviceId],
      set: {
        costPerUnit: sql`excluded.cost_per_unit`,
        currency: sql`excluded.currency`,
        isDefault: sql`excluded.is_default`,
        configSchema: sql`excluded.config_schema`,
        updatedAt: sql`now()`,
      },
    });

  // ─── 6. Billing plans (upsert by slug) ──────────────────────
  const planRows = await db
    .insert(billingPlans)
    .values([
      { name: 'Free', slug: 'free', price: 0, currency: 'USD', isSystem: true, order: 0,
        features: { maxMembers: 3, maxAgents: 1, maxKBs: 1 } },
      { name: 'Starter', slug: 'starter', price: 2900, currency: 'USD', order: 1,
        features: { maxMembers: 10, maxAgents: 5, maxKBs: 3, customDomain: false } },
      { name: 'Pro', slug: 'pro', price: 9900, currency: 'USD', order: 2,
        features: { maxMembers: 50, maxAgents: 25, maxKBs: 10, customDomain: true } },
    ])
    .onConflictDoUpdate({
      target: billingPlans.slug,
      set: {
        name: sql`excluded.name`,
        price: sql`excluded.price`,
        currency: sql`excluded.currency`,
        isSystem: sql`excluded.is_system`,
        order: sql`excluded."order"`,
        features: sql`excluded.features`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  const planBySlug = new Map<string, { id: number }>(
    (planRows as Array<{ id: number; slug: string }>).map((p) => [p.slug, p]),
  );
  const freePlan = planBySlug.get('free')!;
  const starterPlan = planBySlug.get('starter')!;
  const proPlan = planBySlug.get('pro')!;

  // ─── 7. Plan Quotas (upsert on (plan_id, service_id)) ───────
  const quotaRows = [
    { planId: freePlan.id, serviceId: whatsapp.id, quota: 300, period: 'monthly' as const },
    { planId: freePlan.id, serviceId: webChat.id, quota: 500, period: 'monthly' as const },
    { planId: freePlan.id, serviceId: llmCompletion.id, quota: 50000, period: 'monthly' as const },
    { planId: freePlan.id, serviceId: aiEmbeddings.id, quota: 10000, period: 'monthly' as const },
    { planId: freePlan.id, serviceId: aiAgentExec.id, quota: 100, period: 'monthly' as const },

    { planId: starterPlan.id, serviceId: whatsapp.id, quota: 3000, period: 'monthly' as const, pricePerUnit: 5 },
    { planId: starterPlan.id, serviceId: webChat.id, quota: 5000, period: 'monthly' as const, pricePerUnit: 2 },
    { planId: starterPlan.id, serviceId: llmPrompt.id, quota: 2000000, period: 'monthly' as const, pricePerUnit: 3 },
    { planId: starterPlan.id, serviceId: llmCompletion.id, quota: 1000000, period: 'monthly' as const, pricePerUnit: 5 },
    { planId: starterPlan.id, serviceId: aiEmbeddings.id, quota: 500000, period: 'monthly' as const, pricePerUnit: 1 },
    { planId: starterPlan.id, serviceId: aiImageGen.id, quota: 100, period: 'monthly' as const, pricePerUnit: 200 },
    { planId: starterPlan.id, serviceId: aiVectorQueries.id, quota: 50000, period: 'monthly' as const, pricePerUnit: 1 },
    { planId: starterPlan.id, serviceId: aiAgentExec.id, quota: 5000, period: 'monthly' as const, pricePerUnit: 2 },

    { planId: proPlan.id, serviceId: whatsapp.id, quota: 30000, period: 'monthly' as const, pricePerUnit: 3 },
    { planId: proPlan.id, serviceId: webChat.id, quota: 50000, period: 'monthly' as const, pricePerUnit: 1 },
    { planId: proPlan.id, serviceId: llmPrompt.id, quota: 20000000, period: 'monthly' as const, pricePerUnit: 2 },
    { planId: proPlan.id, serviceId: llmCompletion.id, quota: 10000000, period: 'monthly' as const, pricePerUnit: 3 },
    { planId: proPlan.id, serviceId: aiEmbeddings.id, quota: 5000000, period: 'monthly' as const, pricePerUnit: 1 },
    { planId: proPlan.id, serviceId: aiImageGen.id, quota: 1000, period: 'monthly' as const, pricePerUnit: 150 },
    { planId: proPlan.id, serviceId: aiVectorQueries.id, quota: 500000, period: 'monthly' as const, pricePerUnit: 1 },
    { planId: proPlan.id, serviceId: aiAgentExec.id, quota: 50000, period: 'monthly' as const, pricePerUnit: 1 },
  ];

  await db
    .insert(planQuotas)
    .values(quotaRows)
    .onConflictDoUpdate({
      target: [planQuotas.planId, planQuotas.serviceId],
      set: {
        quota: sql`excluded.quota`,
        period: sql`excluded.period`,
        pricePerUnit: sql`excluded.price_per_unit`,
        updatedAt: sql`now()`,
      },
    });

  console.log('[module-subscriptions] Upserted 3 categories, 12 services, 7 providers, 13 provider-services, 3 plans, 21 quotas');
}
