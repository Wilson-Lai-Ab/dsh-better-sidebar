/**
 * Dock sidebar tabs onto the conversation header (对话 / 轨迹).
 *
 * Each docked tab is a `conversation.view` list entry. Host chrome owns the
 * tab button; this file owns the body and the drop target over the empty
 * strip next to 对话 / 轨迹.
 */
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import type { Context } from '../context-types.ts'
import { insertFileRef } from './conversation-draft.ts'
import { fileRefOf } from './file-ref.ts'
import { TabContent } from './tab-content.tsx'
import { parseDrag, TAB_DRAG_TYPE } from './TabBar.tsx'
import { observeHostHeader, scheduleGuardedFrame } from './dom-sync.ts'
import {
  CENTER_PANE_ID, dockTabToCenter, openDiffTab, toggleExpanded,
  type SidebarStore, type SidebarTab,
} from './state.ts'
import { t } from './locales.ts'
import css from './sidebar.module.css'

const VIEW_PREFIX = 'dsh-center:'
const DROP_ID = 'dsh-center-drop'

export function centerViewId(tabId: string): string {
  return `${VIEW_PREFIX}${tabId}`
}

function CenterTabView(props: {
  tabId: string
  ctx: Context
  store: SidebarStore
  sessionId: string
}): ReactNode {
  const { tabId, ctx, store, sessionId } = props
  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => store.subscribe(listener), [store]),
    store.getSnapshot,
  )
  const state = snapshot.state
  const tab = state?.centerTabs.find(candidate => candidate.id === tabId)
  const cwd = snapshot.sessionId === sessionId
    ? ctx.sessions?.list.getSnapshot().byId[sessionId]?.cwd
    : undefined
  const onToggleDir = useCallback((path: string) => {
    store.reduce(s => toggleExpanded(s, path))
  }, [store])
  const onReferenceFile = useCallback((path: string) => {
    insertFileRef(ctx, sessionId, fileRefOf(path, cwd))
  }, [ctx, sessionId, cwd])
  const onOpenDiff = useCallback((diffTab: SidebarTab) => {
    store.reduce(s => openDiffTab(s, CENTER_PANE_ID, diffTab))
  }, [store])
  if (state === undefined || tab === undefined) {
    return <div className={css.centerView}>{t('loading')}</div>
  }
  return (
    <div className={css.centerView}>
      <TabContent
        tab={tab}
        sessionId={sessionId}
        cwd={cwd}
        expanded={state.expanded}
        onToggleDir={onToggleDir}
        onReferenceFile={onReferenceFile}
        ctx={ctx}
        store={store}
        visible
        onSubagentJump={() => { /* session jump stays in the sidebar topology */ }}
        onOpenDiff={onOpenDiff}
      />
    </div>
  )
}

/** After a dock, click the matching conversation-view tab so the host strip lights it. */
export function focusLatestCenterView(title?: string): void {
  const deadline = Date.now() + 2000
  const labelOf = (node: Element): string =>
    node.querySelector('[data-dsh-center-label]')?.textContent?.trim()
    ?? node.textContent?.replace(/[×x]\s*$/u, '').trim()
    ?? ''
  const selected = (node: Element): boolean =>
    node.getAttribute('aria-selected') === 'true'
    || /\btabActive\b/.test(node.className)
  const tryClick = (): void => {
    const tabs = [...document.querySelectorAll('[data-slot="conversation.session.header"] [role="tab"]')]
    const match = title === undefined
      ? tabs.find(node => node.hasAttribute('data-dsh-center-tab')) ?? tabs.at(-1)
      : tabs.find(node => labelOf(node) === title)
        ?? tabs.find(node => node.hasAttribute('data-dsh-center-tab'))
        ?? tabs.at(-1)
    if (match instanceof HTMLElement && !selected(match)) match.click()
    if (match instanceof HTMLElement && selected(match)) return
    if (Date.now() < deadline) requestAnimationFrame(tryClick)
  }
  requestAnimationFrame(tryClick)
}

/**
 * Invisible drop pad on the conversation header tab strip. Visible only
 * while a sidebar tab is dragged; landing docks the tab as a view tab.
 */
function HeaderDropPad(props: { ctx: Context; store: SidebarStore }): ReactNode {
  const { store } = props
  useEffect(() => {
    let pad: HTMLDivElement | undefined
    let tablist: HTMLElement | undefined
    const onOver = (event: DragEvent): void => {
      if (event.dataTransfer === null || !event.dataTransfer.types.includes(TAB_DRAG_TYPE)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (css.headerDropActive !== undefined) pad?.classList.add(css.headerDropActive)
    }
    const onLeave = (): void => {
      if (css.headerDropActive !== undefined) pad?.classList.remove(css.headerDropActive)
    }
    const onDrop = (event: DragEvent): void => {
      event.preventDefault()
      if (css.headerDropActive !== undefined) pad?.classList.remove(css.headerDropActive)
      const payload = parseDrag(event.dataTransfer?.getData(TAB_DRAG_TYPE) ?? '')
      if (payload === null) return
      const prefs = store.getPrefs()
      store.reduce(s => dockTabToCenter(s, payload.paneId, payload.tabId, payload.openTab, prefs.centerTabOverflow, prefs.centerTabMax))
      const landed = store.getSnapshot().state?.centerTabs.find(tab => tab.id === payload.tabId)?.title
      focusLatestCenterView(landed)
    }
    const mount = (): void => {
      const header = document.querySelector('[data-slot="conversation.session.header"] header')
      if (!(header instanceof HTMLElement)) return
      const list = header.querySelector('[role="tablist"]')
      if (!(list instanceof HTMLElement)) return
      if (pad !== undefined && tablist === list && list.contains(pad)) return
      if (pad !== undefined) {
        pad.removeEventListener('dragover', onOver)
        pad.removeEventListener('dragleave', onLeave)
        pad.removeEventListener('drop', onDrop)
        pad.remove()
      }
      tablist = list
      pad = document.createElement('div')
      pad.className = css.headerDrop ?? ''
      pad.setAttribute('data-dsh-header-drop', '')
      pad.textContent = t('dropToConversation')
      pad.addEventListener('dragover', onOver)
      pad.addEventListener('dragleave', onLeave)
      pad.addEventListener('drop', onDrop)
      list.appendChild(pad)
    }
    const guarded = scheduleGuardedFrame(mount)
    mount()
    const root = document.getElementById('root')
    const watcher = root === null ? undefined : observeHostHeader(root, guarded.schedule)
    return () => {
      watcher?.disconnect()
      guarded.disconnect()
      if (pad !== undefined) {
        pad.removeEventListener('dragover', onOver)
        pad.removeEventListener('dragleave', onLeave)
        pad.removeEventListener('drop', onDrop)
        pad.remove()
      }
    }
  }, [store])
  return null
}

/**
 * Keep one `conversation.view` entry per docked tab, plus a header drop pad.
 * Returns the disposer for the fiber.
 */
export function registerConversationViews(ctx: Context, store: SidebarStore): () => void {
  const disposeById = new Map<string, () => void>()
  const sync = (): void => {
    const tabs = store.getSnapshot().state?.centerTabs ?? []
    const want = new Set(tabs.map(tab => tab.id))
    for (const [id, dispose] of disposeById) {
      if (!want.has(id)) {
        dispose()
        disposeById.delete(id)
      }
    }
    for (const tab of tabs) {
      if (disposeById.has(tab.id)) continue
      const id = centerViewId(tab.id)
      const tabId = tab.id
      const dispose = ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id,
        order: 100,
        label: () => store.getSnapshot().state?.centerTabs.find(candidate => candidate.id === tabId)?.title ?? tab.title,
        registrant: 'dsh-better-sidebar',
      }, (props: { sessionId: string }) => (
        <CenterTabView tabId={tabId} ctx={ctx} store={store} sessionId={props.sessionId} />
      )))
      disposeById.set(tab.id, dispose)
    }
  }
  sync()
  const off = store.subscribe(sync)
  const drop = ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: DROP_ID,
    order: 80,
    registrant: 'dsh-better-sidebar',
  }, () => <HeaderDropPad ctx={ctx} store={store} />))
  return () => {
    off()
    drop()
    for (const dispose of disposeById.values()) dispose()
    disposeById.clear()
  }
}
