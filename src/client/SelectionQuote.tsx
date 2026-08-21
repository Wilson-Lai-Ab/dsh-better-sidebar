/**
 * Floating "add to conversation" button for a DOM text selection. Shared by
 * the markdown preview and the git diff surface: mouse-up inside `host`
 * anchors the popup; click inserts a file chip (Cursor-style label). Copy
 * from the same selection writes the chip payload so paste into the
 * composer upgrades to a chip instead of dumping the code.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Context } from '../context-types.ts'
import { insertFileRef } from './conversation-draft.ts'
import { fileRefOf, type FileRef, writeFileRefClipboard } from './file-ref.ts'
import type { SelectionLines } from './selection-payload.ts'
import { t } from './locales.ts'
import css from './sidebar.module.css'

interface QuotePopup {
  ref: FileRef
  left: number
  top: number
}

export function SelectionQuote(props: {
  ctx: Context
  sessionId: string
  cwd: string | undefined
  host: HTMLElement | null
  /** Resolve path + line span from the current window selection. */
  locate: (host: HTMLElement, selected: string) => { path: string; lines?: SelectionLines }
}) {
  const { ctx, sessionId, cwd, host, locate } = props
  const [popup, setPopup] = useState<QuotePopup | null>(null)
  const popupRef = useRef<QuotePopup | null>(null)

  const hide = (): void => {
    popupRef.current = null
    setPopup(null)
  }

  useEffect(() => {
    if (host === null) return
    const onMouseUp = (): void => {
      const sel = window.getSelection()
      if (sel === null || sel.isCollapsed || sel.anchorNode === null || sel.focusNode === null) {
        hide()
        return
      }
      if (!host.contains(sel.anchorNode) || !host.contains(sel.focusNode)) {
        hide()
        return
      }
      const text = sel.toString()
      if (text.trim() === '') {
        hide()
        return
      }
      const located = locate(host, text)
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      const next: QuotePopup = {
        ref: fileRefOf(located.path, cwd, located.lines, text),
        left: Math.min(Math.max(rect.left + rect.width / 2, 80), window.innerWidth - 80),
        top: rect.top,
      }
      popupRef.current = next
      setPopup(next)
    }
    const onCopy = (event: ClipboardEvent): void => {
      const current = popupRef.current
      if (current === null) return
      writeFileRefClipboard(event, current.ref)
    }
    const onScroll = (): void => { hide() }
    host.addEventListener('mouseup', onMouseUp)
    host.addEventListener('copy', onCopy)
    host.addEventListener('scroll', onScroll, true)
    return () => {
      host.removeEventListener('mouseup', onMouseUp)
      host.removeEventListener('copy', onCopy)
      host.removeEventListener('scroll', onScroll, true)
    }
  }, [host, cwd, locate])

  if (popup === null) return null
  return createPortal(
    <button
      type="button"
      className={css.selectionPopup}
      style={{ left: popup.left, top: popup.top }}
      onMouseDown={(event) => { event.preventDefault() }}
      onClick={() => {
        const current = popupRef.current
        if (current === null) return
        insertFileRef(ctx, sessionId, current.ref)
        hide()
      }}
    >
      {t('addToConversation')}
    </button>,
    document.body,
  )
}

/** Diff lines covered by the current selection (`data-diff-path` / `data-diff-line`). */
export function locateDiffSelection(host: HTMLElement, _selected: string): { path: string; lines?: SelectionLines } {
  const sel = window.getSelection()
  const nodes = [...host.querySelectorAll<HTMLElement>('[data-diff-line]')]
    .filter(node => sel !== null && sel.containsNode(node, true))
  if (nodes.length === 0) return { path: host.getAttribute('data-diff-fallback-path') ?? 'diff' }
  const path = nodes[0]!.dataset.diffPath ?? 'diff'
  const nums = nodes
    .filter(node => (node.dataset.diffPath ?? path) === path)
    .map(node => Number(node.dataset.diffLine))
    .filter(num => Number.isFinite(num) && num > 0)
  if (nums.length === 0) return { path }
  return { path, lines: { start: Math.min(...nums), end: Math.max(...nums) } }
}
