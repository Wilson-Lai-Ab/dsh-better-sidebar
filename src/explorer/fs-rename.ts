/**
 * Sibling-only rename fence: the destination must sit next to the source
 * (no directory moves) and the new name must be a single path segment.
 */
import { basename, dirname } from 'node:path'
import { isWithin, requireAbsolute } from './fs-tree.ts'
import { SidebarError } from '../wire.ts'

const BAD_NAMES = new Set(['', '.', '..'])

/** True when `name` is a single path segment (no slash, not `.` / `..`). */
export function isRenameName(name: string): boolean {
  const trimmed = name.trim()
  if (BAD_NAMES.has(trimmed)) return false
  return !trimmed.includes('/') && !trimmed.includes('\\')
}

/**
 * Resolve and fence a rename. Throws SidebarError when the pair is not a
 * sibling rename under `cwd`.
 */
export function fencedRename(cwd: string, fromRaw: string, toRaw: string): { from: string; to: string } {
  const from = requireAbsolute(fromRaw)
  const to = requireAbsolute(toRaw)
  if (!isWithin(cwd, from) || !isWithin(cwd, to)) {
    throw new SidebarError('forbidden', 'path is outside the session workspace', 403)
  }
  if (from === cwd || to === cwd) {
    throw new SidebarError('forbidden', 'cannot rename the workspace root', 403)
  }
  if (dirname(from) !== dirname(to)) {
    throw new SidebarError('bad-request', 'rename must stay in the same directory')
  }
  if (!isRenameName(basename(to))) {
    throw new SidebarError('bad-request', `invalid name "${basename(to)}"`)
  }
  return { from, to }
}
