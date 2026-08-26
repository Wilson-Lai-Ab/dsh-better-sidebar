/**
 * Path projection helpers shared by the explorer rows: a path relative to
 * the session cwd (for the @-reference button and "copy relative path").
 * The fs-tree joins with '/' even on Windows, so both separators normalize
 * to '/' before comparison.
 */

/**
 * The path relative to the session's working directory.
 * @param cwd - the explorer root (absolute).
 * @param path - an absolute entry path from the fs-tree.
 * @returns the relative path with '/' separators ('.' for the cwd itself),
 * or `path` unchanged when it lies outside the cwd.
 *
 * The prefix test is case-insensitive: Windows paths (and macOS's
 * case-insensitive volumes) may arrive with different casing than the cwd
 * row, and the containment decision must not depend on it. The returned
 * relative text keeps the caller's own casing.
 */
export function relativeTo(cwd: string, path: string): string {
  const base = cwd.replace(/[\\/]+$/, '')
  const norm = (value: string): string => value.replace(/\\/g, '/')
  const nBase = norm(base)
  const nPath = norm(path)
  if (nPath === nBase) return '.'
  if (nPath.toLowerCase().startsWith(`${nBase.toLowerCase()}/`)) return nPath.slice(nBase.length + 1)
  return path
}

/** Whether two explorer paths name the same file (separators + letter case). */
export function sameFsPath(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined || a === '' || b === '') return false
  return a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase()
}

/**
 * Absolute directories that must be expanded to show `path` in the explorer.
 * Empty when the file sits in the workspace root; null when it is outside.
 */
export function ancestorDirsOf(cwd: string, path: string): string[] | null {
  const rel = relativeTo(cwd, path)
  if (rel === path) return null
  if (rel === '.') return []
  const parts = rel.split('/').filter(part => part !== '')
  if (parts.length <= 1) return []
  parts.pop()
  const sep = cwd.includes('\\') ? '\\' : '/'
  const base = cwd.replace(/[\\/]+$/, '')
  const dirs: string[] = []
  let acc = base
  for (const part of parts) {
    acc = `${acc}${sep}${part}`
    dirs.push(acc)
  }
  return dirs
}
