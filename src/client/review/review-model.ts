/**
 * Session-scoped agent edits: files the current conversation actually
 * wrote (diff / edit / delete tool cards). Reads and failed tools stay
 * out. The review list is one row per (turn, path); file-level undo
 * still uses the first snapshot of each path.
 */
import { resolveSidebarPath } from '../produced-files.ts'

/** How the agent touched the file. */
export type ReviewEditKind = 'add' | 'edit' | 'delete'

/** One file the current conversation produced. */
export interface SessionEdit {
  path: string
  kind: ReviewEditKind
  turn: number | undefined
  seq: number | undefined
  prompt: string
  /** Epoch ms from the conversation node, when the host provides one. */
  time?: number
  /** Pre-write snapshot from the last tool card (`null` = the file was created). */
  oldText?: string | null
}

function addedPaths(view: unknown): Set<string> {
  const added = new Set<string>()
  if (view === null || typeof view !== 'object') return added
  const diffs = (view as { diffs?: unknown }).diffs
  if (!Array.isArray(diffs)) return added
  for (const diff of diffs) {
    if (diff === null || typeof diff !== 'object') continue
    const record = diff as { path?: unknown; oldText?: unknown }
    if (typeof record.path === 'string' && record.oldText === null) added.add(record.path)
  }
  return added
}

/** Paths a tool-result view reports as an agent mutation. */
export function reviewLocations(view: unknown): { path: string; kind: ReviewEditKind }[] {
  if (view === null || typeof view !== 'object') return []
  const record = view as { card?: unknown; kind?: unknown; locations?: unknown; diffs?: unknown }
  const deleted = record.card === 'generic' && record.kind === 'delete'
  const edited = record.card === 'diff' || (record.card === 'generic' && record.kind === 'edit')
  if (!deleted && !edited) return []
  const created = addedPaths(view)
  const out: { path: string; kind: ReviewEditKind }[] = []
  const push = (path: string, kind: ReviewEditKind): void => {
    out.push({ path, kind })
  }
  if (Array.isArray(record.locations)) {
    for (const location of record.locations) {
      if (location !== null && typeof location === 'object' && typeof (location as { path?: unknown }).path === 'string') {
        const path = (location as { path: string }).path
        push(path, deleted ? 'delete' : created.has(path) ? 'add' : 'edit')
      }
    }
  }
  if (out.length === 0 && Array.isArray(record.diffs)) {
    for (const diff of record.diffs) {
      if (diff !== null && typeof diff === 'object' && typeof (diff as { path?: unknown }).path === 'string') {
        const path = (diff as { path: string }).path
        push(path, created.has(path) ? 'add' : 'edit')
      }
    }
  }
  return out
}

/** Last tool card's old-file snapshot for this path (`null` = created). */
export function oldTextOf(view: unknown, path: string): string | null | undefined {
  if (view === null || typeof view !== 'object') return undefined
  const diffs = (view as { diffs?: unknown }).diffs
  if (!Array.isArray(diffs)) return undefined
  for (const diff of diffs) {
    if (diff === null || typeof diff !== 'object') continue
    const record = diff as { path?: unknown; oldText?: unknown }
    if (record.path !== path) continue
    if (record.oldText === null) return null
    if (typeof record.oldText === 'string') return record.oldText
  }
  return undefined
}

function textFromBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return ''
  const texts: string[] = []
  for (const block of blocks) {
    if (typeof block === 'string') {
      texts.push(block)
      continue
    }
    if (block === null || typeof block !== 'object') continue
    const record = block as { type?: unknown; text?: unknown }
    if (typeof record.text === 'string' && (record.type === undefined || record.type === 'text')) {
      texts.push(record.text)
    }
  }
  return texts.join('\n')
}

function promptOf(node: unknown): string {
  if (node === null || typeof node !== 'object') return ''
  const record = node as { text?: unknown; content?: unknown; parts?: unknown }
  if (typeof record.text === 'string') return record.text
  if (typeof record.content === 'string') return record.content
  const fromContent = textFromBlocks(record.content)
  if (fromContent !== '') return fromContent
  return textFromBlocks(record.parts)
}

/**
 * Flatten conversation nodes into one row per (turn, path). The same file
 * written in several turns shows up under each turn. File-level undo still
 * uses {@link latestSessionEdits} so the first snapshot wins.
 */
export function collectSessionEdits(nodes: readonly unknown[], cwd?: string): SessionEdit[] {
  const byKey = new Map<string, SessionEdit>()
  const order: string[] = []
  let turn: number | undefined
  let prompt = ''
  let seq: number | undefined
  for (const node of nodes) {
    if (node === null || typeof node !== 'object') continue
    const record = node as { kind?: unknown; isError?: unknown; callView?: unknown; turn?: unknown; seq?: unknown; time?: unknown }
    if (record.kind === 'user' || record.kind === 'steering') {
      const next = promptOf(node).trim()
      if (next !== '') prompt = next
      continue
    }
    if (typeof record.turn === 'number') turn = record.turn
    if (typeof record.seq === 'number') seq = record.seq
    const time = typeof record.time === 'number' && Number.isFinite(record.time) ? record.time : undefined
    if (record.kind !== 'tool-result' || record.isError === true) continue
    for (const location of reviewLocations(record.callView)) {
      const path = resolveSidebarPath(cwd, location.path)
      const oldText = oldTextOf(record.callView, location.path)
      const key = `${turn ?? 'x'}\n${path}`
      const existing = byKey.get(key)
      if (existing === undefined) {
        order.push(key)
        byKey.set(key, { path, kind: location.kind, turn, seq, prompt, time, oldText })
      } else {
        existing.kind = location.kind
        existing.seq = seq
        if (prompt !== '') existing.prompt = prompt
        if (time !== undefined) existing.time = time
        if (oldText !== undefined) existing.oldText = oldText
        if (existing.oldText === null) existing.kind = 'add'
      }
    }
  }
  return order.map(key => byKey.get(key)!).filter((row): row is SessionEdit => row !== undefined)
}

/** Last write of each path; first `oldText` is kept for file-level undo. */
export function latestSessionEdits(edits: readonly SessionEdit[]): SessionEdit[] {
  const byPath = new Map<string, SessionEdit>()
  const order: string[] = []
  for (const edit of edits) {
    const existing = byPath.get(edit.path)
    if (existing === undefined) {
      order.push(edit.path)
      byPath.set(edit.path, { ...edit })
      continue
    }
    const firstOld = existing.oldText
    existing.kind = edit.kind
    existing.turn = edit.turn
    existing.seq = edit.seq
    if (edit.prompt !== '') existing.prompt = edit.prompt
    existing.oldText = firstOld !== undefined ? firstOld : edit.oldText
    if (existing.oldText === null) existing.kind = 'add'
  }
  return order.map(path => byPath.get(path)!).filter((row): row is SessionEdit => row !== undefined)
}

/** One-line prompt preview for the review list (Cursor-style). */
export function promptPreview(prompt: string, max = 72): string {
  const compact = prompt.replace(/\s+/g, ' ').trim()
  if (compact.length <= max) return compact
  return `${compact.slice(0, Math.max(0, max - 1))}…`
}

/** Files last written by the same user turn / prompt. */
export interface ReviewGroup {
  key: string
  turn: number | undefined
  prompt: string
  time?: number
  edits: SessionEdit[]
}

/** Group first-seen edits by the conversation turn that last wrote them. Newest turn first. */
export function groupEditsByTurn(edits: readonly SessionEdit[]): ReviewGroup[] {
  const groups: ReviewGroup[] = []
  const index = new Map<string, ReviewGroup>()
  for (const edit of edits) {
    const key = `${edit.turn ?? 'x'}\n${edit.prompt}`
    let group = index.get(key)
    if (group === undefined) {
      group = { key, turn: edit.turn, prompt: edit.prompt, time: edit.time, edits: [] }
      index.set(key, group)
      groups.push(group)
    }
    if (group.time === undefined && edit.time !== undefined) group.time = edit.time
    group.edits.push(edit)
  }
  return groups.sort((a, b) => (b.turn ?? -1) - (a.turn ?? -1))
}
