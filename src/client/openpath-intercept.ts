/**
 * Interception of the chat's file-open funnel. Current DSH chat tool-row
 * clicks call `ctx.remote.session.openWorkspacePath` (which hands the path
 * to the Host OS default app — VS Code on this machine). Older DSH builds
 * used `ctx.workspaces.openPath`. Both wrappers live here so the takeover
 * still works across that rename; intercepted calls open the sidebar editor
 * instead of launching the Host OS — no DSH modification needed.
 *
 * The wrappers are dependency-free by design (no React / ui-primitives), so
 * the takeover logic is unit-testable and the file stays importable from the
 * test runtime.
 */

/** The one service method the wrapper replaces (mirror of the runtime IWorkspaces). */
export interface OpenPathService {
  openPath(path: string): Promise<void>
}

/** Per-call decisions the wrapper needs (wired to the store + ctx in the client half). */
export interface OpenPathInterceptDeps {
  /**
   * Whether to take over this call: the `interceptOpenPath` pref AND the
   * editor tab's own enable switch must both be on (an editor that cannot
   * open must not swallow opens — they fall through to the Host).
   */
  takeoverEnabled(): boolean
  /** The session whose scope the sidebar editor loads the file in (current session). */
  currentSessionId(): string | undefined
  /** Route the open into the sidebar editor (the established openSidebarFile). */
  openInSidebar(path: string, sessionId: string): void
}

/** Current DSH chat file-open funnel (`ctx.remote.session.openWorkspacePath`). */
export interface OpenWorkspacePathService {
  openWorkspacePath(
    request: { path: string },
    signal?: AbortSignal,
  ): Promise<{ ok: true; value: { opened: true } } | { ok: false; error: { message: string } }>
}

/**
 * Wrap `session.openWorkspacePath`: intercepted calls open the sidebar editor
 * and resolve as `{ opened: true }` so the Host OS default app is not launched.
 */
export function wrapOpenWorkspacePath(
  session: OpenWorkspacePathService,
  deps: OpenPathInterceptDeps,
): () => void {
  const original = session.openWorkspacePath
  session.openWorkspacePath = (request, signal) => {
    if (deps.takeoverEnabled()) {
      const sessionId = deps.currentSessionId()
      if (sessionId !== undefined && request.path.length > 0) {
        deps.openInSidebar(request.path, sessionId)
        return Promise.resolve({ ok: true, value: { opened: true } })
      }
    }
    return original.call(session, request, signal)
  }
  return () => {
    session.openWorkspacePath = original
  }
}

/**
 * Wrap `workspaces.openPath`: intercepted calls open the file in the sidebar
 * editor instead of the Host OS and resolve as success (the original's
 * callers ignore the result); anything that declines falls through to the
 * original method untouched.
 * @param workspaces - the client workspaces service to wrap.
 * @param deps - per-call takeover decisions.
 * @returns the disposer restoring the original method (HMR-safe).
 */
export function wrapOpenPath(workspaces: OpenPathService, deps: OpenPathInterceptDeps): () => void {
  // The RAW method reference (never a bound copy): restore must put back the
  // exact original so a chain of wrappers (other plugins wrapping the same
  // method) keeps working across disposals in any order.
  const original = workspaces.openPath
  workspaces.openPath = (path: string): Promise<void> => {
    if (deps.takeoverEnabled()) {
      const sessionId = deps.currentSessionId()
      if (sessionId !== undefined) {
        deps.openInSidebar(path, sessionId)
        return Promise.resolve()
      }
    }
    return original.call(workspaces, path)
  }
  return () => {
    workspaces.openPath = original
  }
}
