/**
 * Git diff preview: one line-number gutter (the surviving / new side).
 * Dual old/new columns look like a doubled gutter and confuse inline review.
 */
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { DiffView } from '../src/client/DiffView.tsx'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

describe('DiffView line numbers', () => {
  it('renders a single gutter number per diff line', () => {
    const diff = [
      'diff --git a/index.js b/index.js',
      '--- a/index.js',
      '+++ b/index.js',
      '@@ -78,3 +78,4 @@',
      ' context',
      '+editorMinimap: z.boolean().default(true),',
      ' next',
      '',
    ].join('\n')
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    act(() => {
      root.render(createElement(DiffView, { diff }))
    })
    try {
      const lines = [...container.querySelectorAll('[data-diff-line]')]
      expect(lines.length).toBeGreaterThan(0)
      for (const line of lines) {
        expect(line.querySelectorAll('[data-diff-gutter]')).toHaveLength(1)
      }
      const added = lines.find(node => node.textContent?.includes('editorMinimap'))
      expect(added).not.toBeUndefined()
      expect(added!.querySelector('[data-diff-gutter]')?.textContent).toBe('79')
    } finally {
      act(() => { root.unmount() })
      container.remove()
    }
  })
})
