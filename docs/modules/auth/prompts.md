# Module Auth — Authoring Prompts

Worked examples showing how to use the module from the callers'
perspective. Every snippet is written against the canonical shape
documented in `api.md` and `module-design.md`.

## Guarding an API handler

```typescript
// apps/dashboard/src/app/api/kb-entries/route.ts
import type { NextRequest } from 'next/server';
import { getAuthContext } from '@oven/module-auth';
import { forbidden } from '@oven/module-registry/api-utils';
import { listKbEntries, createKbEntry } from '@oven/module-knowledge-base';

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth.permissions.includes('kb-entries.read')) {
    return forbidden('AUTH_PERMISSION_DENIED');
  }
  return listKbEntries(request, auth);
}

export async function POST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth.permissions.includes('kb-entries.create')) {
    return forbidden('AUTH_PERMISSION_DENIED');
  }
  return createKbEntry(request, auth);
}
```

Notes:

- `import type { NextRequest }` — type-only import per `CLAUDE.md`.
- Handler never reads `X-Tenant-Id`, `Authorization`, or the cookie
  jar directly — everything lives on `AuthContext`.

## Registering the MVP adapter

```typescript
// apps/dashboard/src/lib/modules.ts
import { registerAuthAdapter } from '@oven/module-auth';
import { authJsAdapter } from '@oven/auth-authjs';

registerAuthAdapter(authJsAdapter);
```

Swapping providers at runtime (tests only):

```typescript
import { registerAuthAdapter, setActiveAuthAdapter } from '@oven/module-auth';
import { mockAdapter } from './test-utils/mock-auth-adapter';

registerAuthAdapter(mockAdapter);
setActiveAuthAdapter('mock');
```

## Creating an API key from the dashboard

```typescript
// apps/dashboard/src/components/auth/ApiKeyCreate.tsx
import { useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, TextField, Button } from '@mui/material';
import type { ApiKeyInfo } from '@oven/module-auth';

export function ApiKeyCreate() {
  const [plaintext, setPlaintext] = useState<string | null>(null);

  const handleSubmit = async (form: FormData) => {
    const res = await fetch('/api/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(form)),
      headers: { 'content-type': 'application/json' },
    });
    const json = (await res.json()) as ApiKeyInfo & { plaintext: string };
    setPlaintext(json.plaintext);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      {/* form fields omitted */}
      <Dialog open={plaintext !== null}>
        <DialogTitle>Copy your new API key</DialogTitle>
        <DialogContent sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {plaintext}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
```

Notes:

- All styling via `sx`; no `style={{ }}` prop.
- `import type { ApiKeyInfo }` — type-only import per `CLAUDE.md`.

## Authoring a test that mocks the adapter

```typescript
// packages/module-auth/tests/middleware.test.ts
import { describe, it, expect } from 'vitest';
import type { AuthAdapter, AuthUser } from '@oven/module-auth';
import { registerAuthAdapter, setActiveAuthAdapter } from '@oven/module-auth';

const fakeUser: AuthUser = { id: 1, email: 'a@b.c', name: 'Ada' };

const mockAdapter: AuthAdapter = {
  name: 'mock',
  async verifyToken(token) {
    return token === 'good' ? fakeUser : null;
  },
  async createSession() {
    return { accessToken: 'good', expiresIn: 900 };
  },
  async revokeSession() {
    // no-op
  },
  async verifyApiKey() {
    return null;
  },
};

describe('auth middleware', () => {
  it('rejects unknown tokens', async () => {
    registerAuthAdapter(mockAdapter);
    setActiveAuthAdapter('mock');
    // ... construct a request with Authorization: Bearer bad, assert 401
  });
});
```

## Calling the module from a workflow step

```typescript
// packages/module-workflows/src/steps/revoke-user-sessions.ts
import type { WorkflowStep } from '@oven/module-workflows';
import { revokeAllSessionsForUser } from '@oven/module-auth';

export const revokeUserSessionsStep: WorkflowStep<{ userId: number }> = {
  name: 'revoke-user-sessions',
  async run({ userId }) {
    await revokeAllSessionsForUser(userId);
    return { revoked: true };
  },
};
```

Notes:

- Workflow steps are the only callers that may invoke `auth` helpers
  outside a request-scoped `AuthContext`. They carry their own
  privilege envelope from `module-workflow-agents`.
