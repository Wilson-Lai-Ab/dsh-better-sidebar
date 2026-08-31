/**
 * Review of files the current conversation wrote. Pending is the full
 * current-session set. All / Reviewed show this session's turns in pages
 * (default 30) and load older turns / file writes as the list scrolls.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type UIEvent } from 'react'
import clsx from 'clsx'
import type { Context } from '../../context-types.ts'
import type { SessionScope } from '../api.ts'
import { openSidebarFile, openSidebarFileAbove } from '../intercept.tsx'
import { groupEditsByTurn, promptPreview, type SessionEdit } from './review-model.ts'
import { keepEdit, undoEdit } from './review-actions.ts'
import { needsOlderTurns, pendingEdits } from './review-filter.ts'
import { clampReviewDoneSessions } from '../../prefs-shared.ts'
import { decisionOf, hydrateReview, rememberReviewScope, reviewRevision, subscribeReview, type ReviewDecision } from './review-store.ts'
import { useSessionEdits } from './use-session-edits.ts'
import { relativeTime, t } from '../locales.ts'
import { classOfKind, type GitStatusKind } from '../git-status-style.ts'
import type { SidebarStore } from '../state.ts'
import css from '../sidebar.module.css'

function baseName(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

function gitKindOf(kind: SessionEdit['kind']): GitStatusKind {
  if (kind === 'add') return 'add'
  if (kind === 'delete') return 'del'
  return 'mod'
}

function badgeOf(kind: SessionEdit['kind']): string {
  if (kind === 'add') return 'A'
  if (kind === 'delete') return 'D'
  return 'M'
}

function kindLabel(kind: SessionEdit['kind']): string {
  if (kind === 'add') return t('reviewAdded')
  if (kind === 'delete') return t('reviewDeleted')
  return t('reviewEdited')
}

function sessionWhen(updatedAt?: number): string {
  if (updatedAt === undefined || !Number.isFinite(updatedAt) || updatedAt <= 0) return ''
  return relativeTime(new Date(updatedAt).toISOString())
}

function FileRows(props: {
  ctx: Context
  store: SidebarStore
  sessionId: string
  cwd?: string
  edits: readonly SessionEdit[]
  latest: readonly SessionEdit[]
  busy: string | null
  onKeep: (sessionId: string, edit: SessionEdit) => void
  onUndo: (sessionId: string, cwd: string | undefined, edit: SessionEdit) => void
}): ReactNode {
  const { ctx, store, sessionId, cwd, edits, latest, busy, onKeep, onUndo } = props
  const tipOf = (edit: SessionEdit): SessionEdit => latest.find(row => row.path === edit.path) ?? edit
  return (
    <>
      {groupEditsByTurn(edits).map((group) => (
        <div key={`${sessionId}:${group.key}`} className={css.reviewGroup}>
          <div className={css.reviewGroupHeader}>
            <div className={css.reviewGroupMeta}>
              <span className={css.reviewGroupTurn}>
                {group.turn === undefined ? t('reviewTurnUnknown') : t('reviewTurn', { n: group.turn })}
              </span>
              {sessionWhen(group.time) !== '' && (
                <span className={css.reviewSessionTime}>{sessionWhen(group.time)}</span>
              )}
              <span className={css.reviewGroupCount}>{t('reviewFileCount', { count: group.edits.length })}</span>
            </div>
            <span className={css.reviewGroupPrompt}>
              {group.prompt === '' ? t('reviewNoPrompt') : promptPreview(group.prompt, 96)}
            </span>
          </div>
          {group.edits.map((edit) => {
            const decision: ReviewDecision | undefined = decisionOf(sessionId, edit.path, tipOf(edit))
            const color = classOfKind(gitKindOf(edit.kind))
            return (
              <div key={`${edit.turn ?? 'x'}:${edit.path}`} className={css.reviewRow}>
                <button
                  type="button"
                  className={css.reviewMain}
                  title={edit.path}
                  onClick={() => { openSidebarFile(ctx, store, sessionId, edit.path) }}
                  onDoubleClick={() => { openSidebarFileAbove(ctx, store, sessionId, edit.path) }}
                >
                  <span className={clsx(css.reviewKind, color)} title={kindLabel(edit.kind)}>{badgeOf(edit.kind)}</span>
                  <span className={clsx(css.reviewName, color, edit.kind === 'delete' && css.gitDeletedText)}>
                    {baseName(edit.path)}
                  </span>
                  <span className={clsx(css.reviewPath, color, edit.kind === 'delete' && css.gitDeletedText)}>{edit.path}</span>
                </button>
                <div className={css.reviewActions}>
                  {decision === undefined ? (
                    <>
                      <button type="button" className={css.reviewUndo} disabled={busy !== null} onClick={() => { onUndo(sessionId, cwd, edit) }}>
                        {t('reviewUndo')}
                      </button>
                      <button type="button" className={css.reviewKeep} disabled={busy !== null} onClick={() => { onKeep(sessionId, edit) }}>
                        {t('reviewKeep')}
                      </button>
                    </>
                  ) : (
                    <span className={css.reviewDone}>{decision === 'kept' ? t('reviewKept') : t('reviewUndone')}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

export function ReviewView(props: {
  ctx: Context
  store: SidebarStore
  scope: SessionScope
}): ReactNode {
  const { ctx, store, scope } = props
  const { edits, latest, pending, hasMore, loadingOlder, loadOlder } = useSessionEdits(ctx, scope.sessionId, scope.cwd)
  const tick = useSyncExternalStore(subscribeReview, reviewRevision)
  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => store.subscribe(listener), [store]),
    store.getSnapshot,
  )
  const pageSize = clampReviewDoneSessions(snapshot.prefs.reviewDoneSessionLimit)
  void tick
  rememberReviewScope(scope)
  useEffect(() => {
    void hydrateReview(scope)
  }, [scope.sessionId, scope.cwd])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all' | 'done'>('pending')
  const [visibleTurns, setVisibleTurns] = useState(pageSize)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const waiting = useMemo(() => pendingEdits(scope.sessionId, edits), [edits, scope.sessionId, tick])
  const decidedAll = useMemo(
    () => edits.filter(edit => decisionOf(scope.sessionId, edit.path, latest.find(row => row.path === edit.path) ?? edit) !== undefined),
    [edits, latest, scope.sessionId, tick],
  )
  const listed = filter === 'pending' ? waiting : filter === 'all' ? [...waiting, ...decidedAll] : decidedAll
  const groups = useMemo(() => groupEditsByTurn(listed), [listed])
  const visibleEdits = groups.slice(0, visibleTurns).flatMap(group => group.edits)
  const moreTurns = groups.length > visibleTurns
  // Older conversation nodes may contain more files, but an empty Pending
  // list after Keep all must not auto-fetch them back into the queue.
  const fillPage = filter !== 'pending' && needsOlderTurns(groups.length, pageSize, hasMore)
  const canLoadMore = moreTurns || fillPage || (hasMore && listed.length > 0)

  useEffect(() => {
    setVisibleTurns(pageSize)
  }, [filter, pageSize])

  const run = useCallback(async (path: string, work: () => Promise<unknown>): Promise<void> => {
    setBusy(path)
    setError(null)
    try {
      await work()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(null)
    }
  }, [])

  const keepOne = (sessionId: string, edit: SessionEdit): void => {
    const tip = latest.find(row => row.path === edit.path) ?? edit
    void run(edit.path, () => keepEdit(sessionId, edit.path, tip))
  }
  const undoOne = (sessionId: string, cwd: string | undefined, edit: SessionEdit): void => {
    const tip = latest.find(row => row.path === edit.path) ?? edit
    void run(edit.path, () => undoEdit({ sessionId, cwd }, edit.path, tip.kind, tip))
  }
  const keepAll = (): void => {
    void run('*', async () => {
      for (const edit of waiting) await keepEdit(scope.sessionId, edit.path, edit)
    })
  }
  const undoAll = (): void => {
    void run('*', async () => {
      for (const edit of waiting) await undoEdit(scope, edit.path, edit.kind, edit)
    })
  }

  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || loadingOlder) return
    setLoadingMore(true)
    try {
      if (moreTurns) setVisibleTurns(count => count + pageSize)
      else if (fillPage || (hasMore && listed.length > 0)) await loadOlder()
    } finally {
      setLoadingMore(false)
    }
  }, [fillPage, hasMore, listed.length, loadOlder, loadingMore, loadingOlder, moreTurns, pageSize])

  const onListScroll = (event: UIEvent<HTMLDivElement>): void => {
    const el = event.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 80) return
    void loadMore()
  }

  const fillKey = `${filter}:${visibleTurns}:${groups.length}:${hasMore}`
  const filled = useRef('')
  const olderTries = useRef(0)
  useEffect(() => {
    olderTries.current = 0
  }, [scope.sessionId, pageSize, filter])
  useEffect(() => {
    if (fillPage && !loadingOlder && !loadingMore && olderTries.current < 20) {
      olderTries.current += 1
      void loadMore()
      return
    }
    const el = listRef.current
    if (el === null || !moreTurns) return
    if (filled.current === fillKey) return
    if (el.scrollHeight > el.clientHeight + 8) return
    filled.current = fillKey
    void loadMore()
  }, [fillKey, fillPage, loadMore, loadingMore, loadingOlder, moreTurns])

  const empty = listed.length === 0

  return (
    <div className={css.reviewRoot}>
      <div className={css.reviewToolbar}>
        <span className={css.reviewCount}>{t('reviewPending', { count: pending })}</span>
        <div className={css.reviewToolbarGrow} />
        <button type="button" className={css.reviewGhost} disabled={pending === 0 || busy !== null} onClick={keepAll}>
          {t('reviewKeepAll')}
        </button>
        <button type="button" className={css.reviewGhost} disabled={pending === 0 || busy !== null} onClick={undoAll}>
          {t('reviewUndoAll')}
        </button>
      </div>
      <div className={css.reviewFilter}>
        <button
          type="button"
          className={filter === 'pending' ? css.reviewFilterActive : css.reviewFilterBtn}
          onClick={() => { setFilter('pending') }}
        >
          {t('reviewFilterPending')}
        </button>
        <button
          type="button"
          className={filter === 'all' ? css.reviewFilterActive : css.reviewFilterBtn}
          onClick={() => { setFilter('all') }}
        >
          {t('reviewFilterAll')}
        </button>
        <button
          type="button"
          className={filter === 'done' ? css.reviewFilterActive : css.reviewFilterBtn}
          onClick={() => { setFilter('done') }}
        >
          {t('reviewFilterDone')}
        </button>
      </div>
      {error !== null && <div className={css.reviewError}>{error}</div>}
      {empty && (
        <div className={css.reviewEmpty}>
          {edits.length === 0 && filter !== 'done' ? t('reviewEmpty') : t('reviewCaughtUp')}
        </div>
      )}
      <div ref={listRef} className={css.reviewList} onScroll={onListScroll}>
        {visibleEdits.length > 0 && (
          <FileRows
            ctx={ctx}
            store={store}
            sessionId={scope.sessionId}
            cwd={scope.cwd}
            edits={visibleEdits}
            latest={latest}
            busy={busy}
            onKeep={keepOne}
            onUndo={undoOne}
          />
        )}
        {canLoadMore && (
          <button
            type="button"
            className={css.reviewLoadMore}
            disabled={loadingMore || loadingOlder}
            onClick={() => { void loadMore() }}
          >
            {loadingMore || loadingOlder ? t('loading') : t('loadMore')}
          </button>
        )}
      </div>
    </div>
  )
}
