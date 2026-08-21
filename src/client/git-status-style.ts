/**
 * Shared git-status coloring for the Git panel and the explorer.
 * One letter (index, else worktree) picks the color; directories inherit
 * the strongest color of any descendant change.
 */
import { useEffect, useState } from 'react'
import type { SidebarTab } from './state.ts'
import { api, type GitStatusEntry, type GitStatusResult, type SessionScope } from './api.ts'
import css from './sidebar.module.css'

export type GitStatusKind = 'add' | 'mod' | 'del' | 'untracked' | 'conflict'

const KIND_RANK: Record<GitStatusKind, number> = {
  conflict: 5,
  untracked: 4,
  mod: 3,
  add: 2,
  del: 1,
}

/** The XY letter a row badge shows (X = index, Y = worktree). */
export function badgeOf(entry: GitStatusEntry): string {
  const index = entry.xy[0]
  const worktree = entry.xy[1]
  if (index !== undefined && index !== ' ' && index !== '?') return index
  if (worktree !== undefined && worktree !== ' ' && worktree !== '?') return worktree
  return '?'
}

export function kindOfBadge(badge: string): GitStatusKind | undefined {
  switch (badge) {
    case 'A': return 'add'
    case '?': return 'untracked'
    case 'D': return 'del'
    case 'U': return 'conflict'
    case 'M':
    case 'R':
    case 'C':
    case 'T': return 'mod'
    default: return undefined
  }
}

export function kindOfEntry(entry: GitStatusEntry): GitStatusKind | undefined {
  return kindOfBadge(badgeOf(entry))
}

export function classOfKind(kind: GitStatusKind | undefined): string | undefined {
  if (kind === 'add') return css.gitAdded
  if (kind === 'untracked') return css.gitUntracked
  if (kind === 'del') return css.gitDeleted
  if (kind === 'conflict') return css.gitConflict
  if (kind === 'mod') return css.gitModified
  return undefined
}

function stronger(a: GitStatusKind | undefined, b: GitStatusKind): GitStatusKind {
  if (a === undefined) return b
  return KIND_RANK[b] > KIND_RANK[a] ? b : a
}

function normalizeAbs(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

function joinAbs(root: string, rel: string): string {
  const base = normalizeAbs(root)
  const rest = rel.replace(/\\/g, '/').replace(/^\/+/, '')
  return rest === '' ? base : `${base}/${rest}`
}

function parentAbs(path: string): string | undefined {
  const at = path.lastIndexOf('/')
  if (at <= 0) return undefined
  return path.slice(0, at)
}

/** Absolute-path → status kind, including ancestor directories. */
export function gitKindByPath(status: GitStatusResult | undefined): Map<string, GitStatusKind> {
  const map = new Map<string, GitStatusKind>()
  if (status === undefined || !status.isRepo || status.root === undefined) return map
  const root = normalizeAbs(status.root)
  for (const entry of status.entries) {
    const kind = kindOfEntry(entry)
    if (kind === undefined) continue
    const rel = entry.path.replace(/\\/g, '/')
    const abs = joinAbs(root, rel)
    map.set(abs, stronger(map.get(abs), kind))
    map.set(rel, stronger(map.get(rel), kind))
    let dir = parentAbs(abs)
    while (dir !== undefined && (dir === root || dir.startsWith(`${root}/`))) {
      map.set(dir, stronger(map.get(dir), kind))
      if (dir === root) break
      dir = parentAbs(dir)
    }
  }
  return map
}

/** Workspace path a tab should color from (editor / worktree / commit file). */
export function workspacePathOfTab(tab: SidebarTab): string | undefined {
  if (tab.type === 'editor' && tab.path !== undefined && tab.path !== '') return tab.path
  if (tab.type === 'diff') {
    if (tab.diff?.kind === 'worktree') return tab.diff.path
    if (tab.diff?.kind === 'commit' && tab.diff.path !== undefined && tab.diff.path !== '') return tab.diff.path
  }
  return tab.path
}

let lastGitKinds = new Map<string, GitStatusKind>()

/** Latest git-status map (header decorate reads this between polls). */
export function latestGitKinds(): Map<string, GitStatusKind> {
  return lastGitKinds
}

/** Live git-status map for coloring explorer rows and file tabs. */
export function useGitKindMap(scope: SessionScope | undefined): Map<string, GitStatusKind> {
  const [kinds, setKinds] = useState<Map<string, GitStatusKind>>(() => lastGitKinds)
  useEffect(() => {
    if (scope === undefined || scope.sessionId === '') {
      setKinds(new Map())
      return
    }
    let cancelled = false
    const load = (): void => {
      void api.gitStatus(scope).then((status) => {
        if (cancelled) return
        lastGitKinds = gitKindByPath(status)
        setKinds(lastGitKinds)
      }).catch(() => {
        if (cancelled) return
        lastGitKinds = new Map()
        setKinds(lastGitKinds)
      })
    }
    load()
    const timer = window.setInterval(load, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [scope?.sessionId, scope?.cwd])
  return kinds
}
