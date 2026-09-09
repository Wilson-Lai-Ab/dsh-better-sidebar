/**
 * Interception of the chat's produced-files row: the turn-tail chain entry
 * that replaces ui-deliverables' row when the closing turn produced files.
 * The takeover looks identical (same chip row); the chips open the file in
 * the sidebar instead of the host OS. Priority -1 runs before the default-0
 * deliverables entry; when nothing was produced the selector returns null
 * and the original row renders unchanged.
 */
import { IconCodeOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '../context-types.ts'
import { dockTabToCenter, findPaneOfTab, tabOpenIn, type SidebarStore, type SidebarTab } from './state.ts'
import { focusLatestCenterView } from './conversation-views.tsx'
import { t } from './locales.ts'
import { resolveSidebarPath, selectProducedFiles } from './produced-files.ts'
import { wrapOpenPath, wrapOpenWorkspacePath } from './openpath-intercept.ts'
import css from './sidebar.module.css'

function editorTabOf(ctx: Context, sessionId: string, path: string): SidebarTab {
  const summary = ctx.sessions.list.getSnapshot().byId[sessionId]
  const absolute = resolveSidebarPath(summary?.cwd, path)
  const at = Math.max(absolute.lastIndexOf('/'), absolute.lastIndexOf('\\'))
  const title = at === -1 ? absolute : absolute.slice(at + 1)
  return { type: 'editor', title, path: absolute, id: `editor:${absolute}` }
}

/** Build the workspace-file editor tab for a (possibly relative) path. */
export function editorTabForPath(ctx: Context, sessionId: string, path: string): SidebarTab {
  return editorTabOf(ctx, sessionId, path)
}

/** Open a file in the sidebar's editor (used by the intercepted row and the explorer). */
export function openSidebarFile(ctx: Context, store: SidebarStore, sessionId: string, path: string): void {
  const tab = editorTabOf(ctx, sessionId, path)
  // Route through the sidebar service so the editor descriptor's dedupeKey
  // (per-path) applies; the id is path-derived so multiple editors coexist.
  ctx.betterSidebar?.openTab({ type: tab.type, title: tab.title, path: tab.path, id: tab.id })
}

/** Double-click: dock the file onto the conversation header (对话 / 轨迹). */
export function openSidebarFileAbove(ctx: Context, store: SidebarStore, sessionId: string, path: string): void {
  const tab = editorTabOf(ctx, sessionId, path)
  const prefs = store.getPrefs()
  store.reduce((state) => {
    const next = tabOpenIn(state, tab.id)
      ? dockTabToCenter(state, findPaneOfTab(state, tab.id), tab.id, undefined, prefs.centerTabOverflow, prefs.centerTabMax)
      : dockTabToCenter(state, 'seed', tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax)
    return next
  })
  focusLatestCenterView(tab.title)
}

/** The intercepted produced-files row (visual twin of the deliverables chips). */
export function SidebarProducedFiles(props: {
  matched: readonly string[]
  openInSidebar: (path: string) => void
}) {
  const { matched, openInSidebar } = props
  const shown = matched.slice(0, 6)
  const hidden = matched.length - shown.length
  return (
    <div className={css.producedRow}>
      <span className={css.producedLabel}>{t('produced')}</span>
      {shown.map(path => {
        const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
        const name = at === -1 ? path : path.slice(at + 1)
        return (
          <button
            key={path}
            type="button"
            className={css.producedChip}
            title={path}
            onClick={() => { openInSidebar(path) }}
          >
            <IconCodeOutline16 size={12} />
            <span>{name}</span>
          </button>
        )
      })}
      {hidden > 0 && <span className={css.producedMore}>+{hidden}</span>}
    </div>
  )
}

/**
 * Register the turn-tail interception (returns the disposer).
 *
 * The slot is a CHILD slot the host's ui-conversation declares in its
 * `conversation.chat.node` children table (kind: chain, scope: session).
 * Registering it directly races the declaration — the ui-slots core's
 * load-time validation throws "not declared (a parent entry's children
 * table must declare it)" when the parent entry is not on the ledger yet.
 * slots.inject waits for the declaration: the callback runs synchronously
 * when the slot is already declared, otherwise it runs inside the declaring
 * register() call once the declaration commits; declaration collapse
 * disposes the entry and a later declaration re-registers it. This mirrors
 * @deepseek-ai/dsh-client-ui-deliverables' registration of the same slot.
 */
export function registerTurnTailInterception(ctx: Context, store: SidebarStore): () => void {
  return ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    // Decline the takeover while the editor tab type is disabled in the side
    // card settings: the produced-files row falls back to the default
    // deliverables behavior instead of offering chips that cannot open.
    select: (owner) => {
      if (store.getPrefs().tabsEnabled['editor'] === false) return null
      return selectProducedFiles(owner)
    },
    priority: -1,
    registrant: 'dsh-better-sidebar',
    inject: (sessionId: string) => ({
      openInSidebar: (path: string) => { openSidebarFile(ctx, store, sessionId, path) },
    }),
  }, SidebarProducedFiles))
}

/**
 * Register the chat file-open interception. Current DSH tool-row clicks call
 * `ctx.remote.session.openWorkspacePath` (Host OS default app). Older builds
 * used `ctx.workspaces.openPath`. Both are wrapped so files land in the
 * sidebar editor. Gated by BOTH the `interceptOpenPath` pref and the editor
 * tab's enable switch; declined opens fall through. Returns the disposer
 * restoring the original methods (HMR-safe).
 */
export function registerOpenPathInterception(ctx: Context, store: SidebarStore): () => void {
  const deps = {
    takeoverEnabled: () => store.getPrefs().interceptOpenPath !== false
      && store.getPrefs().tabsEnabled['editor'] !== false,
    currentSessionId: () => ctx.sessions.list.getSnapshot().current,
    openInSidebar: (path: string, sessionId: string) => { openSidebarFile(ctx, store, sessionId, path) },
  }
  const restorePath = typeof ctx.workspaces?.openPath === 'function'
    ? wrapOpenPath(ctx.workspaces, deps)
    : () => { /* older/newer runtimes may omit this funnel */ }
  // Cordis treats `remote.session` as its own service. Reading
  // `ctx.remote.session` without inject `remote.session` throws
  // "cannot get property remote.session without inject".
  let session: Parameters<typeof wrapOpenWorkspacePath>[0] | undefined
  try {
    const value = typeof ctx.get === 'function' ? ctx.get('remote.session') : undefined
    if (value !== undefined && typeof (value as { openWorkspacePath?: unknown }).openWorkspacePath === 'function') {
      session = value as Parameters<typeof wrapOpenWorkspacePath>[0]
    }
  } catch {
    session = undefined
  }
  const restoreWorkspace = session !== undefined
    ? wrapOpenWorkspacePath(session, deps)
    : () => { /* DSH without session.openWorkspacePath keeps workspaces.openPath only */ }
  return () => {
    restorePath()
    restoreWorkspace()
  }
}
