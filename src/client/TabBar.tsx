/**
 * The tab strip of one pane: tabs capped at TAB_MAX_WIDTH (ellipsized),
 * overflow scrolls horizontally, a close button per tab, and drag/drop
 * support. New views open from the workbench's activity bar (the + menu is
 * gone), so `onNewTab`/`newTabOptions` are optional here — `PaneEmptyCards`
 * still offers the openable types on an empty pane. `stripTabFilter`
 * limits the strip to file-preview/aux tabs (editor / diff / git-log) when
 * the activity bar owns the tool views.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  IconCloseFill14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarTab } from './state.ts'
import { t } from './locales.ts'
import css from './sidebar.module.css'

/** One activity-bar / empty-pane option. */
export interface NewTabOption {
  id: string
  label: string
  disabled?: boolean
  /** Leading icon (activity bar / empty-pane card). */
  icon?: ReactNode
  /** Multi-instance view (terminal/browser mint `<n>` ids): an active-icon
   *  click opens ANOTHER instance instead of collapsing the panel. */
  multi?: boolean
}

/** Drag payload for tab moves (HTML5 DnD dataTransfer). */
export const TAB_DRAG_TYPE = 'application/x-dsh-tab'

export interface TabDragPayload {
  tabId: string
  paneId: string
  /** History / file-row seed: drop opens this tab instead of moving an existing one. */
  openTab?: SidebarTab
}

export function serializeDrag(payload: TabDragPayload): string {
  return JSON.stringify(payload)
}

function parseOpenTab(value: unknown): SidebarTab | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || typeof record.type !== 'string' || typeof record.title !== 'string') {
    return undefined
  }
  return value as SidebarTab
}

export function parseDrag(raw: string): TabDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as TabDragPayload
    if (typeof parsed.tabId !== 'string' || typeof parsed.paneId !== 'string') return null
    const openTab = parseOpenTab(parsed.openTab)
    return openTab === undefined ? { tabId: parsed.tabId, paneId: parsed.paneId } : { tabId: parsed.tabId, paneId: parsed.paneId, openTab }
  } catch {
    return null
  }
}

/** Global tab-drag flag: PDF iframes become non-interactive synchronously. */
export function setTabDragging(active: boolean): void {
  if (active) document.body.setAttribute('data-dsh-tab-dragging', '')
  else document.body.removeAttribute('data-dsh-tab-dragging')
}

/** Start a workbench / conversation-column drag that opens `tab` on drop. */
export function beginOpenTabDrag(event: { dataTransfer: DataTransfer | null }, tab: SidebarTab): void {
  if (event.dataTransfer === null) return
  setTabDragging(true)
  event.dataTransfer.setData(TAB_DRAG_TYPE, serializeDrag({ tabId: tab.id, paneId: 'seed', openTab: tab }))
  event.dataTransfer.effectAllowed = 'copyMove'
}

export function TabBar(props: {
  paneId: string
  tabs: SidebarTab[]
  active: string | null
  onActivate: (tabId: string) => void
  onClose: (tabId: string) => void
  /** Optional: the + menu is gone; empty-pane cards open new tabs instead. */
  onNewTab?: (optionId: string) => void
  newTabOptions?: NewTabOption[]
  /** Drop of a tab from any pane: (payload, insertBeforeTabId | null). */
  onDropTab: (payload: TabDragPayload, before: string | null) => void
  /** Double-click a workbench tab: dock it onto the conversation header. */
  onDockToCenter?: (tabId: string) => void
  /** Icon resolver for tab labels (reads from the tab descriptor registry). */
  getTabIcon?: (tab: SidebarTab) => ReactNode
  /** Badge resolver for tab labels (reads the descriptor's `badge`; the
   *  resolver returns the rendered pill or null). */
  getTabBadge?: (tab: SidebarTab) => ReactNode
  /** Extra class on the tab title (git status color). */
  getTabTitleClass?: (tab: SidebarTab) => string | undefined
  /** Only render tabs that pass this predicate (file-preview types in the
   *  strip when the activity bar owns the tool views). Omit → every tab. */
  stripTabFilter?: (tab: SidebarTab) => boolean
}) {
  const {
    paneId, tabs, active, onActivate, onClose, onDropTab, onDockToCenter, getTabIcon, getTabBadge, getTabTitleClass, stripTabFilter,
  } = props
  const [dragOver, setDragOver] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const stripTabs = stripTabFilter === undefined ? tabs : tabs.filter(stripTabFilter)

  // Wheel over the strip scrolls the tab row horizontally (a plain mouse
  // wheel emits deltaY, which overflow-x alone never consumes). Bound as a
  // native NON-passive listener: React registers onWheel passively at the
  // root, where preventDefault() is a no-op. Modifier keys keep their native
  // meaning (shift = horizontal scroll, ctrl/cmd = zoom), and a strip that
  // does not overflow leaves the event alone so the page scrolls normally.
  useEffect(() => {
    const el = listRef.current
    if (el === null) return
    const onWheel = (event: WheelEvent): void => {
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
      if (el.scrollWidth <= el.clientWidth) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1
      el.scrollLeft += (event.deltaX + event.deltaY) * unit
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel) }
    // Re-bind when the strip appears: an empty preview strip returns null,
    // so listRef is unset on the first paint and this effect would otherwise
    // stay a no-op after opening a file (React #300 fix moved the early
    // return below the hooks).
  }, [stripTabs.length])

  useEffect(() => {
    const clear = (): void => { setTabDragging(false); setDragOver(false) }
    window.addEventListener('dragend', clear, true)
    window.addEventListener('drop', clear, true)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('dragend', clear, true)
      window.removeEventListener('drop', clear, true)
      window.removeEventListener('blur', clear)
    }
  }, [])

  // An empty strip renders NO chrome: the activity bar owns the tool views,
  // so a pane showing only a tool view (explorer / git / terminal …) has an
  // empty file-preview strip — without this early return it draws a bare
  // 34px bar across the top (the "white block" the user asked to remove).
  // MUST sit AFTER every hook: opening a file grows the strip from 0 → 1
  // tabs; an early return before useEffect is React #300 (minified error).
  if (stripTabs.length === 0) return null

  return (
    <div
      className={clsx(css.tabBar, dragOver && css.tabBarDrop)}
      onDragOver={(event) => {
        // The strip owns drops on itself (merge into this pane); stopping
        // propagation keeps the pane root from also running its edge-zone
        // handler on the same drop.
        event.preventDefault()
        event.stopPropagation()
        setDragOver(true)
      }}
      onDragLeave={() => { setDragOver(false) }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setDragOver(false)
        setTabDragging(false)
        const raw = event.dataTransfer.getData(TAB_DRAG_TYPE)
        const payload = parseDrag(raw)
        if (payload !== null) onDropTab(payload, null)
      }}
    >
      <div ref={listRef} className={css.tabList}>
        {stripTabs.map(tab => (
          <div
            key={tab.id}
            className={clsx(css.tab, active === tab.id && css.tabActive)}
            title={tab.title}
            draggable
            onDragStart={(event) => {
              setTabDragging(true)
              event.dataTransfer.setData(TAB_DRAG_TYPE, serializeDrag({ tabId: tab.id, paneId }))
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => { setTabDragging(false); setDragOver(false) }}
            onDragOver={(event) => { event.preventDefault(); event.stopPropagation() }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setTabDragging(false)
              const raw = event.dataTransfer.getData(TAB_DRAG_TYPE)
              const payload = parseDrag(raw)
              if (payload !== null) onDropTab(payload, tab.id)
            }}
            onClick={() => { onActivate(tab.id) }}
            onDoubleClick={(event) => {
              if (onDockToCenter === undefined) return
              event.preventDefault()
              event.stopPropagation()
              onDockToCenter(tab.id)
            }}
            onAuxClick={(event) => {
              // Middle-click closes the tab (and suppresses autoscroll).
              if (event.button === 1) {
                event.preventDefault()
                onClose(tab.id)
              }
            }}
          >
            {getTabIcon?.(tab) ?? null}
            {getTabBadge?.(tab) ?? null}
            <span className={clsx(css.tabTitle, getTabTitleClass?.(tab))}>{tab.title}</span>
            <button
              type="button"
              className={css.tabClose}
              aria-label={t('close')}
              onClick={(event) => {
                event.stopPropagation()
                onClose(tab.id)
              }}
            >
              <IconCloseFill14 />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
