/**
 * Review list slices: pending is always the full current-session set.
 * All / Reviewed stay inside this conversation; the settings value is
 * a turn-group page size and the view loads more on scroll.
 */
import { clampReviewDoneSessions } from '../../prefs-shared.ts'
import type { SessionEdit } from './review-model.ts'
import { groupEditsByTurn, latestSessionEdits } from './review-model.ts'
import { decidedPathsOf, decisionOf, reviewTouchedAt } from './review-store.ts'

export {
  clampReviewDoneSessions,
  REVIEW_DONE_SESSIONS_DEFAULT,
  REVIEW_DONE_SESSIONS_MAX,
  REVIEW_DONE_SESSIONS_MIN,
} from '../../prefs-shared.ts'

export interface ReviewSessionSlice {
  sessionId: string
  title: string
  updatedAt?: number
  edits: SessionEdit[]
}

/** True when All / Reviewed still need older conversation nodes to fill one page. */
export function needsOlderTurns(groupCount: number, pageSize: number, hasMore: boolean): boolean {
  return hasMore && groupCount < clampReviewDoneSessions(pageSize)
}

export function pendingEdits(sessionId: string, edits: readonly SessionEdit[]): SessionEdit[] {
  return latestSessionEdits(edits).filter(edit => decisionOf(sessionId, edit.path, edit) === undefined)
}

export function decidedEdits(sessionId: string, edits: readonly SessionEdit[]): SessionEdit[] {
  const latest = latestSessionEdits(edits)
  const decided = new Set(
    latest.filter(edit => decisionOf(sessionId, edit.path, edit) !== undefined).map(edit => edit.path),
  )
  return edits.filter(edit => decided.has(edit.path))
}

/** Newest turn groups first; keep at most `limit` groups (第 n 轮). */
export function takeNewestTurns(edits: readonly SessionEdit[], limit: number): SessionEdit[] {
  const cap = clampReviewDoneSessions(limit)
  return groupEditsByTurn(edits).slice(0, cap).flatMap(group => group.edits)
}

/** Placeholder rows from local Keep / Undo when that session's log is not loaded. */
export function storedDecidedEdits(sessionId: string): SessionEdit[] {
  return decidedPathsOf(sessionId).map(({ path }) => ({
    path,
    kind: 'edit',
    turn: undefined,
    seq: undefined,
    prompt: '',
  }))
}

/** Newest conversations first; keep at most `limit` that still have decided files. */
export function decidedBySession(
  sessions: readonly { id: string; title: string; updatedAt?: number; edits: readonly SessionEdit[] }[],
  limit: number,
  skip = 0,
): ReviewSessionSlice[] {
  const cap = clampReviewDoneSessions(limit)
  const start = Math.max(0, Math.round(skip))
  const ranked = [...sessions].sort((a, b) => {
    const aAt = a.updatedAt ?? reviewTouchedAt(a.id) ?? 0
    const bAt = b.updatedAt ?? reviewTouchedAt(b.id) ?? 0
    return bAt - aAt
  })
  const out: ReviewSessionSlice[] = []
  let seen = 0
  for (const session of ranked) {
    const live = decidedEdits(session.id, session.edits)
    const edits = live.length > 0 ? live : storedDecidedEdits(session.id)
    if (edits.length === 0) continue
    if (seen < start) {
      seen += 1
      continue
    }
    out.push({
      sessionId: session.id,
      title: session.title,
      updatedAt: session.updatedAt ?? reviewTouchedAt(session.id),
      edits,
    })
    if (out.length >= cap) break
    seen += 1
  }
  return out
}

/** Newest conversations first that still have any agent file writes. */
export function sessionsWithEdits(
  sessions: readonly { id: string; title: string; updatedAt?: number; edits: readonly SessionEdit[] }[],
): ReviewSessionSlice[] {
  const ranked = [...sessions].sort((a, b) => {
    const aAt = a.updatedAt ?? reviewTouchedAt(a.id) ?? 0
    const bAt = b.updatedAt ?? reviewTouchedAt(b.id) ?? 0
    return bAt - aAt
  })
  const out: ReviewSessionSlice[] = []
  for (const session of ranked) {
    const edits = session.edits.length > 0 ? [...session.edits] : storedDecidedEdits(session.id)
    if (edits.length === 0) continue
    out.push({
      sessionId: session.id,
      title: session.title,
      updatedAt: session.updatedAt ?? reviewTouchedAt(session.id),
      edits,
    })
  }
  return out
}
