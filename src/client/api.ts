/**
 * Typed fetch wrapper over the /sidebar JSON API. Every call posts to
 * `/sidebar/api/<method>` with the sessionId and — when known — the session's
 * cwd from the client's own list summary. The host prefers its attached
 * session header and uses the summary cwd only while the session is still
 * hydrating at page load (a detached session would otherwise fail the
 * request). Failures surface as {@link SidebarApiError} with the wire code.
 */
import { encodeHtmlUrl } from '../html-route.ts'
import type { ReviewDocument } from '../review/review-document.ts'
import type { BrowserProbeResult } from './browser.ts'

/** One wire failure. */
export class SidebarApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/** Explorer row (host fs-tree shape). */
export interface FsEntry {
  name: string
  path: string
  isDir: boolean
  hidden: boolean
}

/** One Quick-Open hit from `fs.find`. */
export interface FsFindHit {
  path: string
  rel: string
  score: number
  indices: number[]
}

/** Git status entry (host git shape). */
export interface GitStatusEntry {
  path: string
  xy: string
}

/** One git work tree under the session workspace. */
export interface GitRepoInfo {
  root: string
  name: string
  rel: string
}

/** Git status snapshot. */
export interface GitStatusResult {
  isRepo: boolean
  branch?: string
  root?: string
  entries: GitStatusEntry[]
}

/** One git log row. */
export interface GitLogEntry {
  /** Short hash (7+ chars, display). */
  hash: string
  /** Full 40-char hash (advanced operations). */
  hashFull: string
  subject: string
  author: string
  /** ISO 8601 author date (`%ai`). */
  date: string
  /** Ref decorations (--decorate=short), e.g. `HEAD -> main, origin/main`; '' when none. */
  refs: string
}

/** Text read result. */
export interface FsTextResult { kind: 'text'; content: string; truncated: boolean }
/** Binary read result (no content; images load through the media route).
 *  `head` carries the first bytes (base64) for viewer detect sniffing. */
export interface FsBinaryResult { kind: 'binary'; size: number; truncated: boolean; head: string }

/**
 * One jobs.output response: the output the MODEL has read so far for the
 * job (replayed from the owner session's event log — the model's
 * job_output cursor is never touched, so the pane can never steal the
 * agent's bytes). `read` is false until the model actually called
 * job_output for the job.
 */
export interface JobOutputResult {
  text: string
  /** True when the host capped the text at its output limit. */
  truncated: boolean
  /** Whether the model has read the job at least once. */
  read: boolean
}

async function call<T>(method: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/sidebar/api/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    throw new SidebarApiError('network', error instanceof Error ? error.message : String(error))
  }
  const parsed: { ok?: boolean; value?: unknown; error?: { code?: string; message?: string } } | null
    = await response.json().catch(() => null)
  if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === undefined) {
    throw new SidebarApiError(
      parsed?.error?.code ?? 'http',
      parsed?.error?.message ?? `HTTP ${response.status}`,
    )
  }
  return parsed.value as T
}

/** One request's session scope: the conversation id plus its cwd when known. */
export interface SessionScope {
  sessionId: string
  /** The session's working directory from the client list summary (optional). */
  cwd?: string
  /** Absolute git work-tree root when the Git panel has a selected repo. */
  repo?: string
}

/** Fold a scope into a JSON payload ({cwd} only when present). */
function scopePayload(scope: SessionScope, extra: Record<string, unknown>): Record<string, unknown> {
  return {
    sessionId: scope.sessionId,
    ...(scope.cwd !== undefined && scope.cwd !== '' ? { cwd: scope.cwd } : {}),
    ...(scope.repo !== undefined && scope.repo !== '' ? { repo: scope.repo } : {}),
    ...extra,
  }
}

/** The sidebar API surface (session scope threaded through every call). */
export const api = {
  sessionCwd: (scope: SessionScope, signal?: AbortSignal) =>
    call<{ sessionId: string; cwd: string; root: string; parent: string | null }>('session.cwd', scopePayload(scope, {}), signal),
  fsTree: (scope: SessionScope, path: string, signal?: AbortSignal) =>
    call<{ path: string; entries: FsEntry[]; truncated: boolean }>('fs.tree', scopePayload(scope, { path }), signal),
  fsFind: (scope: SessionScope, query: string, signal?: AbortSignal) =>
    call<{ hits: FsFindHit[] }>('fs.find', scopePayload(scope, { query }), signal),
  fsRead: (scope: SessionScope, path: string, signal?: AbortSignal) =>
    call<FsTextResult | FsBinaryResult>('fs.read', scopePayload(scope, { path }), signal),
  fsWrite: (scope: SessionScope, path: string, content: string) =>
    call<{ ok: true }>('fs.write', scopePayload(scope, { path, content })),
  fsUnlink: (scope: SessionScope, path: string) =>
    call<{ ok: true }>('fs.unlink', scopePayload(scope, { path })),
  fsRename: (scope: SessionScope, from: string, to: string) =>
    call<{ ok: true; path: string }>('fs.rename', scopePayload(scope, { from, to })),
  fsReveal: (scope: SessionScope, path: string) =>
    call<{ ok: true }>('fs.reveal', scopePayload(scope, { path })),
  fsOpenInBrowser: (scope: SessionScope, path: string) =>
    call<{ ok: true }>('fs.openInBrowser', scopePayload(scope, { path })),
  gitShow: (scope: SessionScope, path: string, rev: string, signal?: AbortSignal) =>
    call<{ content: string | null }>('git.show', scopePayload(scope, { path, rev }), signal),
  gitRepos: (scope: SessionScope, signal?: AbortSignal) =>
    call<{ repos: GitRepoInfo[] }>('git.repos', scopePayload(scope, {}), signal),
  gitStatus: (scope: SessionScope, signal?: AbortSignal) =>
    call<GitStatusResult>('git.status', scopePayload(scope, {}), signal),
  gitDiff: (scope: SessionScope, path: string | undefined, staged: boolean, signal?: AbortSignal) =>
    call<{ diff: string }>('git.diff', scopePayload(scope, { ...(path !== undefined ? { path } : {}), staged }), signal),
  gitStage: (scope: SessionScope, path?: string) =>
    call<{ ok: true }>('git.stage', scopePayload(scope, { ...(path !== undefined ? { path } : {}) })),
  gitUnstage: (scope: SessionScope, path?: string) =>
    call<{ ok: true }>('git.unstage', scopePayload(scope, { ...(path !== undefined ? { path } : {}) })),
  /** Stage tracked modifications/deletions only (untracked files stay put). */
  gitStageTracked: (scope: SessionScope) =>
    call<{ ok: true }>('git.stage-tracked', scopePayload(scope, {})),
  /** Stage the given untracked paths in one batch. */
  gitStageUntracked: (scope: SessionScope, paths: string[]) =>
    call<{ ok: true }>('git.stage-untracked', scopePayload(scope, { paths })),
  gitCommit: (scope: SessionScope, message: string) =>
    call<{ ok: true }>('git.commit', scopePayload(scope, { message })),
  gitBranch: (scope: SessionScope, signal?: AbortSignal) =>
    call<{ current: string; names: string[] }>('git.branch', scopePayload(scope, {}), signal),
  gitCheckout: (scope: SessionScope, branch: string) =>
    call<{ ok: true }>('git.checkout', scopePayload(scope, { branch })),
  /** Recent commit history, lazily pageable (skip/count; defaults 0/30). */
  gitLog: (scope: SessionScope, count?: number, skip?: number, signal?: AbortSignal) =>
    call<GitLogEntry[]>('git.log', scopePayload(scope, {
      ...(count !== undefined ? { count } : {}),
      ...(skip !== undefined ? { skip } : {}),
    }), signal),
  /** Full patch text of one commit (diff display for the history rows). */
  gitCommitDiff: (scope: SessionScope, hash: string, signal?: AbortSignal) =>
    call<{ diff: string }>('git.commit-diff', scopePayload(scope, { hash }), signal),
  /** Discard the worktree changes of one file (the index is untouched). */
  gitDiscard: (scope: SessionScope, path: string) =>
    call<{ ok: true }>('git.discard', scopePayload(scope, { path })),
  /** Revert one commit onto the current branch. */
  gitRevert: (scope: SessionScope, hash: string) =>
    call<{ ok: true }>('git.revert', scopePayload(scope, { hash })),
  /** Cherry-pick one commit onto the current branch. */
  gitCherryPick: (scope: SessionScope, hash: string) =>
    call<{ ok: true }>('git.cherry-pick', scopePayload(scope, { hash })),
  /** Release a terminal's process immediately (tab closed; the WS close frame
   *  may be unreachable while the socket is down, so the host also accepts
   *  this explicit route). */
  ptyClose: (scope: SessionScope, tab: string) =>
    call<{ ok: true }>('pty.close', scopePayload(scope, { tab })),
  /** Release an agent terminal by uuid (tab closed while WS was down). */
  agentPtyClose: (uuid: string) =>
    call<{ ok: true }>('agent-pty.close', { uuid }),
  /**
   * The output the model has read so far for one background job (replayed
   * from the owner session's event log — never the model's job_output
   * cursor). The scope MUST be the job's OWNER session.
   */
  jobOutput: (scope: SessionScope, id: string, signal?: AbortSignal) =>
    call<JobOutputResult>('jobs.output', scopePayload(scope, { id }), signal),
  /** Request cancellation of one background job (live jobs flip to stopping). */
  jobKill: (scope: SessionScope, id: string, reason?: string) =>
    call<{ ok: true; outcome: 'requested' | 'already-finished' }>('jobs.kill', scopePayload(scope, {
      id,
      ...(reason !== undefined ? { reason } : {}),
    })),
  /** Read this conversation's Keep / Undo ledger from the session directory. */
  reviewGet: (scope: SessionScope, signal?: AbortSignal) =>
    call<ReviewDocument>('review.get', scopePayload(scope, {}), signal),
  /** Replace this conversation's Keep / Undo ledger on disk. */
  reviewPut: (scope: SessionScope, document: ReviewDocument) =>
    call<ReviewDocument>('review.put', scopePayload(scope, { document })),
  /** Read the side card preferences (plugin-global, no session scope). */
  settingsGet: () =>
    call<{ value?: unknown; revision?: number }>('settings.get', {}),
  /** Merge a patch into the side card preferences (revision-guarded). */
  settingsUpdate: (patch: Record<string, unknown>, expectedRevision?: number) =>
    call<{ value?: unknown; revision?: number }>('settings.update', {
      patch,
      ...(expectedRevision !== undefined ? { expectedRevision } : {}),
    }),
  /** Probe a URL's response headers (the sidebar browser's embeddability
   *  check; see the host's browser.probe route). */
  browserProbe: (url: string, signal?: AbortSignal) =>
    call<BrowserProbeResult>('browser.probe', { url }, signal),
}

/** Absolute URL of the media route for one path (images only). */
export function mediaUrl(scope: SessionScope, path: string): string {
  return fileUrl(scope, path, false)
}

/** Absolute URL of the download route: serves raw bytes (binary-safe) with
 *  `Content-Disposition: attachment`, so the browser saves the file. */
export function downloadUrl(scope: SessionScope, path: string): string {
  return fileUrl(scope, path, true)
}

/** Shared URL builder for the /sidebar/file route (media vs download). */
function fileUrl(scope: SessionScope, path: string, download: boolean): string {
  const params = new URLSearchParams({ sessionId: scope.sessionId, path })
  if (scope.cwd !== undefined && scope.cwd !== '') params.set('cwd', scope.cwd)
  if (download) params.set('download', '1')
  return `/sidebar/file?${params.toString()}`
}

/** Absolute URL of the HTML preview route (see html-route.ts): the path is
 *  fully encoded so the previewed page's relative assets resolve back into
 *  the same route with the session scope intact. */
export function htmlUrl(scope: SessionScope, path: string): string {
  return encodeHtmlUrl(scope.sessionId, path)
}
