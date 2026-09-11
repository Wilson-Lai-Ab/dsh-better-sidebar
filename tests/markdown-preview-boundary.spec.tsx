/**
 * @vitest-environment jsdom
 *
 * Explorer markdown opens in preview. DSH MarkdownText can throw
 * (Cannot read properties of undefined (reading 'code')). That must
 * stay inside the preview pane — the preview/edit toolbar remains.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { RenderBoundary } from '../src/client/RenderBoundary.tsx'
import { createSidebarStore } from '../src/client/state.ts'
import { resetRememberedViewModes } from '../src/client/editor-view-mode.ts'
import type { FileViewerProps } from '../src/client/service.ts'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@deepseek-ai/dsh-client-ui-primitives')>()
  return {
    ...actual,
    MarkdownText: () => {
      throw new Error("Cannot read properties of undefined (reading 'code')")
    },
  }
})

const { TextEditor } = await import('../src/client/TextEditor.tsx')

function viewerProps(): FileViewerProps {
  return {
    ctx: {} as FileViewerProps['ctx'],
    store: createSidebarStore(),
    scope: { sessionId: 's1', cwd: '/p' },
    path: '/p/docs/note.md',
    title: 'note.md',
    viewerId: 'markdown',
    content: '# Hello\n\nworld\n',
  }
}

afterEach(() => {
  resetRememberedViewModes()
  document.body.replaceChildren()
})

describe('markdown preview error isolation', () => {
  it('keeps the preview/edit toolbar when MarkdownText throws', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(createElement(
        RenderBoundary,
        null,
        createElement(TextEditor, viewerProps()),
      ))
    })
    expect(container.textContent ?? '').not.toMatch(/^dsh-better-sidebar:/)
    const labels = [...container.querySelectorAll('button')].map((item) => item.textContent)
    expect(labels.some((item) => item === '预览' || item === 'Preview')).toBe(true)
    expect(labels.some((item) => item === '编辑' || item === 'Edit')).toBe(true)
    expect(container.textContent).toContain('# Hello')
    act(() => { root.unmount() })
    container.remove()
  })
})
