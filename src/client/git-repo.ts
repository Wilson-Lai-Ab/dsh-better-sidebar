/**
 * Pick the innermost git work tree that owns a file, then the path git
 * commands expect (repo-relative). File-level and hunk review share this
 * so `git show HEAD:…` never gets an absolute path.
 */
import { api, type SessionScope } from './api.ts'

export function relPathOf(root: string, file: string): string | undefined {
  const base = root.replace(/\\/g, '/').replace(/\/+$/, '')
  const abs = file.replace(/\\/g, '/')
  if (abs === base) return undefined
  if (abs.toLowerCase().startsWith(`${base.toLowerCase()}/`)) return abs.slice(base.length + 1)
  return undefined
}

export function repoRootOf(file: string, roots: readonly string[]): string | undefined {
  const abs = file.replace(/\\/g, '/')
  return [...roots]
    .map(root => root.replace(/\\/g, '/').replace(/\/+$/, ''))
    .filter(root => abs === root || abs.startsWith(`${root}/`))
    .sort((a, b) => b.length - a.length)[0]
}

export interface GitFileTarget {
  scope: SessionScope
  /** Path for `git show` / `git discard` (repo-relative when a repo was found). */
  gitPath: string
  root?: string
}

export async function gitFileTarget(scope: SessionScope, path: string): Promise<GitFileTarget> {
  const listed = await api.gitRepos(scope).catch(() => ({ repos: [] as { root: string }[] }))
  const nested = repoRootOf(path, listed.repos.map(repo => repo.root))
  if (nested === undefined) {
    const status = await api.gitStatus(scope).catch(() => ({ isRepo: false as const, root: undefined }))
    const root = status.isRepo ? status.root : undefined
    const rel = root === undefined ? undefined : relPathOf(root, path)
    return { scope: root === undefined ? scope : { ...scope, repo: root }, gitPath: rel ?? path, root }
  }
  return {
    scope: { ...scope, repo: nested },
    gitPath: relPathOf(nested, path) ?? path,
    root: nested,
  }
}
