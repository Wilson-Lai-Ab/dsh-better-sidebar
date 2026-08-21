/**
 * Hover Keep / Undo for one git hunk in the file preview. Hidden until
 * the pointer is over that block (Cursor-style).
 */
import { useState, type ReactNode } from 'react'
import type { SessionScope } from '../api.ts'
import { keepHunk, undoHunk } from './review-actions.ts'
import type { SessionEdit } from './review-model.ts'
import { hunkLineLabel, type ReviewHunk } from './review-hunks.ts'
import { t } from '../locales.ts'
import css from '../sidebar.module.css'

export function ReviewHunkBar(props: {
  scope: SessionScope
  path: string
  hunk: ReviewHunk
  hunks: readonly ReviewHunk[]
  edit?: SessionEdit
  top: number
  onDone: (next?: string) => void
}): ReactNode {
  const { scope, path, hunk, hunks, edit, top, onDone } = props
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (work: () => Promise<string | void>): void => {
    setBusy(true)
    setError(null)
    void work().then((next) => { onDone(typeof next === 'string' ? next : undefined) }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { setBusy(false) })
  }

  return (
    <div className={css.reviewHunkBar} style={{ top }} onMouseDown={(event) => { event.preventDefault() }}>
      {error !== null && <span className={css.reviewHunkError}>{error}</span>}
      <button type="button" className={css.reviewUndo} disabled={busy} onClick={() => { run(() => undoHunk(scope, path, hunk, hunks, edit)) }}>
        {t('reviewUndoHunk', { range: hunkLineLabel(hunk) })}
      </button>
      <button type="button" className={css.reviewKeep} disabled={busy} onClick={() => { run(() => keepHunk(scope.sessionId, path, hunk, hunks, edit)) }}>
        {t('reviewKeepHunk', { range: hunkLineLabel(hunk) })}
      </button>
    </div>
  )
}
