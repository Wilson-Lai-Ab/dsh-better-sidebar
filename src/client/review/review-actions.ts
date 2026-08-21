/**
 * Keep / Undo for an agent-produced file or one painted island.
 * Keep records acceptance (disk already has the new text). Undo restores
 * HEAD / splices one island / deletes a new file. File-level and hunk-level
 * share the same Ctrl+Z stack.
 */
import { api, type SessionScope } from '../api.ts'
import { gitFileTarget } from '../git-repo.ts'
import type { ReviewEditKind, SessionEdit } from './review-model.ts'
import {
  applyReviewDecision, contentAfterRevert, popReviewRedo, popReviewUndo, pushReviewRevert,
} from './review-history.ts'
import { applyHunkUndo, type ReviewHunk } from './review-hunks.ts'
import { setHunkDecision, setReviewDecision, syncFileDecisionFromHunks } from './review-store.ts'

export async function keepEdit(sessionId: string, path: string, edit?: SessionEdit): Promise<void> {
  setReviewDecision(sessionId, path, 'kept', edit)
  pushReviewRevert({ kind: 'file-keep', sessionId, path, edit })
}

export async function undoEdit(scope: SessionScope, path: string, kind: ReviewEditKind, edit?: SessionEdit): Promise<string | null> {
  const current = await api.fsRead(scope, path).catch(() => null)
  const previous = current?.kind === 'text' ? current.content : null
  const snapshot = edit?.oldText
  let next: string | null
  if (kind === 'add' || snapshot === null) {
    await api.fsUnlink(scope, path)
    next = null
  } else if (typeof snapshot === 'string') {
    await api.fsWrite(scope, path, snapshot)
    next = snapshot
  } else {
    const target = await gitFileTarget(scope, path)
    const shown = await api.gitShow(target.scope, target.gitPath, 'HEAD').catch(() => ({ content: null }))
    if (shown.content !== null) {
      await api.fsWrite(scope, path, shown.content)
      next = shown.content
    } else if (kind === 'delete') {
      throw new Error('no HEAD copy to restore')
    } else {
      // No HEAD copy = created in this conversation. `git discard` leaves
      // untracked files on disk, so unlink instead.
      await api.fsUnlink(scope, path)
      next = null
    }
  }
  setReviewDecision(scope.sessionId, path, 'undone', edit)
  pushReviewRevert({ kind: 'file-undo', sessionId: scope.sessionId, path, previous, next, edit })
  return next
}

export async function keepHunk(
  sessionId: string,
  path: string,
  hunk: ReviewHunk,
  hunks: readonly { key: string }[] = [],
  edit?: SessionEdit,
): Promise<void> {
  setHunkDecision(sessionId, path, hunk.key, 'kept')
  syncFileDecisionFromHunks(sessionId, path, hunks, edit)
  pushReviewRevert({ kind: 'keep', sessionId, path, hunkKey: hunk.key })
}

export async function undoHunk(
  scope: SessionScope,
  path: string,
  hunk: ReviewHunk,
  hunks: readonly { key: string }[] = [],
  edit?: SessionEdit,
): Promise<string> {
  const current = await api.fsRead(scope, path)
  if (current.kind !== 'text') throw new Error('cannot undo a hunk in a binary file')
  let next: string
  if (hunk.oldBlock === '' && hunk.newBlock === '' && hunk.key.startsWith('g:')) {
    const target = await gitFileTarget(scope, path)
    const shown = await api.gitShow(target.scope, target.gitPath, 'HEAD').catch(() => ({ content: null }))
    if (shown.content === null) throw new Error('no HEAD copy for this hunk')
    next = applyHunkUndo(current.content, {
      ...hunk,
      oldBlock: shown.content.split('\n').slice(hunk.start - 1, hunk.end).join('\n'),
      newBlock: current.content.split('\n').slice(hunk.start - 1, hunk.end).join('\n'),
    })
  } else {
    next = applyHunkUndo(current.content, hunk)
  }
  if (next === '') await api.fsUnlink(scope, path)
  else await api.fsWrite(scope, path, next)
  setHunkDecision(scope.sessionId, path, hunk.key, 'undone')
  syncFileDecisionFromHunks(scope.sessionId, path, hunks, edit)
  pushReviewRevert({
    kind: 'undo',
    sessionId: scope.sessionId,
    path,
    hunkKey: hunk.key,
    previous: current.content,
    next,
  })
  return next
}

/** Ctrl/Cmd+Z / Shift+Z for the shared file+hunk stack. Returns false when empty. */
export async function revertLastReview(
  scope: SessionScope,
  path: string,
  direction: 'undo' | 'redo',
): Promise<{ applied: boolean; content?: string | null }> {
  const entry = direction === 'undo' ? popReviewUndo(scope.sessionId, path) : popReviewRedo(scope.sessionId, path)
  if (entry === undefined) return { applied: false }
  if (entry.kind === 'keep') {
    applyReviewDecision(entry, direction === 'undo' ? undefined : 'kept')
    return { applied: true }
  }
  if (entry.kind === 'file-keep') {
    applyReviewDecision(entry, direction === 'undo' ? undefined : 'kept')
    return { applied: true }
  }
  const content = contentAfterRevert(entry, direction)
  if (content === null) await api.fsUnlink(scope, path).catch(() => undefined)
  else if (typeof content === 'string') await api.fsWrite(scope, path, content)
  applyReviewDecision(entry, direction === 'undo' ? undefined : 'undone')
  return { applied: true, content }
}
