/**
 * Source-control header dropdowns. Native <select> popups are clipped by the
 * sidebar's overflow:hidden ancestors, so the branch and group-by pickers
 * must be button + portaled Menu (same pattern as the repo picker).
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { GitView } from '../src/client/GitView.tsx'
import { createSidebarStore } from '../src/client/state.ts'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function jsonResponse(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as unknown as Response
}

const checkoutCalls: string[] = []

function mount(node: ReactNode): { container: HTMLDivElement; unmount: () => void } {
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  act(() => { root.render(node) })
  return {
    container,
    unmount: () => {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await act(async () => { await Promise.resolve() })
  }
}

beforeEach(() => {
  checkoutCalls.length = 0
  localStorage.clear()
  vi.stubGlobal('fetch', async (url: string | URL | Request) => {
    const method = String(url).split('/').pop()
    if (method === 'git.repos') {
      return jsonResponse({ ok: true, value: { repos: [{ root: '/repo', name: 'repo', rel: '.' }] } })
    }
    if (method === 'git.status') {
      return jsonResponse({
        ok: true,
        value: { isRepo: true, branch: 'main', root: '/repo', entries: [] },
      })
    }
    if (method === 'git.branch') {
      return jsonResponse({ ok: true, value: { current: 'main', names: ['main', 'feature'] } })
    }
    if (method === 'git.checkout') {
      checkoutCalls.push(String(url))
      return jsonResponse({ ok: true, value: { ok: true } })
    }
    throw new Error(`unexpected fetch ${String(url)}`)
  })
  Object.defineProperty(globalThis.navigator, 'language', { value: 'zh-CN', configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  for (const el of document.querySelectorAll('body > div')) el.remove()
})

describe('GitView header dropdowns', () => {
  it('does not use native <select> for branch or grouping (overflow clips the popup)', async () => {
    const { container, unmount } = mount(createElement(GitView, {
      scope: { sessionId: 's1', cwd: '/repo' },
      store: createSidebarStore(),
      onOpenFile: () => {},
      onOpenDiff: () => {},
    }))
    try {
      await flush()
      expect(container.querySelectorAll('select')).toHaveLength(0)
      expect(container.querySelector('[aria-label="分支"]')).not.toBeNull()
      expect(container.querySelector('[aria-label="分组"]')).not.toBeNull()
    } finally {
      unmount()
    }
  })

  it('opens a portaled branch menu and checks out the chosen branch', async () => {
    const { container, unmount } = mount(createElement(GitView, {
      scope: { sessionId: 's1', cwd: '/repo' },
      store: createSidebarStore(),
      onOpenFile: () => {},
      onOpenDiff: () => {},
    }))
    try {
      await flush()
      const trigger = container.querySelector('[aria-label="分支"]') as HTMLButtonElement
      expect(trigger).not.toBeNull()
      act(() => { trigger.click() })
      const feature = [...document.querySelectorAll('[role="menuitem"]')]
        .find(node => node.textContent === 'feature') as HTMLElement | undefined
      expect(feature).not.toBeUndefined()
      // Portaled: the menu lives outside the overflowing git panel.
      expect(container.contains(feature!)).toBe(false)
      act(() => { feature!.click() })
      await flush()
      expect(checkoutCalls.length).toBeGreaterThan(0)
    } finally {
      unmount()
    }
  })

  it('opens a portaled group-by menu and persists the choice', async () => {
    const { container, unmount } = mount(createElement(GitView, {
      scope: { sessionId: 's1', cwd: '/repo' },
      store: createSidebarStore(),
      onOpenFile: () => {},
      onOpenDiff: () => {},
    }))
    try {
      await flush()
      const trigger = container.querySelector('[aria-label="分组"]') as HTMLButtonElement
      expect(trigger).not.toBeNull()
      act(() => { trigger.click() })
      const none = [...document.querySelectorAll('[role="menuitem"]')]
        .find(node => node.textContent === '不分组') as HTMLElement | undefined
      expect(none).not.toBeUndefined()
      expect(container.contains(none!)).toBe(false)
      act(() => { none!.click() })
      expect(localStorage.getItem('dsh-sidebar:git-group-by')).toBe('none')
    } finally {
      unmount()
    }
  })

  it('keeps the repo picker available when the session cwd is not itself a git repo', async () => {
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      const method = String(url).split('/').pop()
      const body = JSON.parse(String(init?.body ?? '{}')) as { repo?: string }
      if (method === 'git.repos') {
        return jsonResponse({
          ok: true,
          value: {
            repos: [
              { root: '/ws/other', name: 'other', rel: 'other' },
              { root: '/ws/dsh-at-file', name: 'dsh-at-file', rel: 'dsh-at-file' },
            ],
          },
        })
      }
      if (method === 'git.status') {
        if (body.repo === '/ws/dsh-at-file') {
          return jsonResponse({
            ok: true,
            value: {
              isRepo: true,
              branch: 'main',
              root: '/ws/dsh-at-file',
              entries: [{ path: 'a.txt', xy: '??' }],
            },
          })
        }
        return jsonResponse({ ok: true, value: { isRepo: false, entries: [] } })
      }
      if (method === 'git.branch') {
        if (body.repo === '/ws/dsh-at-file') {
          return jsonResponse({ ok: true, value: { current: 'main', names: ['main'] } })
        }
        return jsonResponse({ ok: true, value: { current: '', names: [] } })
      }
      throw new Error(`unexpected fetch ${String(url)}`)
    })
    const { container, unmount } = mount(createElement(GitView, {
      scope: { sessionId: 's1', cwd: '/ws' },
      store: createSidebarStore(),
      onOpenFile: () => {},
      onOpenDiff: () => {},
    }))
    try {
      await flush()
      expect(container.textContent).toContain('当前目录不是 git 仓库')
      const trigger = container.querySelector('[aria-label="仓库"]') as HTMLButtonElement
      expect(trigger).not.toBeNull()
      act(() => { trigger.click() })
      const option = [...document.querySelectorAll('[role="menuitem"]')]
        .find(node => node.textContent?.includes('dsh-at-file')) as HTMLElement | undefined
      expect(option).not.toBeUndefined()
      expect(container.contains(option!)).toBe(false)
      act(() => { option!.click() })
      await flush()
      expect(container.textContent).toContain('a.txt')
      expect(container.textContent).not.toContain('当前目录不是 git 仓库')
    } finally {
      unmount()
    }
  })

  it('keeps the nested repo and change list when the git pane remounts (first diff splits it)', async () => {
    vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
      const method = String(url).split('/').pop()
      const body = JSON.parse(String(init?.body ?? '{}')) as { repo?: string }
      if (method === 'git.repos') {
        return jsonResponse({
          ok: true,
          value: {
            repos: [
              { root: '/ws/other', name: 'other', rel: 'other' },
              { root: '/ws/dsh-at-file', name: 'dsh-at-file', rel: 'dsh-at-file' },
            ],
          },
        })
      }
      if (method === 'git.status') {
        if (body.repo === '/ws/dsh-at-file') {
          return jsonResponse({
            ok: true,
            value: {
              isRepo: true,
              branch: 'main',
              root: '/ws/dsh-at-file',
              entries: [{ path: 'a.txt', xy: '??' }],
            },
          })
        }
        return jsonResponse({ ok: true, value: { isRepo: false, entries: [] } })
      }
      if (method === 'git.branch') {
        if (body.repo === '/ws/dsh-at-file') {
          return jsonResponse({ ok: true, value: { current: 'main', names: ['main'] } })
        }
        return jsonResponse({ ok: true, value: { current: '', names: [] } })
      }
      throw new Error(`unexpected fetch ${String(url)}`)
    })
    const props = {
      scope: { sessionId: 's1', cwd: '/ws' },
      store: createSidebarStore(),
      onOpenFile: () => {},
      onOpenDiff: () => {},
    }
    const first = mount(createElement(GitView, props))
    try {
      await flush()
      const trigger = first.container.querySelector('[aria-label="仓库"]') as HTMLButtonElement
      act(() => { trigger.click() })
      const option = [...document.querySelectorAll('[role="menuitem"]')]
        .find(node => node.textContent?.includes('dsh-at-file')) as HTMLElement
      act(() => { option.click() })
      await flush()
      expect(first.container.textContent).toContain('a.txt')
    } finally {
      first.unmount()
    }

    const second = mount(createElement(GitView, props))
    try {
      expect(second.container.textContent).toContain('a.txt')
      expect(second.container.textContent).toContain('dsh-at-file')
      expect(second.container.textContent).not.toContain('当前目录不是 git 仓库')
    } finally {
      second.unmount()
    }
  })
})
