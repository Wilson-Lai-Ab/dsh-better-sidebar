/**
 * Which file the explorer "locate" button should open: the conversation
 * header preview first, then any open sidebar tab that carries a workspace
 * file path (editor, local-history review/compare, git worktree diffs).
 */
import { allLeaves, type SidebarState, type SidebarTab } from '../state.ts'
import { resolveSidebarPath } from '../produced-files.ts'

function isWorkspaceFilePath(path: string): boolean {
  if (path === '') return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) && !/^[a-zA-Z]:[\\/]/.test(path)) return false
  return true
}

function filePathOf(tab: SidebarTab | undefined): string | undefined {
  if (tab === undefined) return undefined
  if (tab.type === 'diff') {
    if (tab.diff?.kind === 'worktree' && isWorkspaceFilePath(tab.diff.path)) return tab.diff.path
    if (tab.diff?.kind === 'commit' && tab.diff.path !== undefined && isWorkspaceFilePath(tab.diff.path)) {
      return tab.diff.path
    }
  }
  if (typeof tab.path === 'string' && isWorkspaceFilePath(tab.path)) return tab.path
  return undefined
}

export function previewFilePathOf(state: SidebarState, cwd?: string): string | undefined {
  const resolve = (path: string): string => resolveSidebarPath(cwd, path)
  if (state.centerActive !== null) {
    const path = filePathOf(state.centerTabs.find(item => item.id === state.centerActive))
    if (path !== undefined) return resolve(path)
  }
  const leaves = allLeaves(state.splits).concat(allLeaves(state.bottomSplits))
  const preferred = state.activePane === null ? undefined : leaves.find(item => item.id === state.activePane)
  const ordered = preferred === undefined ? leaves : [preferred, ...leaves.filter(leaf => leaf !== preferred)]
  for (const leaf of ordered) {
    const active = filePathOf(leaf.tabs.find(item => item.id === leaf.active))
    if (active !== undefined) return resolve(active)
  }
  for (const leaf of ordered) {
    for (const tab of leaf.tabs) {
      const path = filePathOf(tab)
      if (path !== undefined) return resolve(path)
    }
  }
  return undefined
}