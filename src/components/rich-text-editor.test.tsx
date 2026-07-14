// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface SelectionRange {
  from: number;
  to: number;
}

interface EditorOptions {
  content: string;
  editorProps: {
    attributes: Record<string, string>;
  };
  immediatelyRender: boolean;
  onUpdate: (context: { editor: typeof editorHarness.editor }) => void;
}

const editorHarness = vi.hoisted(() => {
  const calls = {
    extendMarkRange: vi.fn(),
    focus: vi.fn(),
    run: vi.fn(),
    setLink: vi.fn(),
    setTextAlign: vi.fn(),
    setTextSelection: vi.fn(),
    toggleBold: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleItalic: vi.fn(),
    toggleUnderline: vi.fn(),
    unsetLink: vi.fn(),
  };

  const chain = {
    extendMarkRange(mark: string) {
      calls.extendMarkRange(mark);
      return chain;
    },
    focus() {
      calls.focus();
      return chain;
    },
    run() {
      calls.run();
      return true;
    },
    setLink(attributes: { href: string }) {
      calls.setLink(attributes);
      return chain;
    },
    setTextAlign(alignment: string) {
      calls.setTextAlign(alignment);
      return chain;
    },
    setTextSelection(range: SelectionRange) {
      calls.setTextSelection(range);
      return chain;
    },
    toggleBold() {
      calls.toggleBold();
      return chain;
    },
    toggleBulletList() {
      calls.toggleBulletList();
      return chain;
    },
    toggleItalic() {
      calls.toggleItalic();
      return chain;
    },
    toggleUnderline() {
      calls.toggleUnderline();
      return chain;
    },
    unsetLink() {
      calls.unsetLink();
      return chain;
    },
  };

  const active = new Set(['bold', 'link']);
  const editor = {
    chain: vi.fn(() => chain),
    getAttributes: vi.fn(() => ({ href: 'https://existing.example' })),
    getHTML: vi.fn(() => '<p>Updated description</p>'),
    isActive: vi.fn((query: string | Record<string, string>) => {
      if (typeof query === 'string') return active.has(query);
      return query.textAlign === 'left';
    }),
    state: { selection: { from: 3, to: 9 } },
    storage: {
      characterCount: {
        characters: vi.fn(() => 7),
      },
    },
  };

  return {
    active,
    calls,
    editor,
    options: undefined as EditorOptions | undefined,
  };
});

vi.mock('@tiptap/react', () => ({
  EditorContent: () => {
    const attributes = editorHarness.options?.editorProps.attributes ?? {};
    return (
      <div
        role="textbox"
        contentEditable
        aria-label={attributes['aria-label']}
        data-testid="editor-content"
      />
    );
  },
  useEditor: (options: EditorOptions) => {
    editorHarness.options = options;
    return editorHarness.editor;
  },
  useEditorState: ({
    selector,
  }: {
    selector: (context: { editor: typeof editorHarness.editor }) => unknown;
  }) => selector({ editor: editorHarness.editor }),
}));

import { RichTextEditor } from './rich-text-editor';

beforeEach(() => {
  editorHarness.options = undefined;
  editorHarness.active.clear();
  editorHarness.active.add('bold');
  editorHarness.active.add('link');
  for (const call of Object.values(editorHarness.calls)) call.mockClear();
  editorHarness.editor.chain.mockClear();
  editorHarness.editor.getAttributes.mockClear();
  editorHarness.editor.getHTML.mockClear();
});

afterEach(cleanup);

describe('RichTextEditor', () => {
  const renderEditor = (onChange = vi.fn()) => {
    render(
      <RichTextEditor
        value="<p>Initial description</p>"
        onChange={onChange}
        ariaLabel="Job description"
        maxCharacters={12}
      />,
    );
    return onChange;
  };

  it('provides a named toolbar with pressed formatting controls', () => {
    renderEditor();

    expect(
      screen.getByRole('toolbar', { name: 'Job description' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Job description' }),
    ).toHaveAttribute('contenteditable', 'true');

    const bold = screen.getByRole('button', { name: 'Bold' });
    const italic = screen.getByRole('button', { name: 'Italic' });
    expect(bold).toHaveAttribute('aria-pressed', 'true');
    expect(italic).toHaveAttribute('aria-pressed', 'false');
    expect(italic).toHaveAttribute('type', 'button');

    italic.click();
    expect(editorHarness.calls.toggleItalic).toHaveBeenCalledOnce();
    expect(editorHarness.calls.run).toHaveBeenCalledOnce();
  });

  it('preserves the initial HTML, emits HTML updates, and reports the character limit', () => {
    const onChange = renderEditor();

    expect(editorHarness.options).toMatchObject({
      content: '<p>Initial description</p>',
      immediatelyRender: false,
    });
    expect(screen.getByText('5 characters left')).toBeInTheDocument();

    editorHarness.options?.onUpdate({ editor: editorHarness.editor });
    expect(onChange).toHaveBeenCalledWith('<p>Updated description</p>');
  });

  it('restores the editor selection and rejects unsafe link schemes', () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Remove link' }));
    const url = screen.getByRole('textbox', { name: 'URL' });
    fireEvent.change(url, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(editorHarness.calls.setTextSelection).toHaveBeenCalledWith({
      from: 3,
      to: 9,
    });
    expect(editorHarness.calls.extendMarkRange).toHaveBeenCalledWith('link');
    expect(editorHarness.calls.unsetLink).toHaveBeenCalledOnce();
    expect(editorHarness.calls.setLink).not.toHaveBeenCalled();
    expect(editorHarness.calls.run).toHaveBeenCalledOnce();
  });
});
