/**
 * File chips occupy one U+FFFC plus a host-inserted trailing space. The
 * visible pill is wider than that slot, so the caret often lands on the
 * placeholder (or that space). The next key then edits the chip instead of
 * appending after it. Backspace / Delete remove the whole chip via setDraft.
 */
import type { Context } from '../context-types.ts'
import { sessionInput } from './conversation-draft.ts'
const OBJECT = '\uFFFC'

export function composerTextarea(): HTMLTextAreaElement | null {
  return document.querySelector('[data-composer-card] textarea')
}

/** Insert spaces after a U+FFFC so the textarea caret can sit past the visible pill. */
export function padSpacesAfterObject(draft: string, objectOffset: number, minSpaces: number): string {
  if (draft[objectOffset] !== OBJECT || minSpaces <= 0) return draft
  let i = objectOffset + 1
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
  pads: readonly { offset: number; minSpaces: number }[],
): string {
  let next = draft
  for (const pad of [...pads].sort((a, b) => b.offset - a.offset)) {
    next = padSpacesAfterObject(next, pad.offset, pad.minSpaces)
  }
  return next
}

/** Offset just after a chip at `offset` and any spaces the host left behind it. */
export function caretAfterChip(draft: string, offset: number): number {
  let at = offset
  if (draft[at] === OBJECT) at += 1
  else if (at > 0 && draft[at - 1] === OBJECT) {
    /* already on the gap after the placeholder */
  } else {
    let i = at - 1
    while (i >= 0 && draft[i] === ' ') i -= 1
    if (i < 0 || draft[i] !== OBJECT) return offset
    at = i + 1
  }
  while (draft[at] === ' ') at += 1
  return at
}

export function caretHitsChip(draft: string, offset: number): boolean {
  if (draft[offset] === OBJECT) return true
  if (offset > 0 && draft[offset - 1] === OBJECT) return true
  let i = offset - 1
  while (i >= 0 && draft[i] === ' ') i -= 1
  return i >= 0 && draft[i] === OBJECT && (draft[offset] === ' ' || draft[offset] === undefined)
}

/** U+FFFC plus its host padding, if `object` is a chip placeholder. */
function chipSpanFrom(draft: string, object: number): { start: number; end: number } | null {
  if (draft[object] !== OBJECT) return null
  let end = object + 1
  while (draft[end] === ' ') end += 1
  return { start: object, end }
}

/** Span of the chip the caret is on, or the chip that ends at the caret. */
export function chipSpanAt(draft: string, offset: number): { start: number; end: number } | null {
  if (draft[offset] === OBJECT) return chipSpanFrom(draft, offset)
  let i = offset - 1
  while (i >= 0 && draft[i] === ' ') i -= 1
  if (i >= 0 && draft[i] === OBJECT) {
    const span = chipSpanFrom(draft, i)
    if (span !== null && offset <= span.end) return span
  }
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
): { draft: string; caret: number } | null {
  const span = direction === 'backward'
    ? chipSpanAt(draft, caret)
    : chipSpanFrom(draft, caret) ?? chipSpanAt(draft, caret)
  if (span === null) return null
  if (direction === 'backward' && caret < span.start) return null
  if (direction === 'forward' && caret >= span.end) return null
  return { draft: `${draft.slice(0, span.start)}${draft.slice(span.end)}`, caret: span.start }
}

export function snapComposerCaretOffChip(el: HTMLTextAreaElement): boolean {
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? start
  if (start !== end) return false
  const next = caretAfterChip(el.value, start)
  if (next === start) return false
  el.setSelectionRange(next, next)
  return true
}

/** After minting a chip, put the caret past the chip the caret is on (or the last one). */
export function placeComposerCaretAfterChips(): void {
  const el = composerTextarea()
  if (el === null) return
  el.focus({ preventScroll: true })
  if (snapComposerCaretOffChip(el)) return
  const draft = el.value
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

function deleteChipUnderCaret(ctx: Context, el: HTMLTextAreaElement, direction: 'backward' | 'forward'): boolean {
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? start
  if (start !== end) return false
  const next = draftAfterChipDelete(el.value, start, direction)
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

/** Keep typing after a file chip instead of rewriting its U+FFFC / gap. */
export function registerComposerChipCaret(ctx: Context): () => void {
  const snap = (event: Event): void => {
    if (!overComposerInput(event.target)) return
    snapComposerCaretOffChip(event.target)
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
