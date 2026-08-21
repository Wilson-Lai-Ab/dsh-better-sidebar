/**
 * Keep / undo decisions for agent-produced files. The file on disk already
 * has the agent's write; Keep only records that the user accepted it. Undo
 * restores HEAD (or deletes a new file) and records that too. A later
 * agent write of the same path drops the decision so the row is pending
 * again.
 *
 * The ledger lives in the session directory via the plugin host
 * (`review.json`). Memory is the read cache; private-mode browsers still
 * persist because the write goes through `/sidebar/api`. A one-shot
 * localStorage copy is migrated when the disk file is still empty.
 */
import { api, type SessionScope } from '../api.ts'
import type { SessionEdit } from './review-model.ts'
import {
  emptyReviewDocument,
  parseReviewDocument,
  reviewDocumentIsEmpty,
  reviewPathKeyOf,
  sameReviewPath,
  type ReviewDecision,
  type ReviewDocument,
} from '../../review/review-document.ts'

export type { ReviewDecision, ReviewDocument }

const PREFIX = 'dsh-sidebar:review:v1:'
const listeners = new Set<() => void>()
let revision = 0
const cache = new Map<string, ReviewDocument>()
const cwdBySession = new Map<string, string | undefined>()
const hydrating = new Set<string>()
const ready = new Set<string>()

/** Cheap snapshot for `useSyncExternalStore`. */
export function reviewRevision(): number {
  return revision
}

/** Subscribe to keep / undo writes (review list + editor bar). */
export function subscribeReview(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function notify(): void {
  revision += 1
  for (const listener of listeners) listener()
}

function fingerprintOf(edit: SessionEdit): string {
  return `${edit.seq ?? ''}:${edit.turn ?? ''}:${edit.kind}`
}

/**
 * True when `edit` is a later agent write than the Keep / Undo we recorded.
 * Only a higher turn (or, if turns are missing, a higher seq) reopens the
 * row. Incomplete hydration (`turn`/`seq` appearing or disappearing) must
 * not dump an already-accepted file back into Pending.
 */
function isNewerWrite(edit: SessionEdit, seen: string): boolean {
  const parts = seen.split(':')
  const seenSeq = parts[0] !== '' ? Number(parts[0]) : Number.NaN
  const seenTurn = parts.length >= 2 && parts[1] !== '' ? Number(parts[1]) : Number.NaN
  if (typeof edit.turn === 'number' && Number.isFinite(seenTurn)) return edit.turn > seenTurn
  if (typeof edit.seq === 'number' && Number.isFinite(seenSeq)) return edit.seq > seenSeq
  return false
}

function hunkKeyOf(path: string, hunkKey: string): string {
  return `${path}\t${hunkKey}`
}

function cloneDoc(doc: ReviewDocument): ReviewDocument {
  return {
    decisions: { ...doc.decisions },
    seen: { ...doc.seen },
    hunks: { ...doc.hunks },
    ...(doc.touchedAt !== undefined ? { touchedAt: doc.touchedAt } : {}),
  }
}

function readLegacy(sessionId: string): ReviewDocument {
  if (typeof localStorage === 'undefined') return emptyReviewDocument()
  try {
    const raw = localStorage.getItem(`${PREFIX}${sessionId}`)
    if (raw === null || raw === '') return emptyReviewDocument()
    return parseReviewDocument(JSON.parse(raw) as unknown)
  } catch {
    return emptyReviewDocument()
  }
}

function clearLegacy(sessionId: string): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.removeItem(`${PREFIX}${sessionId}`) } catch { /* private mode */ }
}

/** Disk wins unless it is empty or older than an in-memory / leftover browser copy. */
export function pickReviewDocument(remote: ReviewDocument, local: ReviewDocument): {
  document: ReviewDocument
  migrate: boolean
} {
  if (reviewDocumentIsEmpty(local)) return { document: cloneDoc(remote), migrate: false }
  if (reviewDocumentIsEmpty(remote)) return { document: cloneDoc(local), migrate: true }
  if ((local.touchedAt ?? 0) > (remote.touchedAt ?? 0)) return { document: cloneDoc(local), migrate: true }
  return { document: cloneDoc(remote), migrate: false }
}

function readDoc(sessionId: string): ReviewDocument {
  const cached = cache.get(sessionId)
  if (cached !== undefined) return cached
  const legacy = readLegacy(sessionId)
  cache.set(sessionId, cloneDoc(legacy))
  return cache.get(sessionId)!
}

function persist(sessionId: string, doc: ReviewDocument): void {
  const cwd = cwdBySession.get(sessionId)
  void api.reviewPut({ sessionId, cwd }, doc).catch((error: unknown) => {
    console.warn('[dsh-better-sidebar] review ledger write failed:', error)
  })
}

function writeDoc(sessionId: string, doc: ReviewDocument): void {
  cache.set(sessionId, doc)
  persist(sessionId, doc)
  notify()
}

export function rememberReviewScope(scope: SessionScope): void {
  cwdBySession.set(scope.sessionId, scope.cwd)
}

/** Load the session-directory ledger (and migrate a leftover browser copy). */
export async function hydrateReview(scope: SessionScope): Promise<void> {
  rememberReviewScope(scope)
  if (ready.has(scope.sessionId) || hydrating.has(scope.sessionId)) return
  hydrating.add(scope.sessionId)
  try {
    const remote = await api.reviewGet(scope)
    const local = cache.get(scope.sessionId) ?? readLegacy(scope.sessionId)
    const picked = pickReviewDocument(remote, local)
    cache.set(scope.sessionId, picked.document)
    if (picked.migrate) await api.reviewPut(scope, picked.document)
    if (picked.migrate || !reviewDocumentIsEmpty(picked.document)) clearLegacy(scope.sessionId)
    ready.add(scope.sessionId)
    notify()
  } catch (error) {
    console.warn('[dsh-better-sidebar] review ledger read failed:', error)
  } finally {
    hydrating.delete(scope.sessionId)
  }
}

function ledgerKeyOf(doc: ReviewDocument, path: string): string {
  return reviewPathKeyOf(doc.decisions, path) ?? reviewPathKeyOf(doc.seen, path) ?? path
}

function forgetPath(doc: ReviewDocument, path: string): void {
  delete doc.decisions[path]
  delete doc.seen[path]
}

export function decisionOf(sessionId: string, path: string, edit?: SessionEdit): ReviewDecision | undefined {
  const doc = readDoc(sessionId)
  const key = ledgerKeyOf(doc, path)
  const seen = doc.seen[key]
  if (edit !== undefined && seen !== undefined && isNewerWrite(edit, seen)) return undefined
  return doc.decisions[key]
}

export function setReviewDecision(sessionId: string, path: string, decision: ReviewDecision | undefined, edit?: SessionEdit): void {
  const doc = cloneDoc(readDoc(sessionId))
  const previous = ledgerKeyOf(doc, path)
  if (previous !== path) forgetPath(doc, previous)
  if (decision === undefined) {
    forgetPath(doc, path)
  } else {
    doc.decisions[path] = decision
    if (edit !== undefined) doc.seen[path] = fingerprintOf(edit)
    else if (doc.seen[previous] !== undefined) doc.seen[path] = doc.seen[previous]!
    doc.touchedAt = Date.now()
  }
  writeDoc(sessionId, doc)
}

function hunkDecisionIn(doc: ReviewDocument, path: string, hunkKey: string): ReviewDecision | undefined {
  const exact = doc.hunks[hunkKeyOf(path, hunkKey)]
  if (exact !== undefined) return exact
  for (const [stored, decision] of Object.entries(doc.hunks)) {
    const at = stored.lastIndexOf('\t')
    if (at === -1) continue
    if (stored.slice(at + 1) !== hunkKey) continue
    if (sameReviewPath(stored.slice(0, at), path)) return decision
  }
  return undefined
}

/** Pending rows: no keep/undo, or the agent rewrote the file since then. */
export function hunkDecisionOf(sessionId: string, path: string, hunkKey: string): ReviewDecision | undefined {
  return hunkDecisionIn(readDoc(sessionId), path, hunkKey)
}

export function setHunkDecision(sessionId: string, path: string, hunkKey: string, decision: ReviewDecision | undefined): void {
  const doc = cloneDoc(readDoc(sessionId))
  const key = hunkKeyOf(path, hunkKey)
  if (decision === undefined) delete doc.hunks[key]
  else doc.hunks[key] = decision
  writeDoc(sessionId, doc)
}

/**
 * File-level Keep / Undo is what the review list counts. Hunk buttons only
 * hide paint. Once every current hunk is decided, lift that to the file
 * so the row leaves Pending.
 */
export function syncFileDecisionFromHunks(
  sessionId: string,
  path: string,
  hunks: readonly { key: string }[],
  edit?: SessionEdit,
): boolean {
  if (hunks.length === 0) return false
  const decisions = hunks.map(hunk => hunkDecisionOf(sessionId, path, hunk.key))
  if (decisions.some(decision => decision === undefined)) return false
  const next: ReviewDecision = decisions.some(decision => decision === 'undone') ? 'undone' : 'kept'
  if (decisionOf(sessionId, path, edit) === next) return true
  setReviewDecision(sessionId, path, next, edit)
  return true
}

export function reviewSessionIds(): string[] {
  const ids = new Set<string>(cache.keys())
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key === null || !key.startsWith(PREFIX)) continue
      ids.add(key.slice(PREFIX.length))
    }
  }
  return [...ids]
}

export function decidedPathsOf(sessionId: string): { path: string; decision: ReviewDecision }[] {
  const doc = readDoc(sessionId)
  return Object.entries(doc.decisions).map(([path, decision]) => ({ path, decision }))
}

export function reviewTouchedAt(sessionId: string): number | undefined {
  return readDoc(sessionId).touchedAt
}

export function pendingCount(sessionId: string, edits: readonly SessionEdit[]): number {
  let count = 0
  for (const edit of edits) {
    if (decisionOf(sessionId, edit.path, edit) === undefined) count += 1
  }
  return count
}
