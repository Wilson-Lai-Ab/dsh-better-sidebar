/**
 * Sidebar crash tests — the two failure modes behind issue #31.
 *
 * 1. Layout-push leak: the layout-push effect writes
 *    `--dsh-sidebar-width/--dsh-sidebar-height` on document.documentElement.
 *    Unmounting the Sidebar for ANY reason (error-boundary swap, plugin
 *    disable, HMR) must clear them — otherwise layout.css keeps squeezing
 *    `#root` with a stale margin and "the sidebar cannot be hidden" until a
 *    full page reload.
 *
 * 2. Tab crash containment: a render error inside ONE tab's content must not
 *    take down the whole sidebar. The per-tab boundary shows a strip inside
 *    that tab's pane while the activity bar, the other tabs, and the panel
 *    itself stay alive; the retry button recovers a transient crash.
 *
 * Rendered with the REAL Sidebar shell + real store/service against a minimal
 * fake context (createRoot + act(), the repo's jsdom pattern).
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

// The act() environment flag (React 18.2 reads it before flushing effects).
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

import { Sidebar } from '../src/client/Sidebar.tsx'
import { createSidebarStore, type SidebarStore } from '../src/client/state.ts'
import { createBetterSidebarService, type BetterSidebarService } from '../src/client/service.ts'
import { t } from '../src/client/locales.ts'

/** jsdom has no WebSocket; the agent-terminals push effect constructs one on mount. */
class FakeWebSocket {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  close = (): void => {}
  constructor(_url: string) {}
}

interface MountedSidebar {
  container: HTMLDivElement
  store: SidebarStore
  service: BetterSidebarService
  unmount: () => void
}

/** Mount the real Sidebar shell against a minimal context (real store + service). */
function mountSidebar(): MountedSidebar {
  vi.stubGlobal('WebSocket', FakeWebSocket)
  const container = document.createElement('div')
  document.body.append(container)
  const store = createSidebarStore()
  const service = createBetterSidebarService(store)
  // Fresh-session seed: the panel starts OPEN (openByDefault default true).
  store.setSession('s1')
  // useSyncExternalStore requires STABLE snapshots across calls (the real DSH
  // services return stable objects) — a fresh object per call loops forever.
  const localeSnapshot = { active: 'en' }
  const sessionsSnapshot = {
    current: 's1',
    // cwd present → api.sessionCwd is never called in these tests.
    byId: { s1: { cwd: '/tmp' } },
  }
  const ctx = {
    locale: { subscribe: () => () => {}, getSnapshot: () => localeSnapshot },
    sessions: { list: { subscribe: () => () => {}, getSnapshot: () => sessionsSnapshot } },
    betterSidebar: service,
  }
  const root: Root = createRoot(container)
  act(() => { root.render(createElement(Sidebar, { ctx: ctx as never, store })) })
  return {
    container,
    store,
    service,
    unmount: () => {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('layout-push variable cleanup', () => {
  it('clears --dsh-sidebar-width/--dsh-sidebar-height when the sidebar unmounts', () => {
    const { store, unmount } = mountSidebar()
    const htmlStyle = document.documentElement.style
    // The seeded session is open: the layout push is applied on mount.
    const width = store.getSnapshot().state!.width
    expect(htmlStyle.getPropertyValue('--dsh-sidebar-width')).toBe(`${width}px`)
    expect(htmlStyle.getPropertyValue('--dsh-sidebar-height')).toBe('0px')
    // Any unmount (boundary swap, plugin disable, HMR) must release the push.
    unmount()
    expect(htmlStyle.getPropertyValue('--dsh-sidebar-width')).toBe('')
    expect(htmlStyle.getPropertyValue('--dsh-sidebar-height')).toBe('')
  })
})

describe('tab crash containment', () => {
  it('a crashing tab shows an in-pane strip while the cluster and panel survive', () => {
    const { container, service, store } = mountSidebar()
    service.registerTab({
      id: 'crash',
      title: 'Crash',
      component: () => { throw new Error('boom') },
    })
    act(() => { service.openTab({ type: 'crash', title: 'Crash' }) })
    // The strip lives inside the tab's pane — the crash is contained.
    expect(container.textContent).toContain('boom')
    expect(container.textContent).toContain(t('terminalRetry'))
    // The panel itself survived (no full-tree swap): the activity bar — the
    // panel's open/close affordance now that the toggle cluster is gone — is
    // still mounted, and the layout push is still live.
    expect(container.querySelector('[data-sidebar-activity-bar]')).not.toBeNull()
    expect(document.documentElement.style.getPropertyValue('--dsh-sidebar-width')).toBe(
      `${store.getSnapshot().state!.width}px`,
    )
  })

  it('the retry button recovers a tab whose crash has since been fixed', () => {
    // A PERSISTENT render error reaches the boundary strip (React 18.2
    // auto-recovers transient throws — one bad render followed by a good
    // retry is swallowed as a recoverable error and never shows a strip).
    let shouldThrow = true
    const { container, service } = mountSidebar()
    service.registerTab({
      id: 'crash-until-fixed',
      title: 'Crash until fixed',
      component: () => {
        if (shouldThrow) throw new Error('transient')
        return createElement('div', null, 'recovered')
      },
    })
    act(() => { service.openTab({ type: 'crash-until-fixed', title: 'Crash until fixed' }) })
    expect(container.textContent).toContain('transient')
    const retry = [...container.querySelectorAll('button')]
      .find(button => button.textContent === t('terminalRetry'))
    expect(retry).toBeDefined()
    // The crash condition is gone (e.g. the data arrived): the retry button
    // remounts the tab's content and the strip clears.
    shouldThrow = false
    act(() => { retry!.click() })
    expect(container.textContent).toContain('recovered')
    expect(container.textContent).not.toContain('transient')
  })
})

describe('center preview fallback tab strip (fresh conversation)', () => {
  it('renders a 对话 tab + closable file tab when the host header has no tablist', () => {
    const { container, service, store } = mountSidebar()
    service.registerTab({ id: 'editor', title: () => 'Editor', component: () => 'preview-body' })
    act(() => { service.openTab({ type: 'editor', title: 'pom.xml', path: '/p/pom.xml' }) })
    const state = store.getSnapshot().state!
    expect(state.centerTabs.map(t => t.title)).toContain('pom.xml')
    expect(state.centerActive).not.toBeNull()
    const strip = container.querySelector('[class*="centerPreviewTabs"]')
    expect(strip).not.toBeNull()
    expect(strip!.textContent).toContain(t('conversationTab'))
    expect(strip!.textContent).toContain('pom.xml')
    const close = strip!.querySelector('[class*="centerPreviewClose"]')
    expect(close).not.toBeNull()
    // Clicking the file tab's close button removes it entirely.
    act(() => { (close as HTMLElement).click() })
    expect(store.getSnapshot().state!.centerTabs).toHaveLength(0)
    expect(store.getSnapshot().state!.centerActive).toBeNull()
  })

  it('clicking the 对话 tab hides the preview but keeps the docked file', () => {
    const { container, service, store } = mountSidebar()
    service.registerTab({ id: 'editor', title: () => 'Editor', component: () => 'preview-body' })
    act(() => { service.openTab({ type: 'editor', title: 'pom.xml', path: '/p/pom.xml' }) })
    const strip = container.querySelector('[class*="centerPreviewTabs"]')
    const chatTab = [...(strip?.querySelectorAll('[role="tab"]') ?? [])]
      .find(tab => tab.textContent === t('conversationTab'))
    expect(chatTab).toBeDefined()
    act(() => { (chatTab as HTMLElement).click() })
    // The preview is hidden (centerActive → null) but the file stays docked.
    expect(store.getSnapshot().state!.centerActive).toBeNull()
    expect(store.getSnapshot().state!.centerTabs).toHaveLength(1)
  })
})
