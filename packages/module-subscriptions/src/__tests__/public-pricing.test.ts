import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────
const mockPlanRows: unknown[] = [];
const mockQuotaRows: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => ({
    select: (projection?: unknown) => ({
      from: (table: unknown) => ({
        where: () => ({
          orderBy: () => [...mockPlanRows],
        }),
        innerJoin: () => ({
          where: () => [...mockQuotaRows],
        }),
      }),
    }),
  }),
}));

vi.mock('../schema', () => ({
  billingPlans: {
    id: 'id',
    name: 'name',
    slug: 'slug',
    description: 'description',
    price: 'price',
    currency: 'currency',
    billingCycle: 'billing_cycle',
    features: 'features',
    order: 'order',
    isPublic: 'is_public',
    enabled: 'enabled',
    isSystem: 'is_system',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  planQuotas: {
    planId: 'plan_id',
    serviceId: 'service_id',
    quota: 'quota',
    period: 'period',
  },
  services: {
    id: 'id',
    slug: 'slug',
    unit: 'unit',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
}));

import { GET } from '../api/billing-plans-public.handler';

// The allowed keys for a public billing plan response
const PUBLIC_KEYS = [
  'id',
  'name',
  'slug',
  'description',
  'price',
  'currency',
  'billingCycle',
  'features',
  'order',
  'quotas',
] as const;

// Internal columns that must NEVER appear
const FORBIDDEN_KEYS = [
  'costCents',
  'providerId',
  'marginPercent',
  'internalNotes',
  'isPublic',
  'isSystem',
  'enabled',
  'createdAt',
  'updatedAt',
  '_privateNotes',
  'cost_cents',
  'provider_id',
  'margin_percent',
  'internal_notes',
];

describe('GET /api/billing-plans/public', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlanRows.length = 0;
    mockQuotaRows.length = 0;
  });

  it('returns the strict PublicBillingPlan shape', async () => {
    mockPlanRows.push({
      id: 1,
      name: 'Starter',
      slug: 'starter',
      description: 'Basic plan',
      price: 29900,
      currency: 'COP',
      billingCycle: 'monthly',
      features: { chat: true, email: true },
      order: 1,
    });
    mockQuotaRows.push({
      service: 'messages',
      unit: 'message',
      quota: 1000,
      period: 'monthly',
    });

    const req = new NextRequest('http://localhost/api/billing-plans/public');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveLength(1);

    const plan = data[0];
    // Assert exact shape: only public keys
    expect(Object.keys(plan).sort()).toEqual([...PUBLIC_KEYS].sort());

    // Assert no forbidden keys
    for (const key of FORBIDDEN_KEYS) {
      expect(plan).not.toHaveProperty(key);
    }

    // Verify quota shape
    expect(plan.quotas).toHaveLength(1);
    expect(Object.keys(plan.quotas[0]).sort()).toEqual(
      ['period', 'quota', 'service', 'unit']
    );
  });

  it('ignores ?include= query params (fuzz: cannot widen projection)', async () => {
    mockPlanRows.push({
      id: 2,
      name: 'Pro',
      slug: 'pro',
      description: null,
      price: 99900,
      currency: 'COP',
      billingCycle: 'monthly',
      features: null,
      order: 2,
    });
    mockQuotaRows.length = 0;

    const req = new NextRequest(
      'http://localhost/api/billing-plans/public?include=cost_cents,provider_id,isSystem,enabled'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    const plan = data[0];

    // Regardless of query params, only public keys are returned
    for (const key of FORBIDDEN_KEYS) {
      expect(plan).not.toHaveProperty(key);
    }
    expect(Object.keys(plan).sort()).toEqual([...PUBLIC_KEYS].sort());
  });

  it('returns empty array when no public plans exist', async () => {
    const req = new NextRequest('http://localhost/api/billing-plans/public');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
