import { describe, it, expect } from 'vitest';
import { filterMessagesForDisplay } from '../shared/filterMessagesForDisplay';
import type { UIMessage } from '../types';

function msg(partial: Partial<UIMessage> & Pick<UIMessage, 'role'>): UIMessage {
  return {
    id: Math.random().toString(36).slice(2),
    content: '',
    createdAt: new Date(),
    ...partial,
  } as UIMessage;
}

describe('filterMessagesForDisplay', () => {
  it('keeps user messages', () => {
    const out = filterMessagesForDisplay([msg({ role: 'user', content: 'hi' })]);
    expect(out).toHaveLength(1);
  });

  it('keeps system messages', () => {
    const out = filterMessagesForDisplay([msg({ role: 'system', content: 'note' })]);
    expect(out).toHaveLength(1);
  });

  it('keeps tool messages', () => {
    const out = filterMessagesForDisplay([msg({ role: 'tool', content: '' })]);
    expect(out).toHaveLength(1);
  });

  it('hides empty non-streaming assistant messages', () => {
    const out = filterMessagesForDisplay([msg({ role: 'assistant', content: '' })]);
    expect(out).toHaveLength(0);
  });

  it('keeps assistant messages with content', () => {
    const out = filterMessagesForDisplay([msg({ role: 'assistant', content: 'hello' })]);
    expect(out).toHaveLength(1);
  });

  it('keeps streaming assistant messages even when empty', () => {
    const out = filterMessagesForDisplay([msg({ role: 'assistant', content: '', isStreaming: true })]);
    expect(out).toHaveLength(1);
  });

  it('keeps messages carrying an error', () => {
    const out = filterMessagesForDisplay([msg({ role: 'assistant', content: '', error: 'boom' })]);
    expect(out).toHaveLength(1);
  });

  it('keeps assistant messages with tool parts', () => {
    const out = filterMessagesForDisplay([
      msg({
        role: 'assistant',
        content: '',
        parts: [{ type: 'tool-call', toolName: 'foo', input: {} }],
      }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('hides assistant messages with only empty text parts', () => {
    const out = filterMessagesForDisplay([
      msg({
        role: 'assistant',
        content: '',
        parts: [{ type: 'text', text: '   ' }],
      }),
    ]);
    expect(out).toHaveLength(0);
  });

  it('preserves ordering', () => {
    const messages: UIMessage[] = [
      msg({ role: 'user', content: 'one' }),
      msg({ role: 'assistant', content: '' }),
      msg({ role: 'assistant', content: 'two' }),
      msg({ role: 'system', content: 'three' }),
    ];
    const out = filterMessagesForDisplay(messages);
    expect(out.map(m => m.content)).toEqual(['one', 'two', 'three']);
  });
});
