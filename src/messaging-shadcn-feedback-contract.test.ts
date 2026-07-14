import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('messaging feedback uses owned shadcn anatomy', () => {
  it('uses Alert and InputGroup for runtime feedback and search', () => {
    const runtime = source('./routes/-messages-runtime.tsx');

    expect(runtime).toContain('@/components/ui/alert');
    expect(runtime).toContain('@/components/ui/input-group');
    expect(runtime).not.toMatch(/from ['"]@\/components\/ui\/input['"]/);
  });

  it('uses FieldError for composer failures', () => {
    const composer = source('./components/messages/composer.tsx');

    expect(composer).toContain('@/components/ui/field');
    expect(composer).not.toContain('<p\n          role="alert"');
  });

  it('uses Alert for thread action and synchronization failures', () => {
    const thread = source('./components/messages/thread-view.tsx');

    expect(thread).toContain('@/components/ui/alert');
    expect(thread).not.toContain('<p\n          role="alert"');
  });

  it('uses Card and Alert for message reporting', () => {
    const bubble = source('./components/messages/message-bubble.tsx');

    expect(bubble).toContain('@/components/ui/card');
    expect(bubble).toContain('@/components/ui/alert');
    expect(bubble).not.toContain('<div className="border-border w-64');
  });

  it('uses Empty for dock load failures', () => {
    const dock = source('./routes/-messages-dock-controller.tsx');

    expect(dock).toContain('@/components/ui/empty');
    expect(dock).not.toContain('<p role="alert"');
  });
});
