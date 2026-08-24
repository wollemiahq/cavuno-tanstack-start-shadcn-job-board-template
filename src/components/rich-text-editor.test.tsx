// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createRichTextEditor,
  type RichTextEditorDependencies,
} from './rich-text-editor';

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

interface EditorToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  bulletList: boolean;
  characters: number;
}

const editorHarness = vi.hoisted(() => {
  const calls = {
    extendMarkRange: vi.fn(),
    getMarkRange: vi.fn(),
    posToDOMRect: vi.fn(),
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
  const linkMark = { name: 'link' };
  const resolvedFrom = { pos: 3 };
  const editor = {
    chain: vi.fn(() => chain),
    getAttributes: vi.fn(() => ({ href: 'https://existing.example' })),
    getHTML: vi.fn(() => '<p>Updated description</p>'),
    isActive: vi.fn((query: string | Record<string, string>) => {
      if (JSON.stringify(query) === '{"textAlign":"left"}') return true;
      return active.has(String(query));
    }),
    schema: { marks: { link: linkMark } },
    state: { selection: { from: 3, to: 9, $from: resolvedFrom } },
    storage: {
      characterCount: {
        characters: vi.fn(() => 7),
      },
    },
    view: {
      // SAFETY: The editor view is deliberately unattached until a test gives
      // the harness a DOM element.
      dom: undefined as Element | undefined,
    },
  };

  return {
    active,
    calls,
    editor,
    linkMark,
    // Set per-test; `undefined` means "the caret is not inside a link mark".
    // SAFETY: Tests set this when simulating a caret inside a link mark.
    markRange: undefined as SelectionRange | undefined,
    // SAFETY: The mocked useEditor call records the most recent options here.
    options: undefined as EditorOptions | undefined,
    resolvedFrom,
  };
});

const rectFor = (from: number, to: number) =>
  new DOMRect(from, 100, to - from, 20);

const dependencies = {
  useEditor: (options: EditorOptions) => {
    editorHarness.options = options;
    return editorHarness.editor;
  },
  useToolbarState: (editor: typeof editorHarness.editor | null) => {
    if (!editor) return undefined;
    return {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      link: editor.isActive('link'),
      alignLeft: editor.isActive({ textAlign: 'left' }),
      alignCenter: editor.isActive({ textAlign: 'center' }),
      alignRight: editor.isActive({ textAlign: 'right' }),
      bulletList: editor.isActive('bulletList'),
      characters: editor.storage.characterCount.characters(),
    } satisfies EditorToolbarState;
  },
  renderEditorContent: () => {
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
  linkAnchorRange: (editor: typeof editorHarness.editor) => {
    const { from, to, $from } = editor.state.selection;
    if (from !== to) return { from, to };
    editorHarness.calls.getMarkRange($from, editorHarness.linkMark);
    return editorHarness.markRange ?? { from, to };
  },
  selectionAnchor: (
    editor: typeof editorHarness.editor,
    range: SelectionRange,
  ) => ({
    getBoundingClientRect: () => {
      editorHarness.calls.posToDOMRect(editor.view, range.from, range.to);
      return rectFor(range.from, range.to);
    },
    contextElement: editor.view.dom,
  }),
} satisfies RichTextEditorDependencies<typeof editorHarness.editor>;

const RichTextEditor = createRichTextEditor(dependencies);

beforeEach(() => {
  editorHarness.options = undefined;
  editorHarness.markRange = undefined;
  editorHarness.editor.state.selection = {
    from: 3,
    to: 9,
    $from: editorHarness.resolvedFrom,
  };
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

  it('anchors the link popover to the selected text rather than the toolbar button', async () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Remove link' }));
    await screen.findByRole('textbox', { name: 'URL' });

    // The popover measures its anchor, which resolves to the selection's own
    // document coordinates — not the trigger's.
    await waitFor(() =>
      expect(editorHarness.calls.posToDOMRect).toHaveBeenCalledWith(
        editorHarness.editor.view,
        3,
        9,
      ),
    );
  });

  it('anchors to the whole link mark when the caret sits inside a link', async () => {
    editorHarness.editor.state.selection = {
      from: 5,
      to: 5,
      $from: editorHarness.resolvedFrom,
    };
    editorHarness.markRange = { from: 2, to: 11 };
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Remove link' }));
    await screen.findByRole('textbox', { name: 'URL' });

    expect(editorHarness.calls.getMarkRange).toHaveBeenCalledWith(
      editorHarness.resolvedFrom,
      editorHarness.linkMark,
    );
    await waitFor(() =>
      expect(editorHarness.calls.posToDOMRect).toHaveBeenCalledWith(
        editorHarness.editor.view,
        2,
        11,
      ),
    );
  });

  it('applies the link to the saved selection and keeps it after the popover closes', async () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Remove link' }));
    const url = await screen.findByRole('textbox', { name: 'URL' });
    fireEvent.change(url, { target: { value: 'example.com/careers' } });
    fireEvent.keyDown(url, { key: 'Enter' });

    expect(editorHarness.calls.focus).toHaveBeenCalledOnce();
    expect(editorHarness.calls.setTextSelection).toHaveBeenCalledWith({
      from: 3,
      to: 9,
    });
    expect(editorHarness.calls.extendMarkRange).toHaveBeenCalledWith('link');
    expect(editorHarness.calls.setLink).toHaveBeenCalledWith({
      href: 'https://example.com/careers',
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'URL' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('closes on Escape without touching the document', async () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Remove link' }));
    const url = await screen.findByRole('textbox', { name: 'URL' });
    fireEvent.keyDown(url, { key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'URL' }),
      ).not.toBeInTheDocument(),
    );
    expect(editorHarness.calls.setLink).not.toHaveBeenCalled();
    expect(editorHarness.calls.unsetLink).not.toHaveBeenCalled();
    expect(editorHarness.calls.run).not.toHaveBeenCalled();
  });
});
