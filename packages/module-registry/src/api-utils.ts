import { NextRequest, NextResponse } from 'next/server';

export interface ListParams {
  sort: string;
  order: 'asc' | 'desc';
  start: number;
  end: number;
  limit: number;
  offset: number;
  filter: Record<string, unknown>;
}

/**
 * Parse React Admin list query parameters from a NextRequest.
 * Supports ra-data-simple-rest format:
 *   sort=["field","ASC"] range=[0,24] filter={"q":"search"}
 * Also supports legacy _sort/_order/_start/_end format as fallback.
 */
export function parseListParams(req: NextRequest): ListParams {
  const url = req.nextUrl;

  let sort = 'id';
  let order: 'asc' | 'desc' = 'asc';
  let start = 0;
  let end = 25;

  // ra-data-simple-rest sends sort=["field","ORDER"]
  const sortParam = url.searchParams.get('sort');
  if (sortParam) {
    try {
      const parsed = JSON.parse(sortParam);
      if (Array.isArray(parsed) && parsed.length === 2) {
        sort = parsed[0];
        order = parsed[1].toLowerCase() as 'asc' | 'desc';
      }
    } catch {
      sort = url.searchParams.get('_sort') ?? 'id';
      order = (url.searchParams.get('_order') ?? 'ASC').toLowerCase() as 'asc' | 'desc';
    }
  } else if (url.searchParams.get('_sort')) {
    sort = url.searchParams.get('_sort')!;
    order = (url.searchParams.get('_order') ?? 'ASC').toLowerCase() as 'asc' | 'desc';
  }

  // ra-data-simple-rest sends range=[0,24]
  const rangeParam = url.searchParams.get('range');
  if (rangeParam) {
    try {
      const parsed = JSON.parse(rangeParam);
      if (Array.isArray(parsed) && parsed.length === 2) {
        start = parsed[0];
        end = parsed[1] + 1; // range is inclusive, we need exclusive end
      }
    } catch {
      start = parseInt(url.searchParams.get('_start') ?? '0', 10);
      end = parseInt(url.searchParams.get('_end') ?? '25', 10);
    }
  } else if (url.searchParams.get('_start')) {
    start = parseInt(url.searchParams.get('_start')!, 10);
    end = parseInt(url.searchParams.get('_end') ?? '25', 10);
  }

  let filter: Record<string, unknown> = {};
  const filterStr = url.searchParams.get('filter');
  if (filterStr) {
    try {
      filter = JSON.parse(filterStr);
    } catch {
      // ignore malformed filter
    }
  }

  return {
    sort,
    order,
    start,
    end,
    limit: end - start,
    offset: start,
    filter,
  };
}

/**
 * Build a Content-Range header value for React Admin's simple REST data provider.
 * Format: "{resource} {start}-{end}/{total}"
 */
export function buildContentRange(
  resource: string,
  params: { start: number; end: number },
  total: number
): string {
  const actualEnd = Math.min(params.end - 1, total - 1);
  return `${resource} ${params.start}-${actualEnd}/${total}`;
}

/**
 * Create a JSON response with Content-Range header for list endpoints.
 */
export function listResponse(
  data: unknown[],
  resource: string,
  params: ListParams,
  total: number
): NextResponse {
  return NextResponse.json(data, {
    headers: {
      'Content-Range': buildContentRange(resource, params, total),
      'Access-Control-Expose-Headers': 'Content-Range',
    },
  });
}

/**
 * Create a 404 response.
 */
export function notFound(message = 'Not found'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Create a 400 response.
 */
export function badRequest(message = 'Bad request'): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
