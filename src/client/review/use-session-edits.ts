/**
 * Live agent-produced files for the current conversation. Reads the
 * session face through `ctx.sessions.binding` when the runtime exposes
 * it; older hosts just yield an empty list. `loadOlder` pages earlier
 * conversation nodes so Review can keep scrolling for more file writes.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Context } from '../../context-types.ts'
import { collectSessionEdits, latestSessionEdits, type SessionEdit } from './review-model.ts'
import { hydrateReview, pendingCount, reviewRevision, subscribeReview } from './review-store.ts'

const empty: readonly unknown[] = []
const emptySnap: { nodes?: readonly unknown[]; hasMore?: boolean; loadingOlder?: boolean } = {}

export function useSessionEdits(ctx: Context, sessionId: string | undefined, cwd: string | undefined): {
  edits: SessionEdit[]
  latest: SessionEdit[]
  pending: number
  hasMore: boolean
  loadingOlder: boolean
  loadOlder: () => Promise<void>
} {
  const binding = sessionId === undefined ? undefined : ctx.sessions?.binding?.(sessionId)
  const session = binding?.session
  const readSnap = useCallback(() => session?.getSnapshot() ?? emptySnap, [session])
  const snapshot = useSyncExternalStore(
    useCallback((listener) => session?.subscribe(listener) ?? (() => {}), [session]),
    readSnap,
    readSnap,
  )
  const edits = useMemo(() => collectSessionEdits(snapshot.nodes ?? empty, cwd), [snapshot.nodes, cwd])
  const latest = useMemo(() => latestSessionEdits(edits), [edits])
  const tick = useSyncExternalStore(subscribeReview, reviewRevision, reviewRevision)
  const pending = sessionId === undefined ? 0 : pendingCount(sessionId, latest)
  void tick
  useEffect(() => {
    if (sessionId === undefined) return
    void hydrateReview({ sessionId, cwd })
  }, [sessionId, cwd])
  const loadOlder = useCallback(async (): Promise<void> => {
    await session?.loadOlder?.()
  }, [session])
  return {
    edits,
    latest,
    pending,
    hasMore: snapshot.hasMore === true,
    loadingOlder: snapshot.loadingOlder === true,
    loadOlder,
  }
}
