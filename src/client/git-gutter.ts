/**
 * IDEA-style git change marks for the editor gutter: a 3px bar next to
 * the line number (green add / blue modify / red delete).
 */
import { RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, WidgetType, gutter, type DecorationSet } from '@codemirror/view'
import { parseUnifiedDiff } from './DiffView.tsx'

export type GutterMark = 'add' | 'mod' | 'del'

export interface GutterLine {
  line: number
  mark: GutterMark
  /** Deleted text shown as a no-number red row above `line`. */
  deleted?: string
}

/**
 * Map a unified diff onto the NEW file's line numbers.
 * Adds / context-adjacent edits paint the surviving line; a pure deletion
 * paints the next surviving line (or the last line) as deleted.
 */
function splitLines(text: string): string[] {
  if (text === '') return []
  const lines = text.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

/**
 * Map two file snapshots onto the NEW file's line numbers (same marks as
 * a unified diff). Large files skip the quadratic walk and return nothing.
 */
export function gutterLinesOfTexts(oldText: string, newText: string): GutterLine[] {
  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)
  if (oldLines.length > 6000 || newLines.length > 6000) return []
  const out: GutterLine[] = []
  let i = 0
  let j = 0
  const window = 80
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i += 1
      j += 1
      continue
    }
    let addAt = -1
    let delAt = -1
    const iMax = Math.min(oldLines.length, i + window)
    const jMax = Math.min(newLines.length, j + window)
    if (j < newLines.length) {
      for (let look = i; look < iMax; look += 1) {
        if (oldLines[look] === newLines[j]) { delAt = look; break }
      }
    }
    if (i < oldLines.length) {
      for (let look = j; look < jMax; look += 1) {
        if (newLines[look] === oldLines[i]) { addAt = look; break }
      }
    }
    if (delAt !== -1 && (addAt === -1 || delAt - i <= addAt - j)) {
      while (i < delAt) {
        out.push({ line: Math.max(1, j + 1), mark: 'del', deleted: oldLines[i]! })
        i += 1
      }
      continue
    }
    if (addAt !== -1) {
      while (j < addAt) {
        out.push({ line: j + 1, mark: i < oldLines.length ? 'mod' : 'add' })
        j += 1
      }
      continue
    }
    if (j < newLines.length && i < oldLines.length) {
      out.push({ line: j + 1, mark: 'del', deleted: oldLines[i]! })
      out.push({ line: j + 1, mark: 'mod' })
      i += 1
      j += 1
      continue
    }
    if (j < newLines.length) {
      out.push({ line: j + 1, mark: 'add' })
      j += 1
      continue
    }
    if (i < oldLines.length) {
      out.push({ line: Math.max(1, newLines.length), mark: 'del', deleted: oldLines[i]! })
      i += 1
    }
  }
  return out
}

export function gutterLinesOfDiff(diff: string): GutterLine[] {
  const out: GutterLine[] = []
  for (const file of parseUnifiedDiff(diff).files) {
    for (const hunk of file.hunks) {
      let pending: string[] = []
      const flushDels = (above: number): void => {
        for (const text of pending) out.push({ line: Math.max(1, above), mark: 'del', deleted: text })
        pending = []
      }
      for (const row of hunk.lines) {
        if (row.kind === 'del') {
          pending.push(row.text)
          continue
        }
        if (row.kind === 'add' && row.newNum !== null) {
          const replaced = pending.length > 0
          flushDels(row.newNum)
          out.push({ line: row.newNum, mark: replaced ? 'mod' : 'add' })
          continue
        }
        if (row.kind === 'ctx' && row.newNum !== null) {
          flushDels(row.newNum)
        }
      }
      if (pending.length > 0) {
        const last = [...hunk.lines].reverse().find(row => row.newNum !== null)
        flushDels((last?.newNum ?? hunk.newStart) + 1)
      }
    }
  }
  return out
}

class GitGutterMarker extends GutterMarker {
  constructor(readonly mark: GutterMark) { super() }
  eq(other: GitGutterMarker): boolean { return other.mark === this.mark }
  toDOM(): HTMLElement {
    const el = document.createElement('div')
    el.className = `dsh-git-gutter dsh-git-gutter-${this.mark}`
    return el
  }
}

const addMarker = new GitGutterMarker('add')
const modMarker = new GitGutterMarker('mod')
const delMarker = new GitGutterMarker('del')

function markerOf(mark: GutterMark): GitGutterMarker {
  if (mark === 'add') return addMarker
  if (mark === 'del') return delMarker
  return modMarker
}

export const setGitGutter = StateEffect.define<readonly GutterLine[]>()

const gitGutterField = StateField.define({
  create() { return new RangeSetBuilder<GutterMarker>().finish() },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setGitGutter)) continue
      const builder = new RangeSetBuilder<GutterMarker>()
      const lines = [...effect.value].sort((a, b) => a.line - b.line)
      for (const item of lines) {
        if (item.deleted !== undefined) continue
        if (item.line < 1 || item.line > transaction.state.doc.lines) continue
        const from = transaction.state.doc.line(item.line).from
        builder.add(from, from, markerOf(item.mark))
      }
      return builder.finish()
    }
    return value.map(transaction.changes)
  },
})

const lineAdd = Decoration.line({ class: 'dsh-git-line-add' })
const lineMod = Decoration.line({ class: 'dsh-git-line-mod' })

class DeletedLineWidget extends WidgetType {
  constructor(readonly text: string) { super() }
  eq(other: DeletedLineWidget): boolean { return other.text === this.text }
  toDOM(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'dsh-git-deleted-line'
    el.textContent = this.text === '' ? ' ' : this.text
    return el
  }
  ignoreEvent(): boolean { return true }
}

const gitLineField = StateField.define<DecorationSet>({
  create() { return Decoration.none },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setGitGutter)) continue
      const builder = new RangeSetBuilder<Decoration>()
      const lines = [...effect.value].sort((a, b) => a.line - b.line || (a.deleted === undefined ? 1 : -1))
      for (const item of lines) {
        const at = Math.min(Math.max(1, item.line), transaction.state.doc.lines)
        const from = transaction.state.doc.line(at).from
        if (item.deleted !== undefined) {
          builder.add(from, from, Decoration.widget({ widget: new DeletedLineWidget(item.deleted), side: -1, block: true }))
          continue
        }
        if (item.mark === 'del') continue
        builder.add(from, from, item.mark === 'add' ? lineAdd : lineMod)
      }
      return builder.finish()
    }
    return value.map(transaction.changes)
  },
  provide: field => EditorView.decorations.from(field),
})

export function gitGutter(): Extension[] {
  return [
    gitGutterField,
    gitLineField,
    gutter({
      class: 'dsh-git-gutter-col',
      markers: view => view.state.field(gitGutterField),
    }),
    EditorView.baseTheme({
      '.dsh-git-gutter-col': {
        width: '5px',
        minWidth: '5px',
        padding: '0',
      },
      '.dsh-git-gutter': {
        width: '4px',
        minHeight: '100%',
        marginLeft: '1px',
        borderRadius: '1px',
      },
      '.dsh-git-gutter-add': { background: 'var(--dsw-alias-state-success-primary)' },
      '.dsh-git-gutter-mod': { background: 'var(--dsw-alias-state-business-primary)' },
      '.dsh-git-gutter-del': { background: 'var(--dsw-alias-state-error-primary)' },
      '.cm-line.dsh-git-line-add': {
        backgroundColor: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent)',
        boxShadow: 'inset 3px 0 0 var(--dsw-alias-state-success-primary)',
      },
      '.cm-line.dsh-git-line-mod': {
        backgroundColor: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 22%, transparent)',
        boxShadow: 'inset 3px 0 0 var(--dsw-alias-state-business-primary)',
      },
      '.dsh-git-deleted-line': {
        backgroundColor: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent)',
        boxShadow: 'inset 3px 0 0 var(--dsw-alias-state-error-primary)',
        color: 'var(--dsw-alias-label-tertiary)',
        textDecoration: 'line-through',
        padding: '0 4px 0 7px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
      },
    }),
  ]
}
