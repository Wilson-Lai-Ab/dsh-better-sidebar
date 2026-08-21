/**
 * Ctrl/Cmd+Z stack for Keep / Undo — file-level and per-hunk share one
 * stack. Keep only hides paint; Undo rewrites the file. Both reverse
 * without fighting CodeMirror's typing history.
 */
import type { SessionEdit } from './review-model.ts'
import { setHunkDecision, setReviewDecision, type ReviewDecision } from './review-store.ts'

export interface ReviewKeepRevert {
  kind: 'keep'
  sessionId: string
  path: string
  hunkKey: string
}

export interface ReviewUndoRevert {
  kind: 'undo'
  sessionId: string
  path: string
  hunkKey: string
  previous: string
  next: string
}

export interface ReviewFileKeepRevert {
  kind: 'file-keep'
  sessionId: string
  path: string
  edit?: SessionEdit
}

export interface ReviewFileUndoRevert {
  kind: 'file-undo'
  sessionId: string
  path: string
  /** File text before the undo; null when the file did not exist. */
  previous: string | null
  /** File text after the undo; null when the undo deleted the file. */
  next: string | null
  edit?: SessionEdit
}

export type ReviewRevert = ReviewKeepRevert | ReviewUndoRevert | ReviewFileKeepRevert | ReviewFileUndoRevert

const undoByFile = new Map<string, ReviewRevert[]>()
const redoByFile = new Map<string, ReviewRevert[]>()

export function reviewFileKey(sessionId: string, path: string): string {
  return `${sessionId}\n${path}`
}

function stackOf(map: Map<string, ReviewRevert[]>, key: string): ReviewRevert[] {
  let stack = map.get(key)
  if (stack === undefined) {
    stack = []
    map.set(key, stack)
  }
  return stack
}

export function pushReviewRevert(entry: ReviewRevert): void {
  const key = reviewFileKey(entry.sessionId, entry.path)
  stackOf(undoByFile, key).push(entry)
  redoByFile.delete(key)
}

export function peekReviewUndo(sessionId: string, path: string): ReviewRevert | undefined {
  const stack = undoByFile.get(reviewFileKey(sessionId, path))
  return stack?.[stack.length - 1]
}

export function peekReviewRedo(sessionId: string, path: string): ReviewRevert | undefined {
  const stack = redoByFile.get(reviewFileKey(sessionId, path))
  return stack?.[stack.length - 1]
}

export function canRevertReview(sessionId: string, path: string, direction: 'undo' | 'redo'): boolean {
  return (direction === 'undo' ? peekReviewUndo(sessionId, path) : peekReviewRedo(sessionId, path)) !== undefined
}

export function popReviewUndo(sessionId: string, path: string): ReviewRevert | undefined {
  const key = reviewFileKey(sessionId, path)
  const stack = undoByFile.get(key)
  const entry = stack?.pop()
  if (entry === undefined) return undefined
  stackOf(redoByFile, key).push(entry)
  return entry
}

export function popReviewRedo(sessionId: string, path: string): ReviewRevert | undefined {
  const key = reviewFileKey(sessionId, path)
  const stack = redoByFile.get(key)
  const entry = stack?.pop()
  if (entry === undefined) return undefined
  stackOf(undoByFile, key).push(entry)
  return entry
}

export function applyReviewDecision(entry: ReviewRevert, decision: ReviewDecision | undefined): void {
  if (entry.kind === 'keep' || entry.kind === 'undo') {
    setHunkDecision(entry.sessionId, entry.path, entry.hunkKey, decision)
    return
  }
  setReviewDecision(entry.sessionId, entry.path, decision, entry.edit)
}

export function contentAfterRevert(entry: ReviewRevert, direction: 'undo' | 'redo'): string | null | undefined {
  if (entry.kind === 'file-undo') return direction === 'undo' ? entry.previous : entry.next
  if (entry.kind === 'undo') return direction === 'undo' ? entry.previous : entry.next
  return undefined
}

export function clearReviewHistory(sessionId: string, path: string): void {
  const key = reviewFileKey(sessionId, path)
  undoByFile.delete(key)
  redoByFile.delete(key)
}
