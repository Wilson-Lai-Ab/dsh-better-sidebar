/**
 * File / selection references inserted into the composer as chips (Cursor-
 * style `File.java (108-121)`). The draft holds a U+FFFC placeholder; the
 * model form is expanded on send via the `@` trigger source codec.
 */
import { relativeTo } from './paths.ts'
import { headerOf, SELECTION_LIMIT, type SelectionLines } from './selection-payload.ts'

/** Trigger-source name (must match the registered `@` source). */
export const FILE_SOURCE = 'file'

/** Custom drag/clipboard type so the composer can mint a chip, not dump text. */
export const FILE_REF_MIME = 'application/x-dsh-file-ref'

/** One file (optional line span + optional selected snippet). */
export interface FileRef {
  /** Path as stored (relative to cwd when known at insert time). */
  path: string
  lines?: SelectionLines
  /** Snippet sent to the model; omitted for a whole-file drop. */
  selected?: string
  /** Absolute path for opening the editor (kept even when `path` is relative). */
  abs?: string
}

/** Last path segment for the chip label. */
export function fileBaseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return at === -1 ? trimmed : trimmed.slice(at + 1)
}

/** Chip label: `File.java` or `File.java (108-121)`. */
export function fileChipLabel(ref: FileRef): string {
  const name = fileBaseName(ref.path)
  if (ref.lines === undefined) return name
  if (ref.lines.end > ref.lines.start) return `${name} (${ref.lines.start}-${ref.lines.end})`
  return `${name} (${ref.lines.start})`
}

/** One selected line (or a snippet with no span) is typed as plain text, not a chip. */
export function isPlainTextSelection(ref: FileRef): boolean {
  if (ref.selected === undefined || ref.selected === '') return false
  return ref.lines === undefined || ref.lines.end === ref.lines.start
}

/** Clipboard / persistence projection (`@rel` or `@rel:108-121`). */
export function fileClipboardText(ref: FileRef): string {
  return `@${headerOf(ref.path, undefined, ref.lines)}`
}

/** Project an absolute path to the session cwd when possible. */
export function fileRefOf(
  path: string,
  cwd: string | undefined,
  lines?: SelectionLines,
  selected?: string,
): FileRef {
  const rel = cwd !== undefined ? relativeTo(cwd, path) : path
  const snippet = selected !== undefined && selected.length > SELECTION_LIMIT
    ? undefined
    : selected
  return {
    path: rel,
    lines,
    selected: snippet === '' ? undefined : snippet,
    ...(path !== rel ? { abs: path } : {}),
  }
}

export function encodeFileRef(ref: FileRef): string {
  return JSON.stringify({
    p: ref.path,
    ...(ref.lines !== undefined ? { s: ref.lines.start, e: ref.lines.end } : {}),
    ...(ref.selected !== undefined ? { t: ref.selected } : {}),
    ...(ref.abs !== undefined ? { a: ref.abs } : {}),
  })
}

export function decodeFileRef(raw: string): FileRef | null {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { p?: unknown; s?: unknown; e?: unknown; t?: unknown; a?: unknown }
      if (typeof parsed.p !== 'string' || parsed.p === '') return null
      const start = typeof parsed.s === 'number' ? parsed.s : undefined
      const end = typeof parsed.e === 'number' ? parsed.e : start
      return {
        path: parsed.p,
        ...(start !== undefined ? { lines: { start, end: end ?? start } } : {}),
        ...(typeof parsed.t === 'string' && parsed.t !== '' ? { selected: parsed.t } : {}),
        ...(typeof parsed.a === 'string' && parsed.a !== '' ? { abs: parsed.a } : {}),
      }
    } catch {
      return null
    }
  }
  return parseAtToken(trimmed)
}

/** `@rel`, `@rel:12`, `@rel:12-15` (the clipboard projection). */
export function parseAtToken(text: string): FileRef | null {
  const token = text.trim()
  if (!token.startsWith('@')) return null
  const body = token.slice(1)
  if (body === '' || /\s/.test(body)) return null
  const lined = body.match(/^(.*):(\d+)(?:-(\d+))?$/)
  if (lined !== null && lined[1] !== '' && lined[1] !== '.') {
    const start = Number(lined[2])
    const end = lined[3] !== undefined ? Number(lined[3]) : start
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) return null
    return { path: lined[1]!, lines: { start, end } }
  }
  return { path: body }
}

/**
 * Model form: a whole file is `@path`; a selection with a snippet is a
 * fenced block; a line span without a snippet is `@path:lines`.
 */
export function serializeFileRef(raw: string): string {
  const ref = decodeFileRef(raw)
  if (ref === null) return raw
  if (ref.selected !== undefined && ref.selected !== '') {
    return `\`\`\`${headerOf(ref.path, undefined, ref.lines)}\n${ref.selected}\n\`\`\``
  }
  return fileClipboardText(ref)
}

/** The insert-reference payload the input machine mints a chip from. */
export function fileReferenceInsert(ref: FileRef): {
  source: string
  ref: string
  label: string
  clipboardText: string
} {
  return {
    source: FILE_SOURCE,
    ref: encodeFileRef(ref),
    label: fileChipLabel(ref),
    clipboardText: fileClipboardText(ref),
  }
}

/**
 * Copy a selection for the composer chip AND for everywhere else:
 * the custom MIME is the chip payload; `text/plain` stays the selected
 * source so paste into chat/email/another editor is the original text.
 * No selected body → leave the event alone (browser default copy).
 */
export function writeFileRefClipboard(event: ClipboardEvent, ref: FileRef): void {
  const data = event.clipboardData
  if (data === null) return
  if (ref.selected === undefined || ref.selected === '') return
  event.preventDefault()
  data.setData(FILE_REF_MIME, encodeFileRef(ref))
  data.setData('text/plain', ref.selected)
}
