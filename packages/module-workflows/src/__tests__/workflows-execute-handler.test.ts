import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the workflow engine
const mockExecuteWorkflow = vi.fn();

vi.mock('../engine', () => ({
  workflowEngine: {
    executeWorkflow: (...args: unknown[]) => mockExecuteWorkflow(...args),
  },
}));

vi.mock('@oven/module-registry/api-utils', () => ({
  notFound: (msg: string) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status: 404 });
  },
  badRequest: (msg: string) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status: 400 });
  },
}));

import { POST } from '../api/workflows-execute.handler';

function makeRequest(body?: string, contentType = 'application/json'): NextRequest {
  const init: RequestInit = { method: 'POST' };
  if (body !== undefined) {
    init.body = body;
    init.headers = { 'content-type': contentType };
  }
  return new NextRequest('http://localhost/api/workflows/1/execute', init);
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/workflows/[id]/execute (F-03-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteWorkflow.mockResolvedValue(42);
  });

  it('accepts valid JSON body', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ key: 'value' })),
      makeContext('1')
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.executionId).toBe(42);
    expect(mockExecuteWorkflow).toHaveBeenCalledWith(1, { key: 'value' }, 'manual');
  });

  it('accepts empty body (no input needed)', async () => {
    const req = new NextRequest('http://localhost/api/workflows/1/execute', {
      method: 'POST',
    });
    const res = await POST(req, makeContext('1'));
    expect(res.status).toBe(201);
    expect(mockExecuteWorkflow).toHaveBeenCalledWith(1, {}, 'manual');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(
      makeRequest('{not valid json}'),
      makeContext('1')
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid JSON');
    expect(mockExecuteWorkflow).not.toHaveBeenCalled();
  });

  it('returns 400 for partial JSON', async () => {
    const res = await POST(
      makeRequest('{"key":'),
      makeContext('1')
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid JSON');
  });

  it('returns 404 for non-numeric workflow ID', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({})),
      makeContext('abc')
    );
    expect(res.status).toBe(404);
  });
});
