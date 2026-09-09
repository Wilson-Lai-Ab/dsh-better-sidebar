/**
 * Code editor minimap: VS Code-style thumbnail on the right of file
 * previews. Default on; the Side card `editorMinimap` pref turns it off
 * without remounting the document.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TextEditor, syncMinimapInset } from '../src/client/TextEditor.tsx'
import { createSidebarStore } from '../src/client/state.ts'
import { SIDEBAR_PREFS_DEFAULTS } from '../src/prefs-shared.ts'
import type { FileViewerProps } from '../src/client/service.ts'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const CTX = { sessions: {} } as FileViewerProps['ctx']
const CODE = Array.from({ length: 40 }, (_, i) => `const n${i} = ${i}`).join('\n')

function viewerProps(store = createSidebarStore()): FileViewerProps {
  return {
    ctx: CTX,
    store,
    scope: { sessionId: 's1', cwd: '/p' },
    path: '/p/main.ts',
    title: 'main.ts',
    viewerId: 'code',
    content: CODE,
  }
}

interface Mount {
  container: HTMLElement
  unmount: () => void
}

function mountEditor(props: FileViewerProps): Mount {
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  act(() => { root.render(createElement(TextEditor, props)) })
  return {
    container,
    unmount: () => {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('code editor minimap', () => {
  it('does not paint an empty toolbar above a plain code file', () => {
    const { container, unmount } = mountEditor(viewerProps())
    expect(container.querySelector('[class*="editorHeader"]')).toBeNull()
    expect(container.querySelector('.cm-editor')).not.toBeNull()
    unmount()
  })

  it('keeps the preview/edit toolbar on markdown', () => {
    const { container, unmount } = mountEditor({
      ...viewerProps(),
      path: '/p/README.md',
      title: 'README.md',
      viewerId: 'markdown',
      content: '# hello\n',
    })
    expect(container.querySelector('[class*="editorHeader"]')).not.toBeNull()
    unmount()
  })

  it('mounts a minimap gutter by default on a code file', () => {
    const { container, unmount } = mountEditor(viewerProps())
    expect(container.querySelector('.cm-minimap-gutter')).not.toBeNull()
    unmount()
  })

  it('hides the minimap when editorMinimap is off, without dropping the editor', () => {
    const store = createSidebarStore()
    store.setPrefs({ ...SIDEBAR_PREFS_DEFAULTS, editorMinimap: false })
    const { container, unmount } = mountEditor(viewerProps(store))
    expect(container.querySelector('.cm-editor')).not.toBeNull()
    expect(container.querySelector('.cm-minimap-gutter')).toBeNull()
    unmount()
  })

  it('toggles the minimap live without recreating the editor', () => {
    const store = createSidebarStore()
    const { container, unmount } = mountEditor(viewerProps(store))
    const editor = container.querySelector('.cm-editor')
    expect(editor).not.toBeNull()
    expect(container.querySelector('.cm-minimap-gutter')).not.toBeNull()
    act(() => { store.setPrefs({ ...SIDEBAR_PREFS_DEFAULTS, editorMinimap: false }) })
    expect(container.querySelector('.cm-editor')).toBe(editor)
    expect(container.querySelector('.cm-minimap-gutter')).toBeNull()
    act(() => { store.setPrefs({ ...SIDEBAR_PREFS_DEFAULTS, editorMinimap: true }) })
    expect(container.querySelector('.cm-editor')).toBe(editor)
    expect(container.querySelector('.cm-minimap-gutter')).not.toBeNull()
    unmount()
  })

  it('keeps the Keep/Undo bar inset equal to the live minimap gutter width', () => {
    const host = document.createElement('div')
    const gutter = document.createElement('div')
    gutter.className = 'cm-minimap-gutter'
    host.append(gutter)
    Object.defineProperty(gutter, 'clientWidth', { configurable: true, get: () => 120 })
    syncMinimapInset(host, true)
    expect(host.style.getPropertyValue('--dsh-editor-minimap')).toBe('120px')
    syncMinimapInset(host, false)
    expect(host.style.getPropertyValue('--dsh-editor-minimap')).toBe('0px')
  })

  it('hides the minimap while markdown is in preview, and shows it in edit', () => {
    const { container, unmount } = mountEditor({
      ...viewerProps(),
      path: '/p/README.md',
      title: 'README.md',
      viewerId: 'markdown',
      content: '# hello\n\n```ts\nconst a = 1\n```\n',
    })
    const host = container.querySelector('[class*="editorCm"]') as HTMLElement | null
    expect(host).not.toBeNull()
    expect(host!.className).toMatch(/editorCmHidden/)
    const edit = [...container.querySelectorAll('button')].find(button => button.textContent === '编辑' || button.textContent === 'Edit')
    expect(edit).toBeDefined()
    act(() => { edit!.click() })
    expect(host!.className).not.toMatch(/editorCmHidden/)
    expect(container.querySelector('.cm-minimap-gutter')).not.toBeNull()
    unmount()
  })
})