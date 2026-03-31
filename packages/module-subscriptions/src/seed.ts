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

export async function seedSubscriptions() {
  const db = getDb();

  // ─── Permissions ────────────────────────────────────────────
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

  // ─── Default service catalog (idempotent) ───────────────────
  const existingCategories = await db.select().from(serviceCategories).limit(1);
  if (existingCategories.length > 0) return;

  // Categories
  const [messaging, ai, storage] = await db.insert(serviceCategories).values([
    { name: 'Messaging', slug: 'messaging', icon: 'Chat', order: 1 },
    { name: 'AI', slug: 'ai', icon: 'Psychology', order: 2 },
    { name: 'Storage', slug: 'storage', icon: 'CloudUpload', order: 3 },
  ]).returning();

  // Services
  const [whatsapp, sms, email, webChat, aiChat, _fileStorage] = await db.insert(services).values([
    { categoryId: messaging.id, name: 'WhatsApp', slug: 'whatsapp', unit: 'messages' },
    { categoryId: messaging.id, name: 'SMS', slug: 'sms', unit: 'messages' },
    { categoryId: messaging.id, name: 'Email', slug: 'email', unit: 'messages' },
    { categoryId: messaging.id, name: 'Web Chat', slug: 'web-chat', unit: 'messages' },
    { categoryId: ai.id, name: 'AI Chat', slug: 'ai-chat', unit: 'tokens' },
    { categoryId: storage.id, name: 'File Storage', slug: 'file-storage', unit: 'gb' },
  ]).returning();

  // Providers
  const [twilio, _meta, resend, openai] = await db.insert(providers).values([
    { name: 'Twilio', slug: 'twilio', website: 'https://twilio.com' },
    { name: 'Meta Business', slug: 'meta', website: 'https://business.facebook.com' },
    { name: 'Resend', slug: 'resend', website: 'https://resend.com' },
    { name: 'OpenAI', slug: 'openai', website: 'https://openai.com' },
  ]).returning();

  // Provider-service mappings
  await db.insert(providerServices).values([
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
  ]);

  // Free billing plan
  const [freePlan] = await db.insert(billingPlans).values([
    { name: 'Free', slug: 'free', price: 0, currency: 'COP', isSystem: true, order: 0,
      features: { maxMembers: 3 } },
  ]).returning();

  // Free plan quotas
  await db.insert(planQuotas).values([
    { planId: freePlan.id, serviceId: whatsapp.id, quota: 300, period: 'monthly' },
    { planId: freePlan.id, serviceId: webChat.id, quota: 500, period: 'monthly' },
    { planId: freePlan.id, serviceId: aiChat.id, quota: 50, period: 'monthly' },
  ]);
}
