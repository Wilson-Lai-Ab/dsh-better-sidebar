/**
 * Pending agent writes from dsh-local-history, when that plugin is mounted.
 * Explorer session coloring prefers this over the built-in review.json ledger.
 */
export type LhPendingKind = 'add' | 'edit' | 'delete'

export interface LhPendingRecord {
  path: string
  kind?: string
  decision?: string
  source?: string
}

export function sessionEditsFromLhPending(records: readonly LhPendingRecord[]): { path: string; kind: LhPendingKind }[] {
  const out: { path: string; kind: LhPendingKind }[] = []
  for (const record of records) {
    if (record.source !== undefined && record.source !== 'agent') continue
    if (record.decision !== undefined && record.decision !== 'pending') continue
    const kind = record.kind === 'add' || record.kind === 'delete' ? record.kind : 'edit'
    if (typeof record.path !== 'string' || record.path === '') continue
    out.push({ path: record.path, kind })
  }
  return out
}

export interface LocalHistoryFace {
  listReview(sessionId: string, cwd?: string): Promise<{
    ok: boolean
    value?: { records?: readonly LhPendingRecord[]; pending?: number }
  }>
}

export function localHistoryFaceOf(ctx: { get?: (name: string) => unknown; reflect?: { get(name: string): unknown } } | undefined): LocalHistoryFace | undefined {
  const face = ctx?.reflect?.get('remote.localHistory') ?? ctx?.get?.('remote.localHistory')
  if (face === null || typeof face !== 'object') return undefined
  if (typeof (face as LocalHistoryFace).listReview !== 'function') return undefined
  return face as LocalHistoryFace
}
