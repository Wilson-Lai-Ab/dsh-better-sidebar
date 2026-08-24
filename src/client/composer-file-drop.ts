/**
 * Composer file-drop / paste intercept: explorer rows drag a custom MIME
 * payload; dropping on the input card (or pasting that payload / an `@path`
 * token) mints a file chip instead of dumping a path or the selected code.
 * Capture-phase so the host's image-only drop handler does not swallow it.
 */
import type { Context } from '../context-types.ts'
import { insertFileRef } from './conversation-draft.ts'
import { sessionInput } from './conversation-input.ts'
import { requestReveal } from './editor-reveal.ts'
import { decodeFileRef, FILE_REF_MIME, FILE_SOURCE, fileBaseName, parseAtToken, type FileRef } from './file-ref.ts'
import { resolveSidebarPath } from './produced-files.ts'

function sessionIdOf(ctx: Context): string | undefined {
  return ctx.sessions.list.getSnapshot().current
}

function overComposer(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('[data-composer-card]') !== null
}

/** A path-like @-token (has `/`, `.`, or a line span) — not `@pluginId`. */
export function looksLikeFileAt(text: string): FileRef | null {
  const ref = parseAtToken(text)
  if (ref === null) return null
  if (ref.lines !== undefined) return ref
  if (ref.path.includes('/') || ref.path.includes('\\') || ref.path.includes('.')) return ref
  return null
}

function refFromTransfer(transfer: DataTransfer): FileRef | null {
  const custom = transfer.getData(FILE_REF_MIME)
  if (custom !== '') return decodeFileRef(custom)
  return looksLikeFileAt(transfer.getData('text/plain'))
}

/** True when (x,y) sits in any box of `el` or its descendants. */
export function coversPoint(el: Element, x: number, y: number, pad = 0): boolean {
  const nodes: Element[] = [el, ...el.querySelectorAll('*')]
  for (const node of nodes) {
    const box = node.getBoundingClientRect()
    if (x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad) return true
  }
  return false
}

/** Draft offset under the pointer (the textarea sits ON TOP of the chips). */
export function caretOffsetAt(x: number, y: number): number | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y)
    if (pos !== null && pos.offsetNode instanceof HTMLTextAreaElement) return pos.offset
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y)
    if (range !== null && range.startContainer instanceof HTMLTextAreaElement) return range.startOffset
  }
  return null
}

export function occurrenceAtOffset(
  occurrences: readonly { occurrenceId: number; offset: number; length?: number }[] | undefined,
  offset: number,
): number | null {
  if (occurrences === undefined) return null
  for (const item of occurrences) {
    const span = item.length !== undefined && item.length > 0 ? item.length : 1
    if (offset >= item.offset && offset <= item.offset + span) return item.occurrenceId
  }
  return null
}

/**
 * The chip/text-ref backdrop is `pointer-events: none` and sits UNDER the
 * transparent textarea, so hit-testing must use geometry, not the event
 * target / elementsFromPoint.
 */
export function chipOccurrenceAt(card: Element, x: number, y: number): number | null {
  for (const node of card.querySelectorAll<HTMLElement>('[data-decoration="chip"]')) {
    if (!coversPoint(node, x, y, 8)) continue
    const id = Number(node.dataset.occurrence)
    if (Number.isFinite(id)) return id
  }
  return null
}

/** `@path` fallback when insertReference was unavailable (plain-text decoration). */
export function textRefAt(card: Element, x: number, y: number): FileRef | null {
  for (const node of card.querySelectorAll<HTMLElement>('[data-decoration="text-ref"]')) {
    if (!coversPoint(node, x, y)) continue
    return looksLikeFileAt(node.textContent ?? '')
  }
  return null
}

function fileRefFromChip(ctx: Context, sessionId: string, occurrenceId: number): FileRef | null {
  const input = sessionInput(ctx, sessionId)
  const occurrence = input?.state.getSnapshot().occurrences?.find(item => item.occurrenceId === occurrenceId)
  if (occurrence === undefined) return null
  if (occurrence.source === FILE_SOURCE) return decodeFileRef(occurrence.ref)
  return looksLikeFileAt(occurrence.clipboardText ?? '') ?? decodeFileRef(occurrence.ref)
}

export function openFileRef(ctx: Context, sessionId: string, ref: FileRef): void {
  const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
  const absolute = ref.abs ?? resolveSidebarPath(cwd, ref.path)
  const title = fileBaseName(absolute)
  ctx.betterSidebar?.openTab(
    { type: 'editor', title, path: absolute, id: `editor:${absolute}` },
    { sessionId, cwd },
  )
  if (ref.lines !== undefined) {
    requestReveal(absolute, {
      start: ref.lines.start,
      end: ref.lines.end,
      selected: ref.selected,
    })
  }
}

export function registerComposerFileDrop(ctx: Context): () => void {
  const onDragOver = (event: DragEvent): void => {
    if (!overComposer(event.target) || event.dataTransfer === null) return
    if (!event.dataTransfer.types.includes(FILE_REF_MIME)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (event: DragEvent): void => {
    if (!overComposer(event.target) || event.dataTransfer === null) return
    if (!event.dataTransfer.types.includes(FILE_REF_MIME)
      && !event.dataTransfer.types.includes('text/plain')) return
    const ref = refFromTransfer(event.dataTransfer)
    if (ref === null) return
    const sessionId = sessionIdOf(ctx)
    if (sessionId === undefined) return
    event.preventDefault()
    event.stopPropagation()
    insertFileRef(ctx, sessionId, ref)
  }

  const resolveChip = (event: MouseEvent): FileRef | null => {
    if (!(event.target instanceof Element)) return null
    const card = event.target.closest('[data-composer-card]')
    if (card === null) return null
    const sessionId = sessionIdOf(ctx)
    if (sessionId === undefined) return null
    const backdrop = card.querySelector<HTMLElement>('[data-input-backdrop]')
    const prev = backdrop?.style.pointerEvents
    if (backdrop !== null && backdrop !== undefined) backdrop.style.pointerEvents = 'auto'
    try {
      const hit = document.elementFromPoint(event.clientX, event.clientY)
      const chip = hit instanceof Element ? hit.closest<HTMLElement>('[data-decoration="chip"]') : null
      if (chip !== null) {
        const id = Number(chip.dataset.occurrence)
        if (Number.isFinite(id)) return fileRefFromChip(ctx, sessionId, id)
      }
      const textRef = hit instanceof Element ? hit.closest<HTMLElement>('[data-decoration="text-ref"]') : null
      if (textRef !== null) return looksLikeFileAt(textRef.textContent ?? '')
    } finally {
      if (backdrop !== null && backdrop !== undefined) backdrop.style.pointerEvents = prev ?? ''
    }
    const input = sessionInput(ctx, sessionId)
    const caret = caretOffsetAt(event.clientX, event.clientY)
    const fromCaret = occurrenceAtOffset(input?.state.getSnapshot().occurrences, caret ?? -1)
    const occurrenceId = fromCaret ?? chipOccurrenceAt(card, event.clientX, event.clientY)
    if (occurrenceId !== null) return fileRefFromChip(ctx, sessionId, occurrenceId)
    return textRefAt(card, event.clientX, event.clientY)
  }

  const onChipPointer = (event: MouseEvent): void => {
    if (event.button !== 0) return
    const ref = resolveChip(event)
    if (ref === null) return
    event.preventDefault()
    event.stopPropagation()
    const sessionId = sessionIdOf(ctx)
    if (sessionId === undefined) return
    // Open on mousedown: the transparent textarea sits on top of the chip
    // and a later click can miss after the caret moves.
    if (event.type === 'mousedown') openFileRef(ctx, sessionId, ref)
  }

  const onPaste = (event: ClipboardEvent): void => {
    if (!overComposer(event.target) || event.clipboardData === null) return
    const custom = event.clipboardData.getData(FILE_REF_MIME)
    const ref = custom !== '' ? decodeFileRef(custom) : looksLikeFileAt(event.clipboardData.getData('text/plain'))
    if (ref === null) return
    const sessionId = sessionIdOf(ctx)
    if (sessionId === undefined) return
    event.preventDefault()
    event.stopPropagation()
    insertFileRef(ctx, sessionId, ref)
  }

  document.addEventListener('dragover', onDragOver, true)
  document.addEventListener('drop', onDrop, true)
  document.addEventListener('paste', onPaste, true)
  document.addEventListener('mousedown', onChipPointer, true)
  document.addEventListener('click', onChipPointer, true)
  return () => {
    document.removeEventListener('dragover', onDragOver, true)
    document.removeEventListener('drop', onDrop, true)
    document.removeEventListener('paste', onPaste, true)
    document.removeEventListener('mousedown', onChipPointer, true)
    document.removeEventListener('click', onChipPointer, true)
  }
}
