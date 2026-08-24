/**
 * File-chip payload: Cursor-style labels, clipboard `@path:lines`, and the
 * model form expanded on send (fence with snippet, or the @-token alone).
 */
import { describe, expect, it } from 'vitest'
import { caretAfterChip, caretHitsChip, draftAfterChipDelete, padSpacesAfterObject } from '../src/client/composer-chip-caret.ts'
import { chipHasNoUserText, spacesForOverflow } from '../src/client/composer-chip-layout.ts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSentFileFence, splitUserFences } from '../src/client/chat-file-chips.ts'
import { looksLikeFileAt, occurrenceAtOffset } from '../src/client/composer-file-drop.ts'
import {
  decodeFileRef,
  encodeFileRef,
  fileChipLabel,
  fileClipboardText,
  fileRefOf,
  isPlainTextSelection,
  parseAtToken,
  serializeFileRef,
  FILE_REF_MIME,
  writeFileRefClipboard,
} from '../src/client/file-ref.ts'
import { requestReveal, takeReveal } from '../src/client/editor-reveal.ts'
import { SELECTION_LIMIT } from '../src/client/selection-payload.ts'

describe('fileChipLabel', () => {
  it('uses the basename for a whole file', () => {
    expect(fileChipLabel({ path: 'src/client/JiufangHttpClient.java' })).toBe('JiufangHttpClient.java')
  })

  it('adds a line span like Cursor', () => {
    expect(fileChipLabel({ path: 'a/B.java', lines: { start: 108, end: 121 } })).toBe('B.java (108-121)')
    expect(fileChipLabel({ path: 'a/B.java', lines: { start: 108, end: 108 } })).toBe('B.java (108)')
  })
})

describe('fileRefOf', () => {
  it('projects the path relative to cwd', () => {
    expect(fileRefOf('/p/src/a.ts', '/p', { start: 2, end: 4 }, 'x')).toEqual({
      path: 'src/a.ts',
      lines: { start: 2, end: 4 },
      selected: 'x',
      abs: '/p/src/a.ts',
    })
  })

  it('drops a snippet past the selection limit', () => {
    const text = 'x'.repeat(SELECTION_LIMIT + 1)
    expect(fileRefOf('/p/a.ts', '/p', { start: 1, end: 1 }, text).selected).toBeUndefined()
  })
})

describe('encode/decode + serialize', () => {
  it('round-trips a selection ref', () => {
    const ref = { path: 'a.ts', lines: { start: 2, end: 4 }, selected: 'const x = 1' }
    expect(decodeFileRef(encodeFileRef(ref))).toEqual(ref)
    expect(fileClipboardText(ref)).toBe('@a.ts:2-4')
    expect(serializeFileRef(encodeFileRef(ref))).toBe('```a.ts:2-4\nconst x = 1\n```')
  })

  it('serializes a whole-file drop as an @-token', () => {
    expect(serializeFileRef(encodeFileRef({ path: 'src/a.ts' }))).toBe('@src/a.ts')
  })

  it('treats a one-line selection as plain text, not a chip', () => {
    expect(isPlainTextSelection({
      path: 'a.ts', lines: { start: 15, end: 15 }, selected: 'private String sourceType;',
    })).toBe(true)
    expect(isPlainTextSelection({
      path: 'a.ts', lines: { start: 15, end: 20 }, selected: 'a\nb',
    })).toBe(false)
    expect(isPlainTextSelection({ path: 'a.ts' })).toBe(false)
  })

  it('turns a sent fence into a clickable chip payload', () => {
    const text = '```src/a.ts:15-20\nprivate String sourceType;\n```\nhello'
    expect(parseSentFileFence('src/a.ts', '15', '20')).toEqual({
      path: 'src/a.ts', lines: { start: 15, end: 20 },
    })
    expect(splitUserFences(text)).toEqual([
      { kind: 'chip', ref: { path: 'src/a.ts', lines: { start: 15, end: 20 } } },
      { kind: 'text', text: '\nhello' },
    ])
  })

  it('turns a dropped folder @-mention into a chip', () => {
    const folder = '@dev-overlay/_zentao/迭代_106/T-14577_系统顶栏'
    expect(splitUserFences(`${folder}\naaa`)).toEqual([
      { kind: 'chip', ref: { path: 'dev-overlay/_zentao/迭代_106/T-14577_系统顶栏' } },
      { kind: 'text', text: '\naaa' },
    ])
    expect(splitUserFences('@DSH-better-sidebar')).toEqual([])
  })

  it('parses the clipboard @-token', () => {
    expect(parseAtToken('@src/a.ts:2-4')).toEqual({ path: 'src/a.ts', lines: { start: 2, end: 4 } })
    expect(parseAtToken('@src/a.ts')).toEqual({ path: 'src/a.ts' })
    expect(parseAtToken('plain')).toBeNull()
  })

  it('keeps selected source as text/plain and the chip payload as custom MIME', () => {
    const store: Record<string, string> = {}
    const event = {
      preventDefault() { store.prevented = '1' },
      clipboardData: {
        setData(type: string, value: string) { store[type] = value },
      },
    } as unknown as ClipboardEvent
    const ref = { path: 'a.ts', lines: { start: 2, end: 4 }, selected: 'const x = 1' }
    writeFileRefClipboard(event, ref)
    expect(store.prevented).toBe('1')
    expect(store[FILE_REF_MIME]).toBe(encodeFileRef(ref))
    expect(store['text/plain']).toBe('const x = 1')
  })
})

describe('looksLikeFileAt', () => {
  it('accepts paths and line spans, rejects bare @names', () => {
    expect(looksLikeFileAt('@src/a.ts')?.path).toBe('src/a.ts')
    expect(looksLikeFileAt('@a.ts:3')?.lines).toEqual({ start: 3, end: 3 })
    expect(looksLikeFileAt('@pluginId')).toBeNull()
  })
})

describe('occurrenceAtOffset', () => {
  const items = [{ occurrenceId: 3, offset: 4 }]
  it('hits the placeholder and the slot just after it', () => {
    expect(occurrenceAtOffset(items, 4)).toBe(3)
    expect(occurrenceAtOffset(items, 5)).toBe(3)
    expect(occurrenceAtOffset(items, 3)).toBeNull()
  })

  it('covers every glyph of an in-flow @label chip', () => {
    const items = [{ occurrenceId: 1, offset: 0, length: '@dsh-better-sidebar'.length }]
    expect(occurrenceAtOffset(items, 0)).toBe(1)
    expect(occurrenceAtOffset(items, 10)).toBe(1)
    expect(occurrenceAtOffset(items, '@dsh-better-sidebar'.length)).toBe(1)
    expect(occurrenceAtOffset(items, '@dsh-better-sidebar'.length + 1)).toBeNull()
  })
})

describe('caretAfterChip', () => {
  const draft = `\uFFFC more`
  it('skips the placeholder and its trailing space', () => {
    expect(caretAfterChip(draft, 0)).toBe(2)
    expect(caretAfterChip(draft, 1)).toBe(2)
    expect(caretHitsChip(draft, 0)).toBe(true)
    expect(caretHitsChip(draft, 1)).toBe(true)
    expect(caretHitsChip(draft, 2)).toBe(false)
    expect(caretAfterChip('plain', 2)).toBe(2)
  })

  it('pads the host gap so the caret can sit past a wide pill', () => {
    expect(padSpacesAfterObject('\uFFFC more', 0, 4)).toBe('\uFFFC    more')
    expect(padSpacesAfterObject('\uFFFC    more', 0, 4)).toBe('\uFFFC    more')
    expect(padSpacesAfterObject('x', 0, 4)).toBe('x')
    expect(spacesForOverflow(0, 8)).toBe(1)
    expect(spacesForOverflow(24, 8)).toBe(3)
    expect(chipHasNoUserText('\uFFFC    ', 0)).toBe(true)
    expect(chipHasNoUserText('\uFFFC    123', 0)).toBe(false)
  })

  it('deletes the whole chip with Backspace or Delete', () => {
    expect(draftAfterChipDelete('\uFFFC    more', 5, 'backward')).toEqual({ draft: 'more', caret: 0 })
    expect(draftAfterChipDelete('hi \uFFFC    x', 3, 'forward')).toEqual({ draft: 'hi x', caret: 3 })
    expect(draftAfterChipDelete('hello', 5, 'backward')).toBeNull()
  })

  it('treats the current host @label draft as one chip, not a one-glyph slot', () => {
    const draft = '@dsh-better-sidebar '
    const length = '@dsh-better-sidebar'.length
    expect(chipHasNoUserText(draft, 0, length)).toBe(true)
    expect(chipHasNoUserText('@dsh-better-sidebar 123', 0, length)).toBe(false)
    expect(padSpacesAfterObject(draft, 0, 4, length)).toBe('@dsh-better-sidebar    ')
    expect(caretAfterChip(draft, 0, length)).toBe(draft.length)
    expect(caretHitsChip(draft, 3, length)).toBe(true)
    expect(caretHitsChip(draft, draft.length, length)).toBe(true)
    expect(draftAfterChipDelete(draft, draft.length, 'backward', length)).toEqual({ draft: '', caret: 0 })
    expect(caretAfterChip(`xx ${draft}`, 5, length)).toBe(`xx ${draft}`.length)
    expect(draftAfterChipDelete('hi @dsh-better-sidebar ', 5, 'forward', length)).toEqual({ draft: 'hi ', caret: 3 })
  })
})

describe('composer chip CSS', () => {
  it('does not shrink the in-flow @label pill with scale or border-box max-content', () => {
    const css = readFileSync(resolve(fileURLToPath(new URL('..', import.meta.url)), 'src/client/layout.css'), 'utf8')
    const chip = css.slice(css.indexOf('[data-decoration="chip"]'))
    expect(chip).not.toMatch(/scale\(0\.72\)/)
    expect(chip).not.toMatch(/translateY\(-50%\)/)
    expect(chip).not.toMatch(/width:\s*max-content/)
    expect(chip).not.toMatch(/box-sizing:\s*border-box/)
  })
})

describe('requestReveal', () => {
  it('hands the span to the next consumer once', () => {
    requestReveal('/p/a.ts', { start: 108, end: 121, selected: 'x' })
    expect(takeReveal('/p/a.ts')).toEqual({ start: 108, end: 121, selected: 'x' })
    expect(takeReveal('/p/a.ts')).toBeUndefined()
  })
})
