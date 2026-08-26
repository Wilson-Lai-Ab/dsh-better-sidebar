/**
 * The 9 built-in tab descriptors: the plugin registers its own pages
 * (explorer / git / review / terminal / browser / subagent / editor / diff / git-log) through
 * the same {@link BetterSidebarService} external plugins use — eating its
 * own dogfood. The terminal descriptor owns its quota (`TERMINAL_LIMIT`)
 * and mints `terminal:<n>` ids through `createTab`; the browser mints
 * `browser:<n>` the same way (no quota).
 */
import { IconBranchOutline16, IconCodeOutline16, IconFolderOpen16, IconThinkOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '../../context-types.ts'
import { allLeaves, isAgentTabId, openTerminalInBottom, togglePanel, type SidebarState } from '../state.ts'
import { requestGitFocus } from '../git-focus.ts'
import { gitFocusOf } from '../explorer/git-focus.ts'
import { t } from '../locales.ts'
import { openSidebarFile, openSidebarFileAbove } from '../intercept.tsx'
import { ExplorerView } from '../explorer/index.ts'
import { EditorHost } from '../EditorHost.tsx'
import { lazyChunkComponent } from '../lazy-chunk.tsx'
import { GitView } from '../GitView.tsx'
import { ReviewView, collectSessionEdits, latestSessionEdits, pendingCount } from '../review/index.ts'
import { GitLogView } from '../GitLogView.tsx'
import { DiffTab } from '../DiffTab.tsx'
import { SubagentView } from '../SubagentView.tsx'
import { BrowserView } from '../BrowserView.tsx'
import { IconTerminalOutline16, IconDiffOutline16, IconGlobeOutline16, IconHistoryOutline16, IconReviewOutline16 } from '../icons.tsx'

import { TERMINAL_FONT_SIZE_MAX, TERMINAL_FONT_SIZE_MIN } from '../../prefs-shared.ts'
import type { ComponentType } from 'react'
import type { SessionScope } from '../api.ts'
import type { SidebarStore } from '../state.ts'
import type { TabDescriptor } from '../service.ts'

/**
 * Lazy wrapper over the terminal view: xterm (and its stylesheet) is fetched
 * only when a terminal tab is first opened (see chunk-loader.ts). The
 * wrapper keeps the descriptor contract `(props) => ReactNode` — Sidebar
 * calls it as a plain function.
 *
 * TerminalView's props are { scope, tabId, store } — `tabId` is NOT part of
 * TabComponentProps (it carries `tab: SidebarTab` instead), so the
 * descriptor maps it explicitly; a bare pass-through would leave tabId
 * undefined and TerminalView's isAgentTabId(tabId) would crash on
 * `undefined.startsWith` (regression-pinned in tests/lazy-chunk.spec.tsx).
 */
const LazyTerminal = lazyChunkComponent<TerminalViewProps>(
  'terminal',
  (mod) => mod.TerminalView as ComponentType<TerminalViewProps> | undefined,
)

/** The terminal view's props (mirror of TerminalView's own signature). */
interface TerminalViewProps {
  scope: SessionScope
  tabId: string
  store: SidebarStore
  dir?: string
}

/** How many UI-owned terminals may be open at once (agent-owned ones are uncapped). */
export const TERMINAL_LIMIT = 3

/** Count UI-owned terminals (agent:` tabs excluded — they are the model's). */
function uiTerminalCount(state: SidebarState): number {
  return allLeaves(state.splits)
    .concat(allLeaves(state.bottomSplits))
    .flatMap(leaf => leaf.tabs)
    .concat(state.centerTabs)
    .filter(tab => tab.type === 'terminal' && !isAgentTabId(tab.id)).length
}

/** The 7 built-in tab descriptors. */
export function builtinTabs(ctx: Context): readonly TabDescriptor[] {
  return [
    {
      id: 'editor',
      title: () => t('editor'),
      icon: (size: number) => <IconCodeOutline16 size={size} />,
      order: -1,
      hidden: true,
      dedupeKey: (tab) => tab.path,
      component: ({ ctx, store, scope, tab }) => (
        <EditorHost ctx={ctx} store={store} scope={scope} path={tab.path ?? ''} title={tab.title} />
      ),
    },
    {
      id: 'explorer',
      title: () => t('explorer'),
      icon: (size: number) => <IconFolderOpen16 size={size} />,
      order: 10,
      single: true,
      component: ({ ctx, store, scope, expanded, onToggleDir, onReferenceFile }) => (
        <ExplorerView
          sessionId={scope.sessionId}
          cwd={scope.cwd}
          store={store}
          expanded={expanded ?? []}
          onToggle={onToggleDir ?? (() => { /* no-op */ })}
          onOpenFile={(path) => { openSidebarFile(ctx, store, scope.sessionId, path) }}
          onOpenFileAbove={(path) => { openSidebarFileAbove(ctx, store, scope.sessionId, path) }}
          onReferenceFile={onReferenceFile ?? (() => { /* no-op */ })}
          onOpenGit={(path, isDir, repos) => {
            if (ctx.betterSidebar?.isTabEnabled('git') === false) return
            const focus = gitFocusOf(path, isDir, repos)
            if (focus === undefined) return
            requestGitFocus(focus)
            store.reduce(s => s.panelOpen ? s : togglePanel(s))
            ctx.betterSidebar?.openTab({ type: 'git', title: t('git') }, scope)
          }}
          onOpenTerminal={(dir) => {
            if (ctx.betterSidebar?.isTabEnabled('terminal') === false) return
            store.reduce((s) => {
              const tab = {
                id: `terminal:${s.nextTerminal}`,
                type: 'terminal',
                title: `${t('terminal')} ${s.nextTerminal}`,
                path: dir,
              }
              const next = openTerminalInBottom(s, tab)
              if (next === s) return s
              return { ...next, nextTerminal: s.nextTerminal + 1 }
            })
          }}
          onOpenPluginBrowser={(href) => {
            if (ctx.betterSidebar?.isTabEnabled('browser') === false) return
            let title = t('browser')
            try { title = new URL(href).hostname || title } catch { /* keep default */ }
            ctx.betterSidebar?.openTab({ type: 'browser', url: href, title }, scope)
          }}
        />
      ),
    },
    {
      id: 'git',
      title: () => t('git'),
      icon: (size: number) => <IconBranchOutline16 size={size} />,
      order: 20,
      single: true,
      component: ({ ctx, store, scope, onOpenDiff }) => (
        <GitView
          scope={scope}
          store={store}
          onOpenFile={(path) => { openSidebarFile(ctx, store, scope.sessionId, path) }}
          onOpenDiff={onOpenDiff ?? (() => { /* no-op */ })}
        />
      ),
    },
    {
      id: 'review',
      title: () => t('review'),
      icon: (size: number) => <IconReviewOutline16 size={size} />,
      order: 25,
      single: true,
      badge: (ctx, scope) => {
        const nodes = ctx.sessions.binding?.(scope.sessionId)?.session.getSnapshot().nodes ?? []
        try {
          const count = pendingCount(scope.sessionId, latestSessionEdits(collectSessionEdits(nodes, scope.cwd)))
          return count === 0 ? null : count
        } catch {
          return null
        }
      },
      component: ({ ctx, store, scope }) => (
        <ReviewView ctx={ctx} store={store} scope={scope} />
      ),
    },
    {
      id: 'git-log',
      title: () => t('history'),
      icon: (size: number) => <IconHistoryOutline16 size={size} />,
      order: -1,
      hidden: true,
      dedupeKey: (tab) => tab.id,
      component: ({ ctx, store, scope, tab }) => (
        <GitLogView
          ctx={ctx}
          store={store}
          scope={{ ...scope, repo: typeof tab.meta === 'string' ? tab.meta : undefined }}
          repo={typeof tab.meta === 'string' ? tab.meta : undefined}
        />
      ),
    },
    {
      id: 'subagent',
      title: () => t('subagent'),
      icon: (size: number) => <IconThinkOutline16 size={size} />,
      order: 30,
      single: true,
      // Declarative settings: the auto-open switches render under this row in
      // the Side card settings page (the Jobs page's own related settings).
      settings: {
        toggles: [{
          key: 'autoOpenSubagent',
          title: () => t('settingsSubagentTitle'),
          desc: () => t('settingsSubagentDesc'),
        }, {
          key: 'autoOpenJobs',
          title: () => t('settingsJobsTitle'),
          desc: () => t('settingsJobsDesc'),
        }],
      },
      component: ({ ctx, scope, visible, onSubagentJump }) => (
        <SubagentView
          sessionId={scope.sessionId}
          ctx={ctx}
          active={visible}
          onOpenChild={(address) => { onSubagentJump?.(address.childSessionId) }}
        />
      ),
    },
    {
      id: 'terminal',
      title: () => t('terminal'),
      icon: (size: number) => <IconTerminalOutline16 size={size} />,
      order: 40,
      available: (_ctx, _scope, state) => uiTerminalCount(state) < TERMINAL_LIMIT,
      // Declarative settings: the model-facing terminal tools switch, the
      // bottom-panel first-expansion auto-terminal switch, and the custom
      // font family/size rows render under this card in the Side card
      // settings page (the host gates the toolset on the tools one
      // independently; the font rows apply live to every terminal).
      settings: {
        toggles: [{
          key: 'agentTerminalTools',
          title: () => t('settingsToolsTitle'),
          desc: () => t('settingsToolsDesc'),
        }, {
          key: 'bottomPanelAutoTerminal',
          title: () => t('settingsBottomTerminalTitle'),
          desc: () => t('settingsBottomTerminalDesc'),
        }, {
          key: 'terminalFontFamily',
          type: 'text',
          title: () => t('settingsFontFamilyTitle'),
          desc: () => t('settingsFontFamilyDesc'),
          placeholder: t('settingsFontFamilyPlaceholder'),
        }, {
          key: 'terminalFontSize',
          type: 'number',
          title: () => t('settingsFontSizeTitle'),
          desc: () => t('settingsFontSizeDesc'),
          min: TERMINAL_FONT_SIZE_MIN,
          max: TERMINAL_FONT_SIZE_MAX,
          unit: 'px',
        }],
      },
      createTab: (state) => {
        const count = uiTerminalCount(state)
        if (count >= TERMINAL_LIMIT) return null
        return {
          tab: {
            id: `terminal:${state.nextTerminal}`,
            type: 'terminal',
            title: `${t('terminal')} ${state.nextTerminal}`,
          },
          patch: { nextTerminal: state.nextTerminal + 1 },
        }
      },
      component: ({ tab, scope, store }) => (
        <LazyTerminal scope={scope} store={store} tabId={tab.id} dir={tab.path} />
      ),
    },
    {
      id: 'browser',
      title: () => t('browser'),
      icon: (size: number) => <IconGlobeOutline16 size={size} />,
      order: 50,
      // Declarative settings: the sandbox escape hatch, the link-takeover
      // MASTER switch, and the per-protocol takeover switches (http on /
      // https off by default) render under this tab's row in the Side card
      // settings page (the sandbox one is warned on).
      settings: {
        toggles: [{
          key: 'browserNoSandbox',
          title: () => t('settingsBrowserSandboxTitle'),
          desc: () => t('settingsBrowserSandboxDesc'),
        }, {
          key: 'browserInterceptLinks',
          title: () => t('settingsBrowserLinksTitle'),
          desc: () => t('settingsBrowserLinksDesc'),
        }, {
          key: 'browserInterceptHttp',
          title: () => t('settingsBrowserHttpTitle'),
          desc: () => t('settingsBrowserHttpDesc'),
        }, {
          key: 'browserInterceptHttps',
          title: () => t('settingsBrowserHttpsTitle'),
          desc: () => t('settingsBrowserHttpsDesc'),
        }],
      },
      createTab: (state) => ({
        tab: {
          id: `browser:${state.nextBrowser}`,
          type: 'browser',
          title: t('browser'),
        },
        patch: { nextBrowser: state.nextBrowser + 1 },
      }),
      component: (props) => <BrowserView {...props} />,
    },
    {
      id: 'diff',
      title: () => t('git'),
      icon: (size: number) => <IconDiffOutline16 size={size} />,
      order: -1,
      hidden: true,
      dedupeKey: (tab) => tab.id,
      component: ({ ctx, scope, tab }) => (
        tab.diff === undefined ? null
          : <DiffTab ctx={ctx} sessionId={scope.sessionId} cwd={scope.cwd} diff={tab.diff} />
      ),
    },
  ]
}
