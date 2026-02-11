import type { ExecutionStrategy } from './types';

// ─── Shared Utilities ──────────────────────────────────────────

/** Resolve route params like [id] from input, build URL */
function buildUrl(
  baseUrl: string,
  route: string,
  method: string,
  input: Record<string, unknown>
): { url: URL; body: Record<string, unknown> | null; usedParams: string[] } {
  let resolvedRoute = route;
  const usedParams: string[] = [];
  const paramRegex = /\[(\w+)\]/g;
  let match;

  while ((match = paramRegex.exec(route)) !== null) {
    const paramName = match[1];
    if (input[paramName] !== undefined) {
      resolvedRoute = resolvedRoute.replace(match[0], String(input[paramName]));
      usedParams.push(paramName);
    }
  }

  const url = new URL(`/api/${resolvedRoute}`, baseUrl);
  const bodyMethods = ['POST', 'PUT', 'PATCH'];

  if (!bodyMethods.includes(method.toUpperCase())) {
    // GET/DELETE — remaining input goes to query params
    for (const [key, val] of Object.entries(input)) {
      if (!usedParams.includes(key) && val !== undefined) {
        url.searchParams.set(key, String(val));
      }
    }
    return { url, body: null, usedParams };
  } else {
    // POST/PUT/PATCH — remaining input goes to body
    const body = { ...input };
    for (const rp of usedParams) {
      delete body[rp];
    }
    return { url, body, usedParams };
  }
}

// ─── Network Strategy ──────────────────────────────────────────

/**
 * Executes API calls over HTTP. Works everywhere (localhost, Vercel, etc.)
 * but has network overhead per call.
 */
export class NetworkStrategy implements ExecutionStrategy {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ??
      (typeof process !== 'undefined' && process.env?.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
          ? process.env.NEXT_PUBLIC_API_URL
          : 'http://localhost:3000');
  }

  async executeApiCall(
    nodeConfig: { route: string; method: string; module: string },
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { url, body } = buildUrl(this.baseUrl, nodeConfig.route, nodeConfig.method, input);

    const fetchOptions: RequestInit = {
      method: nodeConfig.method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOptions);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return typeof data === 'object' && data !== null ? data : { result: data };
  }
}

// ─── Direct Strategy ───────────────────────────────────────────

type HandlerFn = (request: any, context?: any) => Promise<any>;
type HandlerMap = Map<string, HandlerFn>;

/**
 * Executes API calls by directly invoking Next.js handler functions
 * in-process. Zero network overhead — ideal for Vercel functions.
 *
 * Call `DirectStrategy.fromModuleRegistry(registry)` to auto-build
 * the handler map from registered modules.
 */
export class DirectStrategy implements ExecutionStrategy {
  private handlers: HandlerMap;

  constructor(handlers: HandlerMap) {
    this.handlers = handlers;
  }

  /**
   * Build a DirectStrategy from the module registry's apiHandlers.
   * Each module defines handlers like:
   *   { 'players': { GET: fn, POST: fn }, 'players/[id]': { GET: fn, PUT: fn, DELETE: fn } }
   *
   * We build a lookup map: "GET:players/[id]" → handler function
   */
  static fromApiHandlers(
    allHandlers: Record<string, Record<string, HandlerFn>>
  ): DirectStrategy {
    const map = new Map<string, HandlerFn>();
    for (const [route, methods] of Object.entries(allHandlers)) {
      for (const [method, handler] of Object.entries(methods)) {
        map.set(`${method.toUpperCase()}:${route}`, handler);
      }
    }
    return new DirectStrategy(map);
  }

  async executeApiCall(
    nodeConfig: { route: string; method: string; module: string },
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { route, method } = nodeConfig;

    // Look up handler by "METHOD:route"
    const handlerKey = `${method.toUpperCase()}:${route}`;
    const handler = this.handlers.get(handlerKey);

    if (!handler) {
      // Fall back to network strategy if handler not found
      const fallback = new NetworkStrategy();
      return fallback.executeApiCall(nodeConfig, input);
    }

    // Build a mock NextRequest
    const baseUrl = 'http://localhost:3000';
    const { url, body, usedParams } = buildUrl(baseUrl, route, method, input);

    // Extract route params from the input (e.g., [id] → { id: "5" })
    const routeParams: Record<string, string> = {};
    const paramRegex = /\[(\w+)\]/g;
    let match;
    while ((match = paramRegex.exec(route)) !== null) {
      const paramName = match[1];
      if (input[paramName] !== undefined) {
        routeParams[paramName] = String(input[paramName]);
      }
    }

    // Create a minimal Request-like object
    const requestInit: RequestInit = {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      requestInit.body = JSON.stringify(body);
    }

    // Use the Next.js Request constructor
    const request = new Request(url.toString(), requestInit);

    // Call the handler with the constructed request + route params
    const response = await handler(request, {
      params: Promise.resolve(routeParams),
    });

    // Parse the Response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Direct handler call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return typeof data === 'object' && data !== null ? data : { result: data };
  }
}

// ─── Factory ───────────────────────────────────────────────────

/**
 * Create the appropriate execution strategy based on mode.
 * - 'network': HTTP fetch (portable, works everywhere)
 * - 'direct': In-process handler calls (lightweight, fast)
 */
export function createStrategy(
  mode: 'network' | 'direct',
  options?: {
    baseUrl?: string;
    handlers?: Record<string, Record<string, HandlerFn>>;
  }
): ExecutionStrategy {
  if (mode === 'direct' && options?.handlers) {
    return DirectStrategy.fromApiHandlers(options.handlers);
  }
  return new NetworkStrategy(options?.baseUrl);
}
