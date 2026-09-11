import { describe, expect, it } from 'vitest'
import { markdownTextLabelProps } from '../src/client/markdown-labels.ts'

describe('markdownTextLabelProps', () => {
  it('includes labels.code so DSH 0.1.2 MarkdownText can read copyLabel', () => {
    const props = markdownTextLabelProps({ copyLabel: 'Copy', copiedLabel: 'Copied' })
    expect(props.labels.code.copyLabel).toBe('Copy')
    expect(props.labels.code.copiedLabel).toBe('Copied')
    expect(props.labels.footnotes).toBe('Footnotes')
    expect(props.codeLabels.copyLabel).toBe('Copy')
  })
})
