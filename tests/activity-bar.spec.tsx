/**
 * Activity-bar interaction tests: the VS Code-style view rail. Covers the
 * open affordance (click / Enter / Space), the disabled state (aria + no
 * open), and badge rendering. The per-view close affordances were removed
 * by request — the active icon no longer carries a hover-×.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

// The act() environment flag (React 18.2 reads it before flushing effects).
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

import { ActivityBar, Workbench, type WorkbenchActions } from '../src/client/split-pane.tsx'
import { TabBar } from '../src/client/TabBar.tsx'
import type { NewTabOption } from '../src/client/TabBar.tsx'
import type { SidebarState, SidebarTab, SplitNode } from '../src/client/state.ts'

const options: NewTabOption[] = [
  { id: 'explorer', label: 'Explorer' },
  { id: 'terminal', label: 'Terminal', disabled: true },
]

interface MountResult {
  items: HTMLElement[]
  onSelect: ReturnType<typeof vi.fn>
  unmount: () => void
}

function mountBar(props: {
  activeType?: string
  getBadge?: (typeId: string) => React.ReactNode
  onSelect?: (id: string) => void
}): MountResult {
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  const onSelect = vi.fn(props.onSelect)
  act(() => {
    root.render(createElement(ActivityBar, {
      options,
      activeType: props.activeType,
      onSelect,
      getBadge: props.getBadge,
    }))
  })
  const bar = container.querySelector('[data-sidebar-activity-bar]') as HTMLElement | null
  expect(bar).not.toBeNull()
  const items = [...(bar?.children ?? [])] as HTMLElement[]
  return {
    items,
    onSelect,
    unmount: () => {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

function keyOn(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ActivityBar', () => {
  it('renders one item per option with the label; disabled options are marked', () => {
    const { items, unmount } = mountBar({})
    try {
      expect(items).toHaveLength(2)
      expect(items[0]?.getAttribute('aria-label')).toBe('Explorer')
      expect(items[1]?.getAttribute('aria-label')).toBe('Terminal')
      expect(items[1]?.getAttribute('aria-disabled')).toBe('true')
      expect(items[0]?.getAttribute('aria-disabled')).toBeNull()
    } finally {
      unmount()
    }
  })

  it('a disabled-but-active view is not announced disabled', () => {
    const { items, unmount } = mountBar({ activeType: 'terminal' })
    try {
      // Terminal is disabled by `available` yet open: it must read as the
      // active view, not as a disabled control.
      expect(items[1]?.getAttribute('aria-disabled')).toBeNull()
    } finally {
      unmount()
    }
  })

  it('click opens the view; disabled options ignore clicks', () => {
    const { items, onSelect, unmount } = mountBar({})
    try {
      ;(items[0] as HTMLElement).click()
      expect(onSelect).toHaveBeenCalledWith('explorer')
      ;(items[1] as HTMLElement).click()
      expect(onSelect).toHaveBeenCalledTimes(1)
    } finally {
      unmount()
    }
  })

  it('Enter and Space on the item open the view', () => {
    const { items, onSelect, unmount } = mountBar({})
    try {
      keyOn(items[0] as HTMLElement, 'Enter')
      keyOn(items[0] as HTMLElement, ' ')
      expect(onSelect).toHaveBeenCalledTimes(2)
      expect(onSelect).toHaveBeenCalledWith('explorer')
    } finally {
      unmount()
    }
  })

  it('renders a badge when getBadge provides one for the type', () => {
    const badge = (typeId: string) => (typeId === 'terminal' ? createElement('span', null, '2') : null)
    const { items, unmount } = mountBar({ getBadge: badge })
    try {
      // The badge resolver is per-type: only the terminal item carries it.
      expect(items[1]?.textContent).toContain('2')
      expect(items[0]?.textContent).not.toContain('2')
    } finally {
      unmount()
    }
  })
})

describe('Workbench activity-bar routing', () => {
  /** A two-tree state whose global activePane points into the RIGHT tree.
   *  Mounting a workbench on either tree with it reproduces the cross-tree
   *  hazard: an activity-bar open must first focus THIS tree's pane so the
   *  tab lands in the mounted panel, not the other one. */
  function makeState(): SidebarState {
    return {
      panelOpen: true,
      width: 400,
      activePane: 'pane:right',
      nextTerminal: 1,
      nextBrowser: 1,
      expanded: [],
      splits: { kind: 'leaf', id: 'pane:right', tabs: [{ id: 'tab:browser', type: 'browser', title: 'Browser' }], active: 'tab:browser' },
      bottomOpen: true,
      bottomHeight: 220,
      bottomOpenedOnce: true,
      bottomSplits: { kind: 'leaf', id: 'pane:bottom', tabs: [], active: null },
      centerTabs: [],
      centerActive: null,
    }
  }

  function mountWorkbench(opts: {
    tree: SplitNode
    newTabOptions?: NewTabOption[]
    showActivityBar?: boolean
    activityBarSide?: 'left' | 'right'
    panelOpen?: boolean
  }): {
    focusPane: ReturnType<typeof vi.fn>
    onNewTab: ReturnType<typeof vi.fn>
    onTogglePanel: ReturnType<typeof vi.fn>
    unmount: () => void
  } {
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    const focusPane = vi.fn()
    const onNewTab = vi.fn()
    const onTogglePanel = vi.fn()
    const actions: WorkbenchActions = {
      closeTab: () => {},
      activateTab: () => {},
      focusPane,
      moveTabToEdge: () => {},
      moveTabBefore: () => {},
      dockTabToCenter: () => {},
      resizeSplit: () => {},
    }
    act(() => {
      root.render(createElement(Workbench, {
        state: makeState(),
        tree: opts.tree,
        newTabOptions: opts.newTabOptions ?? [{ id: 'explorer', label: 'Explorer' }],
        actions,
        onNewTab,
        renderTab: (tab) => createElement('span', null, tab.title),
        showActivityBar: opts.showActivityBar,
        activityBarSide: opts.activityBarSide,
        panelOpen: opts.panelOpen,
        onTogglePanel,
      }))
    })
    return {
      focusPane,
      onNewTab,
      onTogglePanel,
      unmount: () => {
        act(() => { root.unmount() })
        container.remove()
      },
    }
  }

  it('the bottom workbench hides its activity bar (the terminal panel is content-only)', () => {
    const { onNewTab, unmount } = mountWorkbench({
      tree: { kind: 'leaf', id: 'pane:bottom', tabs: [], active: null },
      showActivityBar: false,
    })
    try {
      // No rail: the bottom workbench renders just the pane content, so no
      // click can escape into the wrong panel.
      expect(document.querySelector('[data-sidebar-activity-bar]')).toBeNull()
      expect(onNewTab).not.toHaveBeenCalled()
    } finally {
      unmount()
    }
  })

  it('the right workbench hugs the rail to its RIGHT edge (content against the chat)', () => {
    const { unmount } = mountWorkbench({
      tree: { kind: 'leaf', id: 'pane:right', tabs: [{ id: 'tab:browser', type: 'browser', title: 'Browser' }], active: 'tab:browser' },
      activityBarSide: 'right',
    })
    try {
      const bar = document.querySelector('[data-sidebar-activity-bar]') as HTMLElement
      expect(bar).not.toBeNull()
      expect([...bar.classList].some(c => c.includes('activityBarRight'))).toBe(true)
      // The rail is the LAST child of the workbench — content sits first.
      const workbench = bar.parentElement!
      expect(workbench.lastElementChild).toBe(bar)
    } finally {
      unmount()
    }
  })

  it('bar opens route into THIS tree even when the global active pane is in the other tree', () => {
    // state.activePane = pane:right; mounting the bottom tree must still
    // pin pane:bottom BEFORE the open fires (per-panel semantics).
    const { focusPane, onNewTab, unmount } = mountWorkbench({
      tree: { kind: 'leaf', id: 'pane:bottom', tabs: [], active: null },
    })
    try {
      const bar = document.querySelector('[data-sidebar-activity-bar]') as HTMLElement
      expect(bar).not.toBeNull()
      const explorer = bar?.querySelector('[role="button"][aria-label="Explorer"]') as HTMLElement
      explorer.click()
      expect(focusPane).toHaveBeenCalledWith('pane:bottom')
      expect(onNewTab).toHaveBeenCalledWith('explorer')
      const focusOrder = focusPane.mock.invocationCallOrder[0] ?? 0
      const openOrder = onNewTab.mock.invocationCallOrder[0] ?? 0
      expect(focusOrder).toBeLessThan(openOrder)
    } finally {
      unmount()
    }
  })

  describe('active-icon toggle (VS Code collapse)', () => {
    // The right workbench's own view is a browser tab.
    const tree: SplitNode = {
      kind: 'leaf',
      id: 'pane:right',
      tabs: [{ id: 'tab:browser', type: 'browser', title: 'Browser' }],
      active: 'tab:browser',
    }
    const options: NewTabOption[] = [
      { id: 'browser', label: 'Browser' },
      { id: 'explorer', label: 'Explorer' },
    ]

    function barOf(): HTMLElement {
      const bar = document.querySelector('[data-sidebar-activity-bar]') as HTMLElement
      expect(bar).not.toBeNull()
      return bar
    }

    it('clicking the ACTIVE SINGLE view\'s icon collapses the panel and does NOT open anything', () => {
      // A single-instance view (explorer) as the active tab: clicking its
      // icon collapses (VS Code). Multi-instance views (browser/terminal)
      // behave differently — see the next test.
      const singleTree: SplitNode = {
        kind: 'leaf',
        id: 'pane:right',
        tabs: [{ id: 'tab:explorer', type: 'explorer', title: 'Explorer' }],
        active: 'tab:explorer',
      }
      const { focusPane, onNewTab, onTogglePanel, unmount } = mountWorkbench({
        tree: singleTree, newTabOptions: options, panelOpen: true,
      })
      try {
        const explorer = barOf().querySelector('[role="button"][aria-label="Explorer"]') as HTMLElement
        explorer.click()
        // The panel collapses; no tab open fires (the collapsed panel's
        // activity bar — now the only affordance — must not double-open).
        expect(onTogglePanel).toHaveBeenCalledTimes(1)
        expect(onNewTab).not.toHaveBeenCalled()
        expect(focusPane).not.toHaveBeenCalled()
      } finally {
        unmount()
      }
    })

    it('clicking the ACTIVE MULTI view\'s icon opens ANOTHER instance instead of collapsing', () => {
      // browser is multi-instance (createTab mints browser:<n>): the active
      // icon click must mint a new one, not collapse the panel (multi-open).
      const { focusPane, onNewTab, onTogglePanel, unmount } = mountWorkbench({
        tree, newTabOptions: [
          { id: 'browser', label: 'Browser', multi: true },
          { id: 'explorer', label: 'Explorer' },
        ],
        panelOpen: true,
      })
      try {
        const browser = barOf().querySelector('[role="button"][aria-label="Browser"]') as HTMLElement
        browser.click()
        expect(onTogglePanel).not.toHaveBeenCalled()
        expect(focusPane).toHaveBeenCalledWith('pane:right')
        expect(onNewTab).toHaveBeenCalledWith('browser')
      } finally {
        unmount()
      }
    })

    it('clicking a non-active icon while the panel is OPEN opens that view without toggling', () => {
      const { focusPane, onNewTab, onTogglePanel, unmount } = mountWorkbench({
        tree, newTabOptions: options, panelOpen: true,
      })
      try {
        const explorer = barOf().querySelector('[role="button"][aria-label="Explorer"]') as HTMLElement
        explorer.click()
        expect(onTogglePanel).not.toHaveBeenCalled()
        expect(focusPane).toHaveBeenCalledWith('pane:right')
        expect(onNewTab).toHaveBeenCalledWith('explorer')
      } finally {
        unmount()
      }
    })

    it('clicking ANY icon while the panel is COLLAPSED expands it first so the open lands in sight', () => {
      const { focusPane, onNewTab, onTogglePanel, unmount } = mountWorkbench({
        tree, newTabOptions: options, panelOpen: false,
      })
      try {
        const explorer = barOf().querySelector('[role="button"][aria-label="Explorer"]') as HTMLElement
        explorer.click()
        // Expand (so the new view is visible), then open it.
        expect(onTogglePanel).toHaveBeenCalledTimes(1)
        expect(focusPane).toHaveBeenCalledWith('pane:right')
        expect(onNewTab).toHaveBeenCalledWith('explorer')
        const expandOrder = onTogglePanel.mock.invocationCallOrder[0] ?? 0
        const openOrder = onNewTab.mock.invocationCallOrder[0] ?? 0
        expect(expandOrder).toBeLessThan(openOrder)
      } finally {
        unmount()
      }
    })

    it('clicking the ACTIVE view\'s icon while COLLAPSED expands back to that view', () => {
      const { focusPane, onNewTab, onTogglePanel, unmount } = mountWorkbench({
        tree, newTabOptions: options, panelOpen: false,
      })
      try {
        const browser = barOf().querySelector('[role="button"][aria-label="Browser"]') as HTMLElement
        browser.click()
        expect(onTogglePanel).toHaveBeenCalledTimes(1)
        expect(onNewTab).toHaveBeenCalledWith('browser')
        expect(focusPane).toHaveBeenCalledWith('pane:right')
      } finally {
        unmount()
      }
    })
  })
})

describe('TabBar strip filter', () => {
  it('renders only the tabs that pass stripTabFilter', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    const tabs: SidebarTab[] = [
      { id: 't1', type: 'explorer', title: 'Explorer' },
      { id: 't2', type: 'editor', title: 'hello.txt' },
      { id: 't3', type: 'terminal', title: 'Terminal' },
    ]
    // The sidebar's predicate: only hidden (file-preview) types in the strip.
    const isPreview = (tab: SidebarTab): boolean => tab.type !== 'explorer' && tab.type !== 'terminal'
    act(() => {
      root.render(createElement(TabBar, {
        paneId: 'pane:1',
        tabs,
        active: 't2',
        onActivate: () => {},
        onClose: () => {},
        onDropTab: () => {},
        stripTabFilter: isPreview,
      }))
    })
    try {
      const titles = [...container.querySelectorAll('[class*="tabTitle"]')].map(el => (el.textContent ?? '').trim())
      expect(titles).toEqual(['hello.txt'])
    } finally {
      act(() => { root.unmount() })
      container.remove()
    }
  })

  it('renders every tab when no filter is given', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    const tabs: SidebarTab[] = [
      { id: 't1', type: 'explorer', title: 'Explorer' },
      { id: 't2', type: 'terminal', title: 'Terminal' },
    ]
    act(() => {
      root.render(createElement(TabBar, {
        paneId: 'pane:1',
        tabs,
        active: 't1',
        onActivate: () => {},
        onClose: () => {},
        onDropTab: () => {},
      }))
    })
    try {
      const titles = [...container.querySelectorAll('[class*="tabTitle"]')].map(el => (el.textContent ?? '').trim())
      expect(titles).toEqual(['Explorer', 'Terminal'])
    } finally {
      act(() => { root.unmount() })
      container.remove()
    }
  })
})
