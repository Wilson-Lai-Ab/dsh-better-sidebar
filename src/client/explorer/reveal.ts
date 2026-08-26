/**
 * Which file the explorer "locate" button should open: the conversation
 * header preview first, then any open sidebar editor.
 */
import { allLeaves, type SidebarState, type SidebarTab } from '../state.ts'

function editorPathOf(tab: SidebarTab | undefined): string | undefined {
  if (tab?.type === 'editor' && typeof tab.path === 'string' && tab.path !== '') return tab.path
  return undefined
}

export function previewFilePathOf(state: SidebarState): string | undefined {
  if (state.centerActive !== null) {
    const path = editorPathOf(state.centerTabs.find(item => item.id === state.centerActive))
    if (path !== undefined) return path
  }
  const leaves = allLeaves(state.splits).concat(allLeaves(state.bottomSplits))
  const preferred = state.activePane === null ? undefined : leaves.find(item => item.id === state.activePane)
  const ordered = preferred === undefined ? leaves : [preferred, ...leaves.filter(leaf => leaf !== preferred)]
  for (const leaf of ordered) {
    const active = editorPathOf(leaf.tabs.find(item => item.id === leaf.active))
    if (active !== undefined) return active
  }
  for (const leaf of ordered) {
    for (const tab of leaf.tabs) {
      const path = editorPathOf(tab)
      if (path !== undefined) return path
    }
  }
  return undefined
}
