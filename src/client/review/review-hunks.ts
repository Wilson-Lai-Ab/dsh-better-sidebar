/**
 * Per-hunk review: turn a unified diff (or two snapshots) into ranges on
 * the NEW file, then undo one range by splicing the old block back in.
 */
import { parseUnifiedDiff, type DiffFile, type DiffHunk } from '../DiffView.tsx'

export interface ReviewHunk {
  key: string
  /** First NEW-file line of the splice block (may include diff context). */
  start: number
  /** Last NEW-file line of the splice block (may include diff context). */
  end: number
  /** First painted / actually-changed NEW-file line. */
  paintStart: number
  /** Last painted / actually-changed NEW-file line. */
  paintEnd: number
  oldBlock: string
  newBlock: string
}

function splitLines(text: string): string[] {
  if (text === '') return []
  const lines = text.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

function joinLines(lines: readonly string[], trailingNl: boolean): string {
  if (lines.length === 0) return trailingNl ? '\n' : ''
  return trailingNl ? `${lines.join('\n')}\n` : lines.join('\n')
}

type IslandMark = 'add' | 'mod' | 'del'

function pushIsland(
  out: ReviewHunk[],
  oldParts: string[],
  newParts: string[],
  paint: number[],
  mark: IslandMark,
  fallback: number,
): void {
  if (oldParts.length === 0 && newParts.length === 0) return
  const paintStart = paint.length > 0 ? Math.min(...paint) : fallback
  const paintEnd = paint.length > 0 ? Math.max(...paint) : paintStart
  out.push({
    key: `i:${mark}:${paintStart}:${paintEnd}:${oldParts.length}:${newParts.length}`,
    start: paintStart,
    end: paintEnd,
    paintStart,
    paintEnd,
    oldBlock: oldParts.join('\n'),
    newBlock: newParts.join('\n'),
  })
}

/**
 * One git hunk often has several painted islands (a replace, a later add,
 * a gap of context). Review buttons follow those islands — same mark and
 * consecutive lines stay together; a context row or a mark change splits.
 */
function hunksFromParsed(hunk: DiffHunk): ReviewHunk[] {
  const out: ReviewHunk[] = []
  let oldParts: string[] = []
  let newParts: string[] = []
  let paint: number[] = []
  let mark: IslandMark | undefined
  let pendingDels: string[] = []

  const flush = (): void => {
    if (mark !== undefined) pushIsland(out, oldParts, newParts, paint, mark, hunk.newStart)
    oldParts = []
    newParts = []
    paint = []
    mark = undefined
    pendingDels = []
  }

  for (const row of hunk.lines) {
    if (row.kind === 'del') {
      pendingDels.push(row.text)
      continue
    }
    if (row.kind === 'add') {
      const next: IslandMark = pendingDels.length > 0 ? 'mod' : 'add'
      if (mark !== undefined && mark !== next) {
        pushIsland(out, oldParts, newParts, paint, mark, hunk.newStart)
        oldParts = []
        newParts = []
        paint = []
      }
      mark = next
      oldParts.push(...pendingDels)
      pendingDels = []
      newParts.push(row.text)
      if (row.newNum !== null) paint.push(row.newNum)
      continue
    }
    if (row.kind === 'ctx') {
      if (pendingDels.length > 0) {
        if (mark !== undefined && mark !== 'del') {
          pushIsland(out, oldParts, newParts, paint, mark, hunk.newStart)
          oldParts = []
          newParts = []
          paint = []
        }
        mark = 'del'
        oldParts.push(...pendingDels)
        pendingDels = []
        if (row.newNum !== null) paint.push(row.newNum)
      }
      flush()
    }
  }
  if (pendingDels.length > 0) {
    if (mark !== undefined && mark !== 'del') {
      pushIsland(out, oldParts, newParts, paint, mark, hunk.newStart)
      oldParts = []
      newParts = []
      paint = []
    }
    mark = 'del'
    oldParts.push(...pendingDels)
    const last = [...hunk.lines].reverse().find(row => row.newNum !== null)
    paint.push(last?.newNum ?? hunk.newStart)
  }
  flush()
  return out
}

export function hunksFromFiles(files: readonly DiffFile[]): ReviewHunk[] {
  const out: ReviewHunk[] = []
  for (const file of files) {
    for (const hunk of file.hunks) out.push(...hunksFromParsed(hunk))
  }
  return out
}

export function hunksOfDiff(diff: string): ReviewHunk[] {
  return hunksFromFiles(parseUnifiedDiff(diff).files)
}

/** Consecutive changed regions between two snapshots (HEAD vs buffer). */
export function hunksFromTexts(oldText: string, newText: string): ReviewHunk[] {
  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)
  if (oldLines.length > 6000 || newLines.length > 6000) return []
  const out: ReviewHunk[] = []
  let i = 0
  let j = 0
  const window = 80
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i += 1
      j += 1
      continue
    }
    const oldStart = i
    const newStart = j
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) break
      let synced = false
      const iMax = Math.min(oldLines.length, i + window)
      const jMax = Math.min(newLines.length, j + window)
      if (j < newLines.length) {
        for (let look = i + 1; look < iMax; look += 1) {
          if (oldLines[look] === newLines[j]) { i = look; synced = true; break }
        }
      }
      if (!synced && i < oldLines.length) {
        for (let look = j + 1; look < jMax; look += 1) {
          if (newLines[look] === oldLines[i]) { j = look; synced = true; break }
        }
      }
      if (synced) break
      if (i < oldLines.length) i += 1
      if (j < newLines.length) j += 1
    }
    const oldBlock = oldLines.slice(oldStart, i)
    const newBlock = newLines.slice(newStart, j)
    if (oldBlock.length === 0 && newBlock.length === 0) continue
    const start = newBlock.length === 0 ? Math.max(1, newStart) : newStart + 1
    const end = newBlock.length === 0 ? start : newStart + newBlock.length
    out.push({
      key: `${start}:${end}:${oldStart}:${oldBlock.length}:${newBlock.length}`,
      start,
      end,
      paintStart: start,
      paintEnd: end,
      oldBlock: oldBlock.join('\n'),
      newBlock: newBlock.join('\n'),
    })
  }
  return out
}

/** One hunk covering every line of a brand-new file. */
export function hunksOfAllAdd(lineCount: number): ReviewHunk[] {
  const end = Math.max(1, lineCount)
  return [{
    key: `1:${end}:0:0:${lineCount}`,
    start: 1,
    end,
    paintStart: 1,
    paintEnd: end,
    oldBlock: '',
    newBlock: '',
  }]
}

export function hunkAtLine(hunks: readonly ReviewHunk[], line: number): ReviewHunk | undefined {
  return hunks.find(hunk => line >= hunk.paintStart && line <= hunk.paintEnd)
}

/** `L24` or `L12–16` — painted lines only, never surrounding diff context. */
export function hunkLineLabel(hunk: ReviewHunk): string {
  return hunk.paintStart === hunk.paintEnd ? `L${hunk.paintStart}` : `L${hunk.paintStart}–${hunk.paintEnd}`
}

/** Consecutive same-mark gutter lines become one hoverable hunk. */
export function hunksFromGutterLines(lines: readonly { line: number; mark?: string }[]): ReviewHunk[] {
  const sorted = [...lines]
    .filter(item => item.line >= 1)
    .sort((a, b) => a.line - b.line || String(a.mark).localeCompare(String(b.mark)))
  const out: ReviewHunk[] = []
  let start = 0
  let prev = 0
  let mark: string | undefined
  const flush = (): void => {
    if (start === 0) return
    out.push({
      key: `g:${mark ?? 'x'}:${start}:${prev}`,
      start,
      end: prev,
      paintStart: start,
      paintEnd: prev,
      oldBlock: '',
      newBlock: '',
    })
  }
  for (const item of sorted) {
    if (start === 0) {
      start = item.line
      prev = item.line
      mark = item.mark
      continue
    }
    if (item.line === prev + 1 && item.mark === mark) {
      prev = item.line
      continue
    }
    flush()
    start = item.line
    prev = item.line
    mark = item.mark
  }
  flush()
  return out
}

/**
 * Replace this hunk's new-file block with its old-file block.
 * Whole-file additions (empty old block + span covering the file) become ''.
 */
export function applyHunkUndo(text: string, hunk: ReviewHunk): string {
  const trailing = text.endsWith('\n')
  const lines = splitLines(text)
  const newLines = hunk.newBlock === '' && hunk.oldBlock === ''
    ? lines.slice(hunk.start - 1, hunk.end)
    : splitLines(hunk.newBlock)
  const oldLines = splitLines(hunk.oldBlock)
  if (newLines.length === 0 && oldLines.length === 0) return ''
  const from = Math.max(0, hunk.start - 1)
  const count = newLines.length === 0 ? 0 : Math.min(newLines.length, Math.max(0, lines.length - from))
  const next = [...lines]
  next.splice(from, count, ...oldLines)
  return joinLines(next, trailing && next.length > 0)
}

export type ReviewPaintPhase = 'pending' | 'just-decided' | 'revisit'

export interface ReviewGutterPaint {
  lines: { line: number; mark?: string; deleted?: string }[]
  showButtons: boolean
}

/**
 * Pending: hide decided hunks, keep buttons. Just-decided (this editor
 * session): clear paint and buttons. Revisit of an already-decided file:
 * leftover git paint, no review buttons.
 */
export function reviewGutterPaint(input: {
  phase: ReviewPaintPhase
  lines: readonly { line: number; mark?: string; deleted?: string }[]
  hunks: readonly { key: string; paintStart: number; paintEnd: number }[]
  decidedHunkKeys: ReadonlySet<string>
}): ReviewGutterPaint {
  if (input.phase === 'just-decided') return { lines: [], showButtons: false }
  if (input.phase === 'revisit') return { lines: [...input.lines], showButtons: false }
  const hidden = new Set<number>()
  for (const hunk of input.hunks) {
    if (!input.decidedHunkKeys.has(hunk.key)) continue
    for (let line = hunk.paintStart; line <= hunk.paintEnd; line += 1) hidden.add(line)
  }
  return { lines: input.lines.filter(item => !hidden.has(item.line)), showButtons: true }
}
