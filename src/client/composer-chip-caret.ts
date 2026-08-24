/**
 * File chips occupy either one U+FFFC (older DSH) or the in-flow `@label`
 * the current host writes. The visible pill can still be wider than that
 * slot (padding / leftover scale), so the caret often lands on the chip.
 * The next key then edits the chip instead of appending after it.
 * Backspace / Delete remove the whole chip via setDraft.
 */
import type { Context } from '../context-types.ts'
import { sessionInput } from './conversation-draft.ts'
const OBJECT = '\uFFFC'

export function composerTextarea(): HTMLTextAreaElement | null {
  return document.querySelector('[data-composer-card] textarea')
}

/** Glyph count of one occurrence in the draft (`1` for U+FFFC, `@label`.length otherwise). */
export function occurrenceChipLength(
  draft: string,
  occurrence: { offset: number; length?: number; label?: string },
): number {
  if (typeof occurrence.length === 'number' && occurrence.length > 0) return occurrence.length
  if (draft[occurrence.offset] === OBJECT) return 1
  if (occurrence.label !== undefined && occurrence.label !== '') {
    const text = `@${occurrence.label}`
    if (draft.startsWith(text, occurrence.offset)) return text.length
  }
  return 1
}

function chipGlyphLength(draft: string, offset: number, length?: number): number {
  if (length !== undefined && length > 0) return length
  return draft[offset] === OBJECT ? 1 : 0
}

function isChipStart(draft: string, index: number): boolean {
  return draft[index] === OBJECT || draft[index] === '@'
}

function chipStartAt(draft: string, caret: number, length?: number): number | null {
  if (length !== undefined && length > 0) {
    let probe = caret
    while (probe > 0 && draft[probe - 1] === ' ') probe -= 1
    const afterSpaces = probe - length
    if (afterSpaces >= 0 && probe === afterSpaces + length && isChipStart(draft, afterSpaces)) return afterSpaces
    const from = Math.max(0, caret - length + 1)
    for (let start = from; start <= caret; start += 1) {
      if (isChipStart(draft, start) && caret <= start + length) return start
    }
    return null
  }
  if (draft[caret] === OBJECT) return caret
  if (caret > 0 && draft[caret - 1] === OBJECT) return caret - 1
  let i = caret - 1
  while (i >= 0 && draft[i] === ' ') i -= 1
  if (i >= 0 && draft[i] === OBJECT) return i
  return null
}

/** Insert spaces after a chip so the textarea caret can sit past the visible pill. */
export function padSpacesAfterObject(
  draft: string,
  objectOffset: number,
  minSpaces: number,
  length?: number,
): string {
  const spanLen = chipGlyphLength(draft, objectOffset, length)
  if (spanLen <= 0 || minSpaces <= 0) return draft
  let i = objectOffset + spanLen
  let have = 0
  while (draft[i] === ' ') {
    have += 1
    i += 1
  }
  if (have >= minSpaces) return draft
  return `${draft.slice(0, i)}${' '.repeat(minSpaces - have)}${draft.slice(i)}`
}

export function padSpacesAfterObjects(
  draft: string,
  pads: readonly { offset: number; minSpaces: number; length?: number }[],
): string {
  let next = draft
  for (const pad of [...pads].sort((a, b) => b.offset - a.offset)) {
    next = padSpacesAfterObject(next, pad.offset, pad.minSpaces, pad.length)
  }
  return next
}

/** Offset just after a chip at `offset` and any spaces the host left behind it. */
export function caretAfterChip(draft: string, offset: number, length?: number): number {
  const start = chipStartAt(draft, offset, length)
  if (start === null) return offset
  const spanLen = chipGlyphLength(draft, start, length) || 1
  let at = start + spanLen
  while (draft[at] === ' ') at += 1
  return at
}

export function caretHitsChip(draft: string, offset: number, length?: number): boolean {
  const span = chipSpanAt(draft, offset, length)
  if (span === null || offset < span.start) return false
  if (offset < span.end) return true
  return offset === span.end && draft[offset] === undefined
}

/** Chip placeholder plus its host padding, if `object` is a chip start. */
function chipSpanFrom(draft: string, object: number, length?: number): { start: number; end: number } | null {
  if (!isChipStart(draft, object)) return null
  const spanLen = chipGlyphLength(draft, object, length)
  if (spanLen <= 0) return null
  let end = object + spanLen
  while (draft[end] === ' ') end += 1
  return { start: object, end }
}

/** Span of the chip the caret is on, or the chip that ends at the caret. */
export function chipSpanAt(draft: string, offset: number, length?: number): { start: number; end: number } | null {
  const start = chipStartAt(draft, offset, length)
  if (start === null) return null
  const span = chipSpanFrom(draft, start, length)
  if (span !== null && offset <= span.end) return span
  return null
}

/**
 * Backspace after a chip / Delete on a chip removes the placeholder and
 * its padding in one stroke. Returns null when the caret is not on a chip.
 */
export function draftAfterChipDelete(
  draft: string,
  caret: number,
  direction: 'backward' | 'forward',
  length?: number,
): { draft: string; caret: number } | null {
  const span = direction === 'backward'
    ? chipSpanAt(draft, caret, length)
    : chipSpanFrom(draft, caret, length) ?? chipSpanAt(draft, caret, length)
  if (span === null) return null
  if (direction === 'backward' && caret < span.start) return null
  if (direction === 'forward' && caret >= span.end) return null
  return { draft: `${draft.slice(0, span.start)}${draft.slice(span.end)}`, caret: span.start }
}

function coveringChipLength(
  draft: string,
  caret: number,
  occurrences: readonly { offset: number; length?: number; label?: string }[] | undefined,
): number | undefined {
  if (occurrences !== undefined) {
    for (const occurrence of occurrences) {
      const length = occurrenceChipLength(draft, occurrence)
      const span = chipSpanFrom(draft, occurrence.offset, length)
      if (span !== null && caret >= span.start && caret <= span.end) return length
    }
  }
  return draft[caret] === OBJECT || (caret > 0 && draft[caret - 1] === OBJECT) ? 1 : undefined
}

export function snapComposerCaretOffChip(
  el: HTMLTextAreaElement,
  occurrences?: readonly { offset: number; length?: number; label?: string }[],
): boolean {
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? start
  if (start !== end) return false
  const length = coveringChipLength(el.value, start, occurrences)
  const next = caretAfterChip(el.value, start, length)
  if (next === start) return false
  el.setSelectionRange(next, next)
  return true
}

/** After minting a chip, put the caret past the chip the caret is on (or the last one). */
export function placeComposerCaretAfterChips(
  occurrences?: readonly { offset: number; length?: number; label?: string }[],
): void {
  const el = composerTextarea()
  if (el === null) return
  el.focus({ preventScroll: true })
  if (snapComposerCaretOffChip(el, occurrences)) return
  const draft = el.value
  if (occurrences !== undefined && occurrences.length > 0) {
    const last = [...occurrences].sort((a, b) => b.offset - a.offset)[0]!
    const caret = caretAfterChip(draft, last.offset, occurrenceChipLength(draft, last))
    el.setSelectionRange(caret, caret)
    return
  }
  const last = draft.lastIndexOf(OBJECT)
  if (last === -1) return
  const caret = caretAfterChip(draft, last)
  el.setSelectionRange(caret, caret)
}

function overComposerInput(target: EventTarget | null): target is HTMLTextAreaElement {
  return target instanceof HTMLTextAreaElement && target.closest('[data-composer-card]') !== null
}

function shouldSnapKey(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false
  if (event.isComposing || event.keyCode === 229) return true
  if (event.key.length === 1) return true
  return event.key === 'Enter' || event.key === 'Process'
}

function liveOccurrences(ctx: Context): readonly { offset: number; length?: number; label?: string }[] | undefined {
  const sessionId = ctx.sessions.list.getSnapshot().current
  if (sessionId === undefined) return undefined
  return sessionInput(ctx, sessionId)?.state.getSnapshot().occurrences
}

function deleteChipUnderCaret(ctx: Context, el: HTMLTextAreaElement, direction: 'backward' | 'forward'): boolean {
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? start
  if (start !== end) return false
  const occurrences = liveOccurrences(ctx)
  const length = coveringChipLength(el.value, start, occurrences)
  const next = draftAfterChipDelete(el.value, start, direction, length)
  if (next === null) return false
  const sessionId = ctx.sessions.list.getSnapshot().current
  if (sessionId === undefined) return false
  const input = sessionInput(ctx, sessionId)
  if (input === undefined) return false
  input.setDraft(next.draft)
  requestAnimationFrame(() => {
    const box = composerTextarea()
    if (box === null) return
    box.focus({ preventScroll: true })
    box.setSelectionRange(next.caret, next.caret)
  })
  return true
}

/** Keep typing after a file chip instead of rewriting its placeholder / gap. */
export function registerComposerChipCaret(ctx: Context): () => void {
  const snap = (event: Event): void => {
    if (!overComposerInput(event.target)) return
    snapComposerCaretOffChip(event.target, liveOccurrences(ctx))
  }
  const onKey = (event: KeyboardEvent): void => {
    if (!overComposerInput(event.target)) return
    if ((event.key === 'Backspace' || event.key === 'Delete') && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const direction = event.key === 'Backspace' ? 'backward' : 'forward'
      if (deleteChipUnderCaret(ctx, event.target, direction)) {
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }
    if (!shouldSnapKey(event)) return
    snap(event)
  }
  const onBeforeInput = (event: InputEvent): void => {
    if (!event.inputType.startsWith('insert')) return
    snap(event)
  }
  document.addEventListener('keydown', onKey, true)
  document.addEventListener('beforeinput', onBeforeInput, true)
  document.addEventListener('compositionstart', snap, true)
  return () => {
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('beforeinput', onBeforeInput, true)
    document.removeEventListener('compositionstart', snap, true)
  }
}
