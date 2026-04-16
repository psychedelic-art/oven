/**
 * Parses a `text/event-stream` response into a sequence of decoded
 * `StreamEvent` objects. Matches the OVEN streaming protocol produced by
 * `packages/module-chat/src/engine/streaming-handler.ts::formatSSEEvent`,
 * which writes frames of the shape:
 *
 *     event: <type>
 *     data: <json-payload>
 *
 *     event: done
 *     data: {"sessionId":1,"messageId":2}
 *
 * The consumer tolerates multi-line data fields and ignores comment lines
 * (`:`). It also handles the bare fetch Response body plus any
 * ReadableStream<Uint8Array> the caller passes in.
 */

export interface SSEEvent {
  /** Event name from `event: <name>` line (defaults to `'message'`). */
  event: string;
  /** Parsed JSON from the `data:` line(s), or the raw text if not JSON. */
  data: unknown;
}

export async function* consumeSSE(
  source: Response | ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const stream = source instanceof Response ? source.body : source;
  if (!stream) throw new Error('consumeSSE: response has no body');

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line (\n\n).
      let idx = buffer.indexOf('\n\n');
      while (idx !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const parsed = parseFrame(frame);
        if (parsed) yield parsed;
        idx = buffer.indexOf('\n\n');
      }
    }

    // Flush trailing partial frame
    if (buffer.trim().length > 0) {
      const parsed = parseFrame(buffer);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): SSEEvent | null {
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const raw of frame.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line || line.startsWith(':')) continue;
    const sepIdx = line.indexOf(':');
    const field = sepIdx === -1 ? line : line.slice(0, sepIdx);
    const value = sepIdx === -1 ? '' : line.slice(sepIdx + 1).replace(/^ /, '');
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
  }

  if (dataLines.length === 0 && eventName === 'message') return null;

  const raw = dataLines.join('\n');
  let data: unknown = raw;
  try {
    data = JSON.parse(raw);
  } catch {
    /* keep raw string */
  }
  return { event: eventName, data };
}

/** Collects every event from an SSE stream into an array. */
export async function collectSSE(
  source: Response | ReadableStream<Uint8Array>,
): Promise<SSEEvent[]> {
  const out: SSEEvent[] = [];
  for await (const ev of consumeSSE(source)) out.push(ev);
  return out;
}
