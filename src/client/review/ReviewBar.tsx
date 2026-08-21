/**
 * Keep / Undo strip on a file preview when the current conversation wrote
 * that file and the user has not decided yet.
 */
import { useState, useSyncExternalStore, type ReactNode } from 'react'
import type { SessionScope } from '../api.ts'
import { keepEdit, undoEdit } from './review-actions.ts'
import type { SessionEdit } from './review-model.ts'
import { decisionOf, reviewRevision, subscribeReview } from './review-store.ts'
import { t } from '../locales.ts'
import css from '../sidebar.module.css'

export function ReviewBar(props: {
  scope: SessionScope
  edit: SessionEdit
  onDone?: (next?: string | null) => void
}): ReactNode {
  const { scope, edit, onDone } = props
  useSyncExternalStore(subscribeReview, reviewRevision)
  const decision = decisionOf(scope.sessionId, edit.path, edit)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (decision !== undefined) return null

  const run = (work: () => Promise<string | void | null>): void => {
    setBusy(true)
    setError(null)
    void work().then((next) => {
      onDone?.(typeof next === 'string' || next === null ? next : undefined)
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { setBusy(false) })
  }

  return (
    <div className={css.reviewBar}>
      <span className={css.reviewBarLabel}>{t('reviewBarHint')}</span>
      <div className={css.reviewBarGrow} />
      {error !== null && <span className={css.reviewBarError}>{error}</span>}
      <button type="button" className={css.reviewUndo} disabled={busy} onClick={() => { run(() => undoEdit(scope, edit.path, edit.kind, edit)) }}>
        {t('reviewUndo')}
      </button>
      <button type="button" className={css.reviewKeep} disabled={busy} onClick={() => { run(() => keepEdit(scope.sessionId, edit.path, edit)) }}>
        {t('reviewKeep')}
      </button>
    </div>
  )
}
