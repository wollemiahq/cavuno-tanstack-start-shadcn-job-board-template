'use client'

import type { FC } from 'react'
import { useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold01,
  Italic01,
  Link01,
  LinkBroken01,
  List,
  Underline01,
} from '@untitledui/icons'
import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from 'react-aria-components'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Link } from '@tiptap/extension-link'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'

import { Button } from '@/components/base/buttons/button'
import { ButtonUtility } from '@/components/base/buttons/button-utility'
import { Input } from '@/components/base/input/input'
import { cx } from '@/utils/cx'
import { sanitizeLinkUrl } from '../lib/post-form'
import { m } from '../paraglide/messages'

interface RichTextEditorProps {
  /** Initial HTML content (the editor is uncontrolled after mount). */
  value: string
  /** Called with `editor.getHTML()` on every change — HTML is the output. */
  onChange: (html: string) => void
  /** Accessible name for the editing surface. */
  ariaLabel: string
  /** Character ceiling; the count line shows how many remain. */
  maxCharacters?: number
}

const DEFAULT_MAX_CHARACTERS = 10_000

/** Brand link styling so link marks flow through `getHTML()` and render live. */
const LINK_CLASS = 'text-brand-secondary underline'

interface ToolbarButtonProps {
  icon: FC<{ className?: string }>
  label: string
  isActive: boolean
  onClick: () => void
}

const ToolbarButton = ({ icon, label, isActive, onClick }: ToolbarButtonProps) => (
  <ButtonUtility
    size="xs"
    color="tertiary"
    icon={icon}
    tooltip={label}
    aria-label={label}
    aria-pressed={isActive}
    onClick={onClick}
    className={cx(isActive && 'bg-primary_hover text-fg-quaternary_hover')}
  />
)

const Divider = () => (
  <span className="mx-1 h-5 w-px shrink-0 bg-border-secondary" aria-hidden="true" />
)

export const RichTextEditor = ({
  value,
  onChange,
  ariaLabel,
  maxCharacters = DEFAULT_MAX_CHARACTERS,
}: RichTextEditorProps) => {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  // The link popover traps focus, so remember the editor selection when it
  // opens and restore it on apply — otherwise setLink has no range to mark.
  const savedRange = useRef<{ from: number; to: number } | null>(null)

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
          'min-h-40 w-full px-3.5 py-3 text-md text-primary outline-hidden [&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:pl-6',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

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
  })

  if (!editor) return null

  const isLink = state?.link ?? false
  const charactersLeft = maxCharacters - (state?.characters ?? 0)

  const onLinkOpenChange = (open: boolean) => {
    if (open) {
      const { from, to } = editor.state.selection
      savedRange.current = { from, to }
      setLinkUrl(editor.getAttributes('link').href ?? '')
    }
    setLinkOpen(open)
  }

  const applyLink = () => {
    const href = sanitizeLinkUrl(linkUrl)
    let chain = editor.chain().focus()
    if (savedRange.current) chain = chain.setTextSelection(savedRange.current)
    chain = chain.extendMarkRange('link')
    chain = href ? chain.setLink({ href }) : chain.unsetLink()
    chain.run()
    setLinkOpen(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-0.5">
        <ToolbarButton
          icon={Bold01}
          label={m.richText_bold()}
          isActive={state?.bold ?? false}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic01}
          label={m.richText_italic()}
          isActive={state?.italic ?? false}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={Underline01}
          label={m.richText_underline()}
          isActive={state?.underline ?? false}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <Divider />
        <AriaDialogTrigger isOpen={linkOpen} onOpenChange={onLinkOpenChange}>
          <ButtonUtility
            size="xs"
            color="tertiary"
            icon={isLink ? LinkBroken01 : Link01}
            aria-label={isLink ? m.richText_unlink() : m.richText_link()}
            aria-pressed={isLink}
            className={cx(isLink && 'bg-primary_hover text-fg-quaternary_hover')}
          />
          <AriaPopover
            placement="bottom start"
            offset={8}
            className="rounded-lg bg-primary p-3 shadow-lg ring-1 ring-secondary_alt outline-hidden"
          >
            <AriaDialog className="outline-hidden">
              <div className="flex items-end gap-2">
                <Input
                  size="sm"
                  autoFocus
                  aria-label={m.richText_linkUrlLabel()}
                  placeholder={m.richText_linkUrlPlaceholder()}
                  value={linkUrl}
                  onChange={setLinkUrl}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      applyLink()
                    }
                  }}
                  className="w-64"
                />
                <Button size="sm" color="primary" onClick={applyLink}>
                  {m.richText_linkApply()}
                </Button>
              </div>
            </AriaDialog>
          </AriaPopover>
        </AriaDialogTrigger>
        <Divider />
        <ToolbarButton
          icon={AlignLeft}
          label={m.richText_alignLeft()}
          isActive={state?.alignLeft ?? false}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          icon={AlignCenter}
          label={m.richText_alignCenter()}
          isActive={state?.alignCenter ?? false}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          icon={AlignRight}
          label={m.richText_alignRight()}
          isActive={state?.alignRight ?? false}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />
        <Divider />
        <ToolbarButton
          icon={List}
          label={m.richText_bulletList()}
          isActive={state?.bulletList ?? false}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
      </div>

      <div className="rounded-xl bg-primary shadow-xs ring-1 ring-primary transition duration-100 ease-linear ring-inset focus-within:ring-2 focus-within:ring-brand">
        <EditorContent editor={editor} />
        <p className="px-3.5 py-2 text-sm text-tertiary">
          {m.richText_charactersLeft({ count: charactersLeft })}
        </p>
      </div>
    </div>
  )
}

RichTextEditor.displayName = 'RichTextEditor'
