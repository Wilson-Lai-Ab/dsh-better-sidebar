/**
 * Append text / file chips to the current session's composer draft through
 * the conversation service. The service is resolved lazily through `ctx.get`
 * (the inject-free read the app's own plugins use); a missing service or
 * scope degrades to a logged no-op, never a crash.
 */
import type { Context } from '../context-types.ts'
import { sessionInput } from './conversation-input.ts'
import { fileClipboardText, fileReferenceInsert, isPlainTextSelection, type FileRef } from './file-ref.ts'

export { sessionInput }

function placeCaret(occurrences: readonly { offset: number; length?: number; label?: string }[] | undefined): void {
  void import('./composer-chip-caret.ts').then(({ placeComposerCaretAfterChips }) => {
    placeComposerCaretAfterChips(occurrences)
  })
}

/**
 * Append `text` to the session's composer draft (space-separated, like the
 * @-mentions). Returns false — and logs — when the conversation service or
 * the session scope is unavailable.
 */
export function appendToDraft(ctx: Context, sessionId: string, text: string): boolean {
  try {
    const input = sessionInput(ctx, sessionId)
    if (input === undefined) return false
    const draft = input.state.getSnapshot().draft
    input.setDraft(draft.trim() === '' ? text : `${draft} ${text}`)
    return true
  } catch (error) {
    console.warn('[dsh-better-sidebar] draft insert failed:', error)
    return false
  }
}

/**
 * Append a file / selection chip (Cursor-style label). Falls back to the
 * `@path:lines` clipboard projection when the facade has no insertReference.
 */
export function insertFileRef(ctx: Context, sessionId: string, ref: FileRef): boolean {
  try {
    if (isPlainTextSelection(ref) && ref.selected !== undefined) {
      return appendToDraft(ctx, sessionId, ref.selected)
    }
    const input = sessionInput(ctx, sessionId)
    if (input === undefined) return false
    let snapshot = input.state.getSnapshot()
    if (snapshot.draft !== '' && !/\s$/.test(snapshot.draft)) {
      input.setDraft(`${snapshot.draft} `)
      snapshot = input.state.getSnapshot()
    }
    const start = snapshot.draft.length
    if (typeof input.insertReference === 'function' && typeof snapshot.draftRev === 'number') {
      const ok = input.insertReference(fileReferenceInsert(ref), {
        start,
        end: start,
        draftRev: snapshot.draftRev,
      })
      if (ok) {
        requestAnimationFrame(() => { placeCaret(input.state.getSnapshot().occurrences) })
        return true
      }
    }
    const text = fileClipboardText(ref)
    const draft = snapshot.draft
    input.setDraft(draft.trim() === '' ? text : `${draft}${/\s$/.test(draft) ? '' : ' '}${text}`)
    requestAnimationFrame(() => { placeCaret(input.state.getSnapshot().occurrences) })
    return true
  } catch (error) {
    console.warn('[dsh-better-sidebar] file chip insert failed:', error)
    return false
  }
}
