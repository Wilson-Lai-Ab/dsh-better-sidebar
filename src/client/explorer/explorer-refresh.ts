/**
 * Explorer tree refresh: which directories are on screen, and whether a
 * listing actually changed. The tree caches each level until the user hits
 * Refresh; a quiet poll of these dirs is what makes new files appear
 * without that click (Finder/VS Code watch the disk; this plugin's host
 * has no fs.watch, so the client re-lists the visible set).
 */

export const EXPLORER_POLL_MS = 2000

/** Workspace root plus expanded folders, de-duplicating the root. */
export function visibleExplorerDirs(cwd: string | undefined, expanded: readonly string[]): string[] {
  if (cwd === undefined || cwd === '') return []
  const dirs = [cwd]
  for (const dir of expanded) {
    if (dir !== '' && dir !== cwd) dirs.push(dir)
  }
  return dirs
}

/** True when both listings name the same entry paths in the same order. */
export function listingsEqual(
  previous: readonly { path: string }[] | undefined,
  next: readonly { path: string }[],
): boolean {
  if (previous === undefined) return false
  if (previous.length !== next.length) return false
  for (let i = 0; i < previous.length; i += 1) {
    if (previous[i]!.path !== next[i]!.path) return false
  }
  return true
}