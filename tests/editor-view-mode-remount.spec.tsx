/**
 * HTML/Markdown default to preview. A user Preview / Edit toggle must
 * survive the center overlay unmounting (对话 ↔ file tab).
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TextEditor } from '../src/client/TextEditor.tsx'
import { createSidebarStore } from '../src/client/state.ts'
import { resetRememberedViewModes } from '../src/client/editor-view-mode.ts'
import type { FileViewerProps } from '../src/client/service.ts'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const PATH = '/p/a/index.html'

function ctxWithReview(): FileViewerProps['ctx'] {
  const snap = {
    nodes: [{
      kind: 'tool-result',
      turn: 1,
      seq: 2,
      callView: {
        card: 'diff',
        locations: [{ path: PATH }],
        diffs: [{ path: PATH, oldText: '<h1>old</h1>' }],
      },
    }],
  }
  return {
    sessions: {
      binding: () => ({
        session: {
          getSnapshot: () => snap,
          subscribe: () => () => {},
        },
      }),
    },
  } as unknown as FileViewerProps['ctx']
}

function viewerProps(): FileViewerProps {
  return {
    ctx: ctxWithReview(),
    store: createSidebarStore(),
    scope: { sessionId: 's1', cwd: '/p' },
    path: PATH,
    title: 'index.html',
    viewerId: 'html',
    content: '<h1>hi</h1>',
  }
}

function mountEditor(props: FileViewerProps): { container: HTMLElement; unmount: () => void } {
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

function modeButton(container: HTMLElement, label: 'preview' | 'edit'): HTMLButtonElement {
  const zh = label === 'preview' ? '预览' : '编辑'
  const en = label === 'preview' ? 'Preview' : 'Edit'
  const button = [...container.querySelectorAll('button')]
    .find(node => node.textContent === zh || node.textContent === en)
  if (button === undefined) throw new Error(`missing ${label} button`)
  return button as HTMLButtonElement
}

function isActive(button: HTMLElement): boolean {
  return button.className.includes('editorModeActive')
}

afterEach(() => {
  resetRememberedViewModes()
  document.body.replaceChildren()
})

describe('reviewed HTML preview mode across remount', () => {
  it('opens an HTML file in preview when builtin review is gone', () => {
    const { container, unmount } = mountEditor(viewerProps())
    expect(isActive(modeButton(container, 'preview'))).toBe(true)
    expect(isActive(modeButton(container, 'edit'))).toBe(false)
    unmount()
  })

  it('keeps Preview after unmount (对话) and remount (file tab)', () => {
    const first = mountEditor(viewerProps())
    act(() => { modeButton(first.container, 'preview').click() })
    expect(isActive(modeButton(first.container, 'preview'))).toBe(true)
    first.unmount()

    const second = mountEditor(viewerProps())
    expect(isActive(modeButton(second.container, 'preview'))).toBe(true)
    expect(isActive(modeButton(second.container, 'edit'))).toBe(false)
    second.unmount()
  })
})
