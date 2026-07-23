'use client';

import { useRef, useState } from 'react';

import { CharacterCount } from '@tiptap/extension-character-count';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import {
  EditorContent,
  getMarkRange,
  posToDOMRect,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  UnderlineIcon,
  UnlinkIcon,
  type LucideIcon,
} from 'lucide-react';

import { sanitizeLinkUrl } from '../lib/post-form';
import { m } from '../paraglide/messages';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RichTextEditorProps {
  /** Initial HTML content (the editor is uncontrolled after mount). */
  value: string;
  /** Called with `editor.getHTML()` on every change — HTML is the output. */
  onChange: (html: string) => void;
  /** Accessible name for the editing surface. */
  ariaLabel: string;
  /** Character ceiling; the count line shows how many remain. */
  maxCharacters?: number;
}

const DEFAULT_MAX_CHARACTERS = 10_000;

/** Brand link styling so link marks flow through `getHTML()` and render live. */
const LINK_CLASS = 'text-primary underline';

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ToolbarButton = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: ToolbarButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Toggle
          type="button"
          size="sm"
          pressed={isActive}
          onPressedChange={onClick}
          aria-label={label}
        />
      }
    >
      <Icon aria-hidden="true" />
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

/**
 * A floating-UI virtual element: Base UI's `anchor` accepts anything that can
 * report a viewport rect, so the link popover can hang off the selected text
 * instead of the toolbar button that opened it.
 */
interface SelectionAnchor {
  getBoundingClientRect: () => DOMRect;
  contextElement?: Element;
}

/**
 * The range the link popover is about to edit. A real text selection is that
 * selection; a bare caret sitting inside an existing link is the whole link
 * mark, so the popover points at the link it will change rather than at the
 * cursor. Mirrors the `extendMarkRange('link')` that `applyLink` runs.
 */
const linkAnchorRange = (editor: Editor): { from: number; to: number } => {
  const { from, to, $from } = editor.state.selection;
  if (from !== to) return { from, to };

  const linkMark = editor.schema?.marks?.link;
  const markRange = linkMark ? getMarkRange($from, linkMark) : undefined;
  return markRange ? { from: markRange.from, to: markRange.to } : { from, to };
};

/**
 * Anchor the popover to the live document coordinates of `range`. The rect is
 * read lazily on every measure so scrolling and layout shifts keep the popover
 * glued to the text; the primitive's collision handling flips/shifts it to stay
 * on screen.
 */
const selectionAnchor = (
  editor: Editor,
  range: { from: number; to: number },
): SelectionAnchor => ({
  getBoundingClientRect: () => posToDOMRect(editor.view, range.from, range.to),
  contextElement: editor.view.dom,
});

const Divider = () => (
  <Separator
    orientation="vertical"
    className="mx-1 h-5 data-vertical:self-center"
  />
);

export const RichTextEditor = ({
  value,
  onChange,
  ariaLabel,
  maxCharacters = DEFAULT_MAX_CHARACTERS,
}: RichTextEditorProps) => {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  // Captured when the popover opens so it hangs off the text being linked, not
  // off the toolbar button. `undefined` falls back to the trigger.
  const [linkAnchor, setLinkAnchor] = useState<SelectionAnchor | undefined>(
    undefined,
  );
  // The link popover moves focus to its input, so remember the editor selection
  // and restore it on apply — otherwise setLink has no range to mark.
  const savedRange = useRef<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    // The post form is server-rendered; deferring the first render avoids a
    // hydration mismatch between the SSR HTML and the client editor.
    immediatelyRender: false,
    extensions: [
      // Underline and Link both ship inside StarterKit v3 — disable them
      // there so the standalone extensions own each mark exactly once.
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: LINK_CLASS,
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount.configure({ limit: maxCharacters }),
    ],
    content: value,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        class:
          'min-h-40 w-full px-3 py-2.5 text-sm text-foreground outline-hidden [&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:ps-6',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
      underline: editor?.isActive('underline') ?? false,
      link: editor?.isActive('link') ?? false,
      alignLeft: editor?.isActive({ textAlign: 'left' }) ?? false,
      alignCenter: editor?.isActive({ textAlign: 'center' }) ?? false,
      alignRight: editor?.isActive({ textAlign: 'right' }) ?? false,
      bulletList: editor?.isActive('bulletList') ?? false,
      characters: editor?.storage.characterCount.characters() ?? 0,
    }),
  });

  if (!editor) return null;

  const isLink = state?.link ?? false;
  const charactersLeft = maxCharacters - (state?.characters ?? 0);

  const onLinkOpenChange = (open: boolean) => {
    if (open) {
      const { from, to } = editor.state.selection;
      savedRange.current = { from, to };
      setLinkUrl(editor.getAttributes('link').href ?? '');
      setLinkAnchor(selectionAnchor(editor, linkAnchorRange(editor)));
    }
    setLinkOpen(open);
  };

  const applyLink = () => {
    const href = sanitizeLinkUrl(linkUrl);
    let chain = editor.chain().focus();
    if (savedRange.current) chain = chain.setTextSelection(savedRange.current);
    chain = chain.extendMarkRange('link');
    chain = href ? chain.setLink({ href }) : chain.unsetLink();
    chain.run();
    setLinkOpen(false);
  };

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <div
          role="toolbar"
          aria-label={ariaLabel}
          className="bg-muted/50 flex flex-wrap items-center gap-0.5 rounded-2xl p-1"
        >
          <ToolbarButton
            icon={BoldIcon}
            label={m.richText_bold()}
            isActive={state?.bold ?? false}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={ItalicIcon}
            label={m.richText_italic()}
            isActive={state?.italic ?? false}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon={UnderlineIcon}
            label={m.richText_underline()}
            isActive={state?.underline ?? false}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <Divider />
          <Popover open={linkOpen} onOpenChange={onLinkOpenChange}>
            <PopoverTrigger
              render={
                <Toggle
                  type="button"
                  size="sm"
                  pressed={isLink}
                  aria-label={isLink ? m.richText_unlink() : m.richText_link()}
                />
              }
            >
              {isLink ? (
                <UnlinkIcon aria-hidden="true" />
              ) : (
                <LinkIcon aria-hidden="true" />
              )}
            </PopoverTrigger>
            <PopoverContent
              anchor={linkAnchor}
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-auto p-3"
            >
              <div className="flex items-end gap-2">
                <Input
                  autoFocus
                  aria-label={m.richText_linkUrlLabel()}
                  placeholder={m.richText_linkUrlPlaceholder()}
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyLink();
                    }
                  }}
                  className="w-64"
                />
                <Button type="button" size="sm" onClick={applyLink}>
                  {m.richText_linkApply()}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Divider />
          <ToolbarButton
            icon={AlignLeftIcon}
            label={m.richText_alignLeft()}
            isActive={state?.alignLeft ?? false}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          />
          <ToolbarButton
            icon={AlignCenterIcon}
            label={m.richText_alignCenter()}
            isActive={state?.alignCenter ?? false}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          />
          <ToolbarButton
            icon={AlignRightIcon}
            label={m.richText_alignRight()}
            isActive={state?.alignRight ?? false}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          />
          <Divider />
          <ToolbarButton
            icon={ListIcon}
            label={m.richText_bulletList()}
            isActive={state?.bulletList ?? false}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
        </div>
      </TooltipProvider>

      <div className="bg-input/50 focus-within:border-ring focus-within:ring-ring/30 overflow-hidden rounded-2xl border border-transparent transition-[color,box-shadow] duration-200 focus-within:ring-3">
        <EditorContent editor={editor} />
        <p className="border-border text-muted-foreground border-t px-3 py-2 text-xs">
          {m.richText_charactersLeft({ count: charactersLeft })}
        </p>
      </div>
    </div>
  );
};

RichTextEditor.displayName = 'RichTextEditor';
