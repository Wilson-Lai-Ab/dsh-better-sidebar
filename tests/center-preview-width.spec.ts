import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(import.meta.dirname, '../src/client/sidebar.module.css'), 'utf8')
const ruleOf = (selector: string): string => new RegExp(`\\n${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''

const READER = '\\.centerPreviewHosted \\.editorMd'

describe('center preview shares the conversation column and its scrollbar x', () => {
  // The transcript scrolls in a body that RESERVES its gutter, so its bar is
  // drawn at the far right of the conversation column. The docked reader's own
  // scroller has to reserve the same gutter, or its bar hugs the narrower
  // content column instead and the two sit ~90px apart across a tab switch.
  it('reserves the host gutter on the docked reader so both scrollbars share one x', () => {
    expect(ruleOf(READER)).toContain('scrollbar-gutter: stable')
  })

  // The host constrains 对话 to --dsh-chat-content-width (width 100% +
  // max-width + auto margins), draggable via [data-width-handle]. The reader
  // must land on the same column.
  it('insets the reader content onto the --dsh-chat-content-width column', () => {
    expect(ruleOf(READER)).toContain(
      'padding-inline: max(14px, calc((100% - var(--dsh-scrollbar-width, 0px) - var(--dsh-chat-content-width, 748px)) / 2))',
    )
  })

  // Regression guard. Constraining the bodies wrapper (instead of insetting
  // the scroller's padding) shrinks the scroller itself, which drags the bar
  // inward to the content-column edge — the exact bug this replaced.
  it('never constrains the overlay box or the bodies wrapper', () => {
    const hosted = ruleOf('\\.centerPreviewHosted')
    expect(hosted).not.toContain('max-width')
    expect(hosted).not.toContain('padding-right')
    expect(ruleOf('\\.centerPreviewBodies')).not.toContain('max-width')
    expect(css).not.toContain('.centerPreviewHosted > *')
  })

  // Width is inset on the reader's CONTENT: the overlay box stays full-bleed,
  // so the transcript underneath never shows through the side gutters.
  it('keeps the overlay backdrop full-bleed', () => {
    const hosted = ruleOf('\\.centerPreviewHosted')
    expect(hosted).toContain('left: 0')
    expect(hosted).toContain('right: 0')
  })
})
