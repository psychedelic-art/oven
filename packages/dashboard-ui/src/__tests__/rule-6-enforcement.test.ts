import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const COMPONENTS_DIR = join(__dirname, '../../../../apps/dashboard/src/components');

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, pattern));
    } else if (pattern.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Tenant-scoped resources: files whose List or Create components previously
 * had a tenantId filter/input. After sprint-03, they must use useTenantContext.
 *
 * This list is derived from the sprint-02 audit (audit/lists.md).
 */
const TENANT_SCOPED_PREFIXES = [
  'forms/FormList',
  'forms/FormCreate',
  'flows/FlowList',
  'flows/FlowCreate',
  'flow-items/FlowItemList',
  'flow-items/FlowItemCreate',
  'form-submissions/FormSubmissionList',
  'form-components/FormComponentList',
  'form-components/FormComponentCreate',
  'ui-flows/UiFlowList',
  'ui-flows/UiFlowCreate',
  'ui-flow-analytics/UiFlowAnalyticsList',
  'files/FileList',
  'ai/UsageLogList',
  'ai/VectorStoreList',
  'ai/VectorStoreCreate',
  'ai/GuardrailCreate',
  'module-configs/ConfigList',
  'module-configs/ConfigCreate',
  'knowledge-base/KnowledgeBaseList',
  'knowledge-base/KnowledgeBaseCreate',
  'knowledge-base/EntryList',
  'knowledge-base/EntryCreate',
  'knowledge-base/CategoryList',
  'knowledge-base/CategoryCreate',
  'notifications/ChannelList',
  'notifications/ChannelCreate',
  'notifications/ConversationList',
  'notifications/EscalationList',
  'tenant-members/TenantMemberList',
  'tenant-members/TenantMemberCreate',
  'tenant-subscriptions/TenantSubscriptionList',
  'tenant-subscriptions/TenantSubscriptionCreate',
  'auth/ApiKeyList',
  'auth/ApiKeyCreate',
  'auth/UserCreate',
];

describe('Rule 6 — Tenant context enforcement', () => {
  it('no List or Create file uses <NumberInput source="tenantId"', () => {
    const listFiles = findFiles(COMPONENTS_DIR, /List\.tsx$/);
    const createFiles = findFiles(COMPONENTS_DIR, /Create\.tsx$/);
    const violations: string[] = [];

    for (const file of [...listFiles, ...createFiles]) {
      const content = readFileSync(file, 'utf-8');
      // Match NumberInput with source="tenantId" on the same JSX element
      if (/NumberInput[^>]*source="tenantId"/.test(content)) {
        const relative = file.replace(COMPONENTS_DIR + '/', '');
        violations.push(relative);
      }
    }

    expect(
      violations,
      `Found <NumberInput source="tenantId"> in: ${violations.join(', ')}`,
    ).toHaveLength(0);
  });

  it('every tenant-scoped file imports useTenantContext', () => {
    const missing: string[] = [];

    for (const prefix of TENANT_SCOPED_PREFIXES) {
      const file = join(COMPONENTS_DIR, `${prefix}.tsx`);
      try {
        const content = readFileSync(file, 'utf-8');
        if (!content.includes('useTenantContext')) {
          missing.push(prefix);
        }
      } catch {
        // File may not exist (e.g. no Create for read-only resources)
      }
    }

    expect(
      missing,
      `Missing useTenantContext in: ${missing.join(', ')}`,
    ).toHaveLength(0);
  });

  it('no file uses <ReferenceInput source="tenantId" outside admin mode', () => {
    const allTsx = findFiles(COMPONENTS_DIR, /\.tsx$/);
    const violations: string[] = [];

    for (const file of allTsx) {
      const content = readFileSync(file, 'utf-8');
      // Check for ReferenceInput with tenantId that is NOT inside an isAdminMode check
      if (
        content.includes('ReferenceInput') &&
        content.includes('source="tenantId"') &&
        !content.includes('isAdminMode')
      ) {
        const relative = file.replace(COMPONENTS_DIR + '/', '');
        violations.push(relative);
      }
    }

    expect(
      violations,
      `Found <ReferenceInput source="tenantId"> without isAdminMode in: ${violations.join(', ')}`,
    ).toHaveLength(0);
  });
});
