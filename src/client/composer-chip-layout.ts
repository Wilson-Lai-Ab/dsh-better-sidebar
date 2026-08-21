/**
 * Host chips are one U+FFFC wide (~4em). Long labels overflow that slot.
 * Pad the draft with spaces (not CSS paddingRight) so BOTH the textarea and
 * the decoration backdrop start the next character after the visible pill.
 * Using both systems at once paints the typed text twice — once against the
 * bubble, once far to the right.
 */
import type { Context } from '../context-types.ts'
import {
  caretHitsChip, composerTextarea, padSpacesAfterObject, placeComposerCaretAfterChips,
} from './composer-chip-caret.ts'
import { sessionInput } from './conversation-draft.ts'
import { isPluginDragActive } from './dom-sync.ts'

const MAX_PAD_SPACES = 80

export function spacesForOverflow(extraPx: number, spaceWidth: number): number {
  if (spaceWidth <= 0 || extraPx <= 0) return 1
  return Math.min(MAX_PAD_SPACES, Math.max(1, Math.ceil(extraPx / spaceWidth)))
}

export function spacesToClearChip(chip: HTMLElement, spaceWidth: number): number {
  const label = chip.querySelector(':scope > span')
  if (!(label instanceof HTMLElement) || spaceWidth <= 0) return 1
  return spacesForOverflow(label.getBoundingClientRect().right + 6 - chip.getBoundingClientRect().right, spaceWidth)
}

function measureSpaceWidth(el: HTMLTextAreaElement): number {
  const probe = document.createElement('span')
  probe.textContent = '          '
  const cs = getComputedStyle(el)
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`
  document.body.appendChild(probe)
  const width = probe.getBoundingClientRect().width / 10
  probe.remove()
  return width > 0.5 ? width : 8
}

/** True when only the host gap (spaces / end) follows this placeholder. */
export function chipHasNoUserText(draft: string, objectOffset: number): boolean {
  if (draft[objectOffset] !== '\uFFFC') return false
  let i = objectOffset + 1
  while (draft[i] === ' ') i += 1
  return draft[i] === undefined
}

function padDraftToClearPills(ctx: Context): boolean {
  const sessionId = ctx.sessions.list.getSnapshot().current
  if (sessionId === undefined) return false
  const input = sessionInput(ctx, sessionId)
  if (input === undefined) return false
  const el = composerTextarea()
  if (el === null) return false
  const spaceWidth = measureSpaceWidth(el)
  const snapshot = input.state.getSnapshot()
  let next = snapshot.draft
  for (const chip of document.querySelectorAll<HTMLElement>('[data-composer-card] [data-decoration="chip"]')) {
    chip.style.paddingRight = ''
    const id = Number(chip.dataset.occurrence)
    const occurrence = snapshot.occurrences?.find(item => item.occurrenceId === id)
    if (occurrence === undefined) continue
    if (!chipHasNoUserText(next, occurrence.offset)) continue
    next = padSpacesAfterObject(next, occurrence.offset, spacesToClearChip(chip, spaceWidth))
  }
  if (next === snapshot.draft) return false
  const caret = el.selectionStart ?? next.length
  const keepCaret = caretHitsChip(snapshot.draft, caret)
  input.setDraft(next)
  if (keepCaret) requestAnimationFrame(() => { placeComposerCaretAfterChips() })
  return true
}

/** After a chip insert: grow the gap to the pill width, then sit the caret after it. */
export function settleComposerChipGaps(ctx: Context): void {
  requestAnimationFrame(() => {
    padDraftToClearPills(ctx)
    requestAnimationFrame(() => { placeComposerCaretAfterChips() })
  })
}

/** Keep composer file chips from overlapping after insert / draft edits. */
export function registerComposerChipLayout(ctx: Context): () => void {
  let frame = 0
  const schedule = (): void => {
    if (frame !== 0 || isPluginDragActive()) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      if (isPluginDragActive()) return
      padDraftToClearPills(ctx)
    })
  }
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', schedule)
  schedule()
  return () => {
    observer.disconnect()
    window.removeEventListener('resize', schedule)
    if (frame !== 0) window.cancelAnimationFrame(frame)
  }
}
