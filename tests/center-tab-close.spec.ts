import { describe, expect, it } from 'vitest'
import {
  closeAllCenterTabs,
  closeOtherCenterTabs,
  closeTab,
  makeDefaultState,
  CENTER_PANE_ID,
  type SidebarTab,
} from '../src/client/state.ts'

function fileTab(id: string): SidebarTab {
  return { id, type: 'editor', title: `${id}.ts`, path: `/${id}.ts` }
}

describe('conversation-header tab close', () => {
  it('closeTab drops one docked file and activates the last remaining', () => {
    let state = makeDefaultState()
    state = {
      ...state,
      centerTabs: [fileTab('a'), fileTab('b'), fileTab('c')],
      centerActive: 'b',
    }
    state = closeTab(state, CENTER_PANE_ID, 'b')
    expect(state.centerTabs.map(tab => tab.id)).toEqual(['a', 'c'])
    expect(state.centerActive).toBe('c')
  })

  it('closeOtherCenterTabs keeps the clicked file and makes it active', () => {
    let state = makeDefaultState()
    state = {
      ...state,
      centerTabs: [fileTab('a'), fileTab('b'), fileTab('c')],
      centerActive: 'a',
    }
    state = closeOtherCenterTabs(state, 'b')
    expect(state.centerTabs.map(tab => tab.id)).toEqual(['b'])
    expect(state.centerActive).toBe('b')
  })

  it('closeAllCenterTabs clears the strip and hides the preview', () => {
    let state = makeDefaultState()
    state = {
      ...state,
      centerTabs: [fileTab('a'), fileTab('b')],
      centerActive: 'a',
    }
    state = closeAllCenterTabs(state)
    expect(state.centerTabs).toEqual([])
    expect(state.centerActive).toBeNull()
  })
})
