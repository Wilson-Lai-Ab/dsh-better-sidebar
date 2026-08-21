/**
 * IDEA-style grouping of git status paths. `module` buckets by the first
 * path segment (typical Maven/Gradle multi-module layout); `directory`
 * buckets by the file's parent directory; `none` is a flat list.
 */

export type GitGroupBy = 'none' | 'directory' | 'module'

/** The group key of one repo-relative path (`''` = repository root). */
export function groupKeyOf(path: string, mode: GitGroupBy): string {
  const norm = path.replace(/\\/g, '/')
  if (mode === 'none') return ''
  if (mode === 'directory') {
    const slash = norm.lastIndexOf('/')
    return slash === -1 ? '' : norm.slice(0, slash)
  }
  const slash = norm.indexOf('/')
  return slash === -1 ? '' : norm.slice(0, slash)
}

/** The file name shown inside a group (basename); the full path when ungrouped. */
export function displayNameOf(path: string, mode: GitGroupBy): string {
  if (mode === 'none') return path
  const norm = path.replace(/\\/g, '/')
  const slash = Math.max(norm.lastIndexOf('/'), norm.lastIndexOf('\\'))
  return slash === -1 ? path : path.slice(slash + 1)
}

/** Stable-sort entries into named groups (root group first, then alpha). */
export function groupEntries<T extends { path: string }>(
  entries: readonly T[],
  mode: GitGroupBy,
): { key: string; entries: T[] }[] {
  if (mode === 'none') return [{ key: '', entries: [...entries] }]
  const buckets = new Map<string, T[]>()
  for (const entry of entries) {
    const key = groupKeyOf(entry.path, mode)
    const bucket = buckets.get(key)
    if (bucket === undefined) buckets.set(key, [entry])
    else bucket.push(entry)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (a === '') return -1
      if (b === '') return 1
      return a.localeCompare(b)
    })
    .map(([key, grouped]) => ({ key, entries: grouped }))
}
