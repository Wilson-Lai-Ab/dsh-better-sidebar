/**
 * Explorer row context-menu ids. Kept pure so the item list (Reveal /
 * Terminal / Browser / Rename / Git + the existing download/copy actions)
 * can be pinned without mounting the Menu portal.
 */
export interface ExplorerRowMenuOptions {
  isDir: boolean
  /** The session cwd row cannot be renamed (it is the workspace itself). */
  isRoot: boolean
  /** True when the path sits inside a discovered git work tree. */
  inGit: boolean
}

/** Ordered menu ids for one explorer row (separators omitted). */
export function explorerRowMenuIds(options: ExplorerRowMenuOptions): string[] {
  const ids = ['reveal', 'terminal']
  if (!options.isDir) ids.push('browser')
  if (!options.isRoot) ids.push('rename')
  if (options.inGit) ids.push('git')
  if (!options.isDir) ids.push('download')
  ids.push('relative', 'absolute')
  return ids
}

/** Directory a terminal should spawn in: the row itself, or its parent for a file. */
export function terminalCwdOf(path: string, isDir: boolean): string {
  if (isDir) return path
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return at === -1 ? trimmed : trimmed.slice(0, at)
}

/** Last path segment (rename field's starting value). */
export function entryNameOf(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return at === -1 ? trimmed : trimmed.slice(at + 1)
}

/**
 * Join a sibling name onto `path`'s parent. Rejects empty names, `.` / `..`,
 * and names that contain a path separator.
 */
export function siblingPathOf(path: string, nextName: string): string | undefined {
  const name = nextName.trim()
  if (name === '' || name === '.' || name === '..') return undefined
  if (name.includes('/') || name.includes('\\')) return undefined
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  if (at === -1) return undefined
  const sep = trimmed.includes('\\') && !trimmed.includes('/') ? '\\' : '/'
  return `${trimmed.slice(0, at)}${sep}${name}`
}
