/**
 * Session-directory Keep / Undo ledger. Lives next to DSH's
 * `session.jsonl.zstd` so installing this plugin is enough — no extra
 * settings, and private-mode browsers still keep the record.
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import {
  emptyReviewDocument,
  parseReviewDocument,
  type ReviewDocument,
} from './review-document.ts'

export {
  emptyReviewDocument,
  parseReviewDocument,
  type ReviewDecision,
  type ReviewDocument,
} from './review-document.ts'

export const REVIEW_FILE = 'review.json'

/** Encode one path segment the same way DSH's jsonl backend does. */
export function encodeSessionSegment(raw: string): string {
  if (raw.length === 0) throw new Error('cannot encode an empty path segment')
  if (raw === '.') return '~002E'
  if (raw === '..') return '~002E~002E'
  let out = ''
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) out += ch
    else out += `~${code.toString(16).toUpperCase().padStart(4, '0')}`
  }
  return out
}

/** Human-navigable project folder under `~/.dsh/sessions`. */
export function projectKey(cwd: string): string {
  if (cwd.length === 0) throw new Error('cannot encode an empty project path')
  let readable = ''
  let separatorRun = false
  for (let i = 0; i < cwd.length; i += 1) {
    const ch = cwd[i]!
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += `~${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
      separatorRun = false
    }
  }
  return `--${(readable.replace(/^-+/, '') || 'root').slice(0, 251)}--`
}

export function defaultSessionsRoot(): string {
  const fromEnv = process.env.DSH_SESSIONS_ROOT
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv
  return join(homedir(), '.dsh', 'sessions')
}

export function reviewFilePath(root: string, cwd: string | undefined, sessionId: string): string {
  const project = cwd === undefined || cwd === '' ? join(root, '_no-cwd') : join(root, projectKey(cwd))
  return join(project, encodeSessionSegment(sessionId), REVIEW_FILE)
}

export async function readReviewDocument(path: string): Promise<ReviewDocument> {
  try {
    const raw = await readFile(path, 'utf8')
    return parseReviewDocument(JSON.parse(raw) as unknown)
  } catch {
    return emptyReviewDocument()
  }
}

export async function writeReviewDocument(path: string, doc: ReviewDocument): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}`
  await mkdir(dirname(path), { recursive: true })
  try {
    await writeFile(tmp, JSON.stringify(doc), 'utf8')
    await rename(tmp, path)
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => undefined)
    throw error
  }
}
