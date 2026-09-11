/**
 * @vitest-environment jsdom
 *
 * DSH 0.1.2 MarkdownText reads labels.code.copyLabel with no fallback.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { createSidebarStore } from '../src/client/state.ts'
import { resetRememberedViewModes } from '../src/client/editor-view-mode.ts'
import type { FileViewerProps } from '../src/client/service.ts'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let lastProps: Record<string, unknown> | undefined

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@deepseek-ai/dsh-client-ui-primitives')>()
  return {
    ...actual,
    MarkdownText: (props: Record<string, unknown>): ReactNode => {
      lastProps = props
      return createElement('div', { 'data-md': '' }, String(props.text ?? ''))
    },
  }
})

const { TextEditor } = await import('../src/client/TextEditor.tsx')

afterEach(() => {
  lastProps = undefined
  resetRememberedViewModes()
  document.body.replaceChildren()
})

describe('TextEditor markdown labels', () => {
  it('forwards labels.code so a fenced block does not read undefined.code', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    const props: FileViewerProps = {
      ctx: {} as FileViewerProps['ctx'],
      store: createSidebarStore(),
      scope: { sessionId: 's1', cwd: '/p' },
      path: '/p/note.md',
      title: 'note.md',
      viewerId: 'markdown',
      content: '```text\nhello\n```\n',
    }
    act(() => { root.render(createElement(TextEditor, props)) })
    const labels = lastProps?.labels as { code?: { copyLabel?: string }; footnotes?: string } | undefined
    expect(labels?.code?.copyLabel).toBeTruthy()
    expect(labels?.footnotes).toBeTruthy()
    expect((lastProps?.codeLabels as { copyLabel?: string } | undefined)?.copyLabel).toBeTruthy()
    act(() => { root.unmount() })
    container.remove()
  })
})
