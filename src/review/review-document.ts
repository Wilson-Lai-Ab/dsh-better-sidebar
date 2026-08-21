/**
 * Keep / Undo ledger shape shared by the host disk file and the client
 * memory cache. No Node imports — safe in the browser bundle.
 */

export type ReviewDecision = 'kept' | 'undone'

export interface ReviewDocument {
  decisions: Record<string, ReviewDecision>
  seen: Record<string, string>
  hunks: Record<string, ReviewDecision>
  /** Epoch ms of the last Keep / Undo write. */
  touchedAt?: number
}

export function emptyReviewDocument(): ReviewDocument {
  return { decisions: {}, seen: {}, hunks: {} }
}

function decisionMapOf(value: unknown): Record<string, ReviewDecision> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, ReviewDecision> = {}
  for (const [path, decision] of Object.entries(value as Record<string, unknown>)) {
    if (decision === 'kept' || decision === 'undone') out[path] = decision
  }
  return out
}

function seenMapOf(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [path, seen] of Object.entries(value as Record<string, unknown>)) {
    if (typeof seen === 'string' && seen !== '') out[path] = seen
  }
  return out
}

export function parseReviewDocument(value: unknown): ReviewDocument {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return emptyReviewDocument()
  const record = value as Partial<ReviewDocument>
  const touchedAt = typeof record.touchedAt === 'number' && Number.isFinite(record.touchedAt)
    ? record.touchedAt
    : undefined
  return {
    decisions: decisionMapOf(record.decisions),
    seen: seenMapOf(record.seen),
    hunks: decisionMapOf(record.hunks),
    ...(touchedAt !== undefined ? { touchedAt } : {}),
  }
}

export function reviewDocumentIsEmpty(doc: ReviewDocument): boolean {
  return Object.keys(doc.decisions).length === 0 && Object.keys(doc.hunks).length === 0
}

function isRelativeReviewPath(path: string): boolean {
  return !path.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(path)
}

/** True when two ledger keys are the same file (cwd turned a relative path absolute). */
export function sameReviewPath(a: string, b: string): boolean {
  const left = a.replace(/\\/g, '/')
  const right = b.replace(/\\/g, '/')
  if (left === right) return true
  if (isRelativeReviewPath(left) && right.endsWith(`/${left}`)) return true
  if (isRelativeReviewPath(right) && left.endsWith(`/${right}`)) return true
  return false
}

/** Existing map key for this file, if the ledger stored a relative or absolute alias. */
export function reviewPathKeyOf(map: Record<string, unknown>, path: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(map, path)) return path
  for (const key of Object.keys(map)) {
    if (sameReviewPath(key, path)) return key
  }
  return undefined
}
