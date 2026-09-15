import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(import.meta.dirname, '../src/client/sidebar.module.css'), 'utf8')
const ruleOf = (selector: string): string => new RegExp(`\\n${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''

describe('center preview shares the conversation content column', () => {
  // The host constrains 对话 to --dsh-chat-content-width (width 100% +
  // max-width + auto margins), dragged via [data-width-handle]. The preview
  // content column must obey the same rule or the two look different.
  it('insets the preview content to --dsh-chat-content-width, centered like 对话', () => {
    const children = ruleOf('\\.centerPreviewHosted > \\*')
    expect(children).toContain('max-width: var(--dsh-chat-content-width')
    expect(children).toContain('margin-inline: auto')
  })

  // The host scroll body reserves `scrollbar-gutter: stable` (8px, matching
  // its ::-webkit-scrollbar rule), so 对话 centers in a narrower box than the
  // overlay does. Mirror the same token the host uses, or the columns differ
  // by half a gutter.
  it('mirrors the host scrollbar gutter so both columns share one x', () => {
    expect(ruleOf('\\.centerPreviewHosted')).toContain('padding-right: var(--dsh-scrollbar-width')
  })

  // Width is constrained on the CHILDREN: the overlay box itself stays
  // full-bleed so the chat underneath never shows through the side gutters.
  it('leaves the overlay backdrop itself full-bleed', () => {
    const hosted = ruleOf('\\.centerPreviewHosted')
    expect(hosted).not.toContain('max-width')
    expect(hosted).toContain('left: 0')
    expect(hosted).toContain('right: 0')
  })
})
