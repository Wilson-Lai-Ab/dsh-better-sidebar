/**
 * The split-pane workbench: renders the recursive split tree. A split lays
 * children out row- or column-wise with draggable dividers (fractional
 * sizes); a leaf renders its tab strip plus the active tab's content.
 *
 * Splitting is VSCode-style DRAG-TO-EDGE, not buttons: while dragging a tab
 * over a pane, a drop overlay shows five zones — four edges (left/right/up/
 * down) that split the pane with the tab in a fresh leaf, and the center
 * that merges the tab into the pane. The tree and all operations live in
 * state.ts; this file is pure presentation over them.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { SidebarState, SidebarTab, SplitNode } from './state.ts'
import type { DropZone } from './state.ts'
import { firstLeaf, allLeaves } from './state.ts'
import { TabBar, type NewTabOption, parseDrag, type TabDragPayload } from './TabBar.tsx'
import css from './sidebar.module.css'

/** Actions the workbench needs (bound to the store by the sidebar shell). */
export interface WorkbenchActions {
  closeTab: (paneId: string, tabId: string) => void
  activateTab: (paneId: string, tabId: string) => void
  /** Make a pane the target of newly opened tabs (click focus). */
  focusPane: (paneId: string) => void
  /** VSCode drag gesture: edge → split the target pane, center → merge. */
  moveTabToEdge: (payload: TabDragPayload, toPane: string, zone: DropZone) => void
  /** Reorder within a pane (drop onto another tab inserts before it). */
  moveTabBefore: (payload: TabDragPayload, toPane: string, beforeTabId: string) => void
  /** Double-click a workbench tab onto the conversation header. */
  dockTabToCenter: (paneId: string, tabId: string) => void
  resizeSplit: (splitId: string, index: number, deltaFrac: number) => void
}

/** One divider: pointer-capture drag translating px deltas into fractions.
 * Deltas are incremental — each move reports the displacement since the
 * previous move — because the store adds every reported delta to the pane
 * sizes; a cumulative (since-pointer-down) delta would be re-added on each
 * move and the divider would run away from the cursor. */
function Divider(props: { dir: 'row' | 'col'; onResize: (deltaFrac: number) => void }) {
  const { dir, onResize } = props
  // `last` is the previous pointer position while dragging; `size` is the
  // container size at pointer-down (constant during the drag), used to
  // normalize the px delta into a fraction.
  const last = useRef({ x: 0, y: 0, size: 0 })
  const [dragging, setDragging] = useState(false)

  return (
    <div
      className={clsx(css.divider, dir === 'row' ? css.dividerRow : css.dividerCol, dragging && css.dividerActive)}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        const box = event.currentTarget.parentElement?.getBoundingClientRect()
        last.current = {
          x: event.clientX,
          y: event.clientY,
          size: box === undefined ? 1 : (dir === 'row' ? box.width : box.height),
        }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        const delta = dir === 'row' ? event.clientX - last.current.x : event.clientY - last.current.y
        onResize(delta / Math.max(1, last.current.size))
        last.current.x = event.clientX
        last.current.y = event.clientY
      }}
      onPointerUp={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        event.currentTarget.releasePointerCapture(event.pointerId)
        setDragging(false)
      }}
    />
  )
}

/** Map a pointer position inside a pane to the VSCode drop zone (25% edges). */
function zoneAt(event: React.DragEvent, pane: HTMLElement): DropZone {
  const rect = pane.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return 'center'
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  if (x < 0.25) return 'left'
  if (x > 0.75) return 'right'
  if (y < 0.25) return 'up'
  if (y > 0.75) return 'down'
  return 'center'
}

/**
 * The VS Code-style activity bar: a vertical rail of one icon per openable
 * tool view (non-hidden, enabled tab types). Clicking an icon opens/focuses
 * that view (same dedupe semantics as the old + menu); the active view's icon
 * collapses the panel (VS Code) instead. A disabled view's icon is inert,
 * EXCEPT the active one still collapses the panel on click (the close
 * affordance stays live even when the view itself is unavailable).
 */
export function ActivityBar(props: {
  options: NewTabOption[]
  activeType: string | undefined
  onSelect: (typeId: string) => void
  getBadge?: (typeId: string) => ReactNode
  /** Which edge of the workbench the rail hugs ('right' mirrors the rail). */
  side?: 'left' | 'right'
}) {
  const { options, activeType, onSelect, getBadge, side = 'left' } = props
  if (options.length === 0) return null
  return (
    <div className={clsx(css.activityBar, side === 'right' && css.activityBarRight)} data-sidebar-activity-bar>
      {options.map(option => {
        const active = activeType === option.id
        const disabled = option.disabled === true
        return (
          <div
            key={option.id}
            role="button"
            tabIndex={0}
            aria-label={option.label}
            title={option.label}
            // A disabled-but-active view must still read as the active view
            // (its close affordance stays live), so only mark it disabled
            // when it is not the one currently open.
            aria-disabled={(!active && disabled) || undefined}
            className={clsx(css.activityItem, active && css.activityActive)}
            onClick={() => {
              // A disabled-but-ACTIVE view is still clickable: its click
              // collapses the panel (VS Code) — onSelect never opens anything
              // for the active item, so letting it through is safe.
              if (disabled && !active) return
              onSelect(option.id)
            }}
            onKeyDown={(event) => {
              // Only keydown that originated on the item itself activates it.
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (disabled && !active) return
                onSelect(option.id)
              }
            }}
          >
            {option.icon ?? null}
            {getBadge?.(option.id) ?? null}
          </div>
        )
      })}
    </div>
  )
}

/**
 * An empty pane's welcome cards: the openable types as cards, clicked to
 * open (instead of a bare "this pane is empty" message).
 */
function PaneEmptyCards(props: {
  newTabOptions: NewTabOption[]
  onNewTab: (optionId: string) => void
}) {
  const { newTabOptions, onNewTab } = props
  return (
    <div className={css.paneEmptyCards}>
      {newTabOptions.map(option => (
        <button
          key={option.id}
          type="button"
          className={css.paneCard}
          disabled={option.disabled === true}
          title={option.label}
          onClick={() => { onNewTab(option.id) }}
        >
          {option.icon ?? null}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

/** A leaf: tab strip + active content + VSCode-style drop target for tabs. */
function LeafView(props: {
  leaf: { id: string; tabs: SidebarTab[]; active: string | null }
  newTabOptions: NewTabOption[]
  actions: WorkbenchActions
  onNewTab: (optionId: string) => void
  renderTab: (tab: SidebarTab, active: boolean, paneId: string) => ReactNode
  getTabIcon?: (tab: SidebarTab) => ReactNode
  getTabBadge?: (tab: SidebarTab) => ReactNode
  getTabTitleClass?: (tab: SidebarTab) => string | undefined
  stripTabFilter?: (tab: SidebarTab) => boolean
}) {
  const { leaf, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge, getTabTitleClass, stripTabFilter } = props
  const [dropZone, setDropZone] = useState<DropZone | null>(null)
  const activeTab = leaf.tabs.find(tab => tab.id === leaf.active) ?? leaf.tabs[leaf.tabs.length - 1]

  useEffect(() => {
    const clear = (): void => { setDropZone(null) }
    window.addEventListener('dragend', clear, true)
    window.addEventListener('drop', clear, true)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('dragend', clear, true)
      window.removeEventListener('drop', clear, true)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return (
    <div
      className={clsx(css.pane, dropZone !== null && css.paneDrop)}
      onPointerDown={() => { actions.focusPane(leaf.id) }}
      onDragOver={(event) => {
        event.preventDefault()
        const zone = zoneAt(event, event.currentTarget)
        setDropZone(zone)
      }}
      onDragLeave={(event) => {
        // Only clear when the pointer left the pane entirely (not onto a child).
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropZone(null)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        const zone = dropZone ?? zoneAt(event, event.currentTarget)
        setDropZone(null)
        const payload = parseDrag(event.dataTransfer.getData('application/x-dsh-tab'))
        if (payload !== null) actions.moveTabToEdge(payload, leaf.id, zone)
      }}
    >
      {dropZone !== null && <div className={clsx(css.dropOverlay, css[`drop${dropZone[0]!.toUpperCase()}${dropZone.slice(1)}`])} />}
      {/*
        The tab strip renders even for an empty pane: a new tab can always be
        created via the activity bar or dragged in.
      */}
      <TabBar
        paneId={leaf.id}
        tabs={leaf.tabs}
        active={leaf.active}
        onActivate={(tabId) => { actions.activateTab(leaf.id, tabId) }}
        onClose={(tabId) => { actions.closeTab(leaf.id, tabId) }}
        getTabIcon={getTabIcon}
        getTabBadge={getTabBadge}
        getTabTitleClass={getTabTitleClass}
        stripTabFilter={stripTabFilter}
        onDropTab={(payload, before) => {
          if (before === null) actions.moveTabToEdge(payload, leaf.id, 'center')
          else actions.moveTabBefore(payload, leaf.id, before)
        }}
        onDockToCenter={(tabId) => { actions.dockTabToCenter(leaf.id, tabId) }}
      />
      {leaf.tabs.length > 0 ? (
        /*
          Every tab stays MOUNTED (inactive ones hidden), so switching tabs
          never tears down the content: a terminal keeps its pty connection
          and scrollback, an editor keeps its CodeMirror view and unsaved
          draft, explorer/git keep their loaded data. The unmount (and the
          terminal's close frame) happens only when a tab is truly closed.
        */
        <div className={css.paneContent}>
          {leaf.tabs.map(tab => (
            <div
              key={tab.id}
              className={clsx(css.paneTab, tab.id !== activeTab?.id && css.paneTabHidden)}
            >
              {renderTab(tab, tab.id === activeTab?.id, leaf.id)}
            </div>
          ))}
        </div>
      ) : (
        <PaneEmptyCards newTabOptions={newTabOptions} onNewTab={onNewTab} />
      )}
    </div>
  )
}

/** Recursive node renderer. */
function NodeView(props: {
  node: SplitNode
  state: SidebarState
  newTabOptions: NewTabOption[]
  actions: WorkbenchActions
  onNewTab: (optionId: string) => void
  renderTab: (tab: SidebarTab, active: boolean, paneId: string) => ReactNode
  getTabIcon?: (tab: SidebarTab) => ReactNode
  getTabBadge?: (tab: SidebarTab) => ReactNode
  getTabTitleClass?: (tab: SidebarTab) => string | undefined
  stripTabFilter?: (tab: SidebarTab) => boolean
}) {
  const { node, state, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge, getTabTitleClass, stripTabFilter } = props
  if (node.kind === 'leaf') {
    return (
      <LeafView
        leaf={node}
        newTabOptions={newTabOptions}
        actions={actions}
        onNewTab={onNewTab}
        renderTab={renderTab}
        getTabIcon={getTabIcon}
        getTabBadge={getTabBadge}
        getTabTitleClass={getTabTitleClass}
        stripTabFilter={stripTabFilter}
      />
    )
  }
  const isRow = node.dir === 'row'
  return (
    <div className={clsx(css.split, isRow ? css.splitRow : css.splitCol)}>
      {node.children.map((child, index) => (
        <Fragment key={child.id}>
          {index > 0 && (
            <Divider
              dir={node.dir}
              onResize={(deltaFrac) => { actions.resizeSplit(node.id, index - 1, deltaFrac) }}
            />
          )}
          <div
            className={css.splitChild}
            style={{ flexGrow: node.sizes[index], flexBasis: 0, minWidth: 0, minHeight: 0 }}
          >
            <NodeView
              node={child}
              state={state}
              newTabOptions={newTabOptions}
              actions={actions}
              onNewTab={onNewTab}
              renderTab={renderTab}
              getTabIcon={getTabIcon}
              getTabBadge={getTabBadge}
              getTabTitleClass={getTabTitleClass}
              stripTabFilter={stripTabFilter}
            />
          </div>
        </Fragment>
      ))}
    </div>
  )
}

/** The workbench: the activity bar plus the split tree filling the sidebar
 *  body. `tree` selects which tree renders (the right panel's by default;
 *  the bottom panel passes `state.bottomSplits` — the actions route by pane
 *  id, so one action set serves both). `stripTabFilter` limits which tabs
 *  render in the strip (file-preview types only); `getActivityBadge` feeds
 *  per-type badges onto the activity icons. */
export function Workbench(props: {
  state: SidebarState
  tree?: SplitNode
  newTabOptions: NewTabOption[]
  actions: WorkbenchActions
  onNewTab: (optionId: string) => void
  renderTab: (tab: SidebarTab, active: boolean, paneId: string) => ReactNode
  getTabIcon?: (tab: SidebarTab) => ReactNode
  getTabBadge?: (tab: SidebarTab) => ReactNode
  getTabTitleClass?: (tab: SidebarTab) => string | undefined
  stripTabFilter?: (tab: SidebarTab) => boolean
  getActivityBadge?: (typeId: string) => ReactNode
  /** false hides the vertical rail (the bottom workbench renders content only). */
  showActivityBar?: boolean
  /** Which edge the rail hugs: 'left' (default) or 'right' (content first). */
  activityBarSide?: 'left' | 'right'
  /** Whether the hosting panel is expanded (drives the active-icon toggle). */
  panelOpen?: boolean
  /** Collapse/expand the hosting panel (VS Code active-icon click). */
  onTogglePanel?: () => void
}) {
  const {
    state, tree, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge, getTabTitleClass,
    stripTabFilter, getActivityBadge, showActivityBar = true, activityBarSide = 'left',
  } = props
  const root = tree ?? state.splits

  // The focused pane's active tab within THIS tree (the active-pane id may
  // point into the other tree — fall back to the first leaf so the bar
  // always reflects this workbench's own current view).
  const focused = useMemo(() => {
    const paneId = state.activePane
    const leaf = paneId === null ? undefined : allLeaves(root).find(candidate => candidate.id === paneId)
    const pane = leaf ?? firstLeaf(root)
    const tab = pane.tabs.find(candidate => candidate.id === pane.active) ?? pane.tabs[pane.tabs.length - 1]
    return { pane, tab }
  }, [root, state.activePane])

  const activeType = focused.tab?.type

  // Route activity-bar opens into THIS workbench's tree. `openTab` lands on
  // the single global active pane (state.activePane), which may live in the
  // OTHER panel's tree — so a bottom-bar click could open in the right panel
  // while this bar's highlight/× tracks its own tree. Focusing this tree's
  // current pane first pins the open where the user clicked (per-panel
  // activity-bar semantics, VS Code style); for the panel that already owns
  // the active pane it is a no-op.
  //
  // The activity-bar rail carries the panel's open/close for TOOL views:
  // clicking the ACTIVE view's icon collapses the panel (VS Code), and any
  // click while the panel is collapsed expands it first so the open lands in
  // sight. The top-right toggle cluster still exists for the case where no
  // tool view is active (e.g. an editor file is open) and there is no bar
  // icon to click — it stays as the file-preview collapse affordance.
  const handleSelect = (typeId: string): void => {
    const panelOpen = props.panelOpen !== false
    // Multi-instance views (terminal/browser) never collapse on their own
    // active-icon click — that click mints ANOTHER instance (multi-open),
    // mirroring the terminal's bottom-panel behavior for the browser.
    const multi = newTabOptions.some(option => option.id === typeId && option.multi === true)
    if (panelOpen && activeType === typeId && !multi) {
      props.onTogglePanel?.()
      return
    }
    if (!panelOpen) props.onTogglePanel?.()
    actions.focusPane(focused.pane.id)
    onNewTab(typeId)
  }

  const bar = (
    <ActivityBar
      options={newTabOptions}
      activeType={activeType}
      onSelect={handleSelect}
      getBadge={getActivityBadge}
      side={activityBarSide}
    />
  )
  const node = (
    <NodeView
      node={root}
      state={state}
      newTabOptions={newTabOptions}
      actions={actions}
      onNewTab={onNewTab}
      renderTab={renderTab}
      getTabIcon={getTabIcon}
      getTabBadge={getTabBadge}
      getTabTitleClass={getTabTitleClass}
      stripTabFilter={stripTabFilter}
    />
  )
  return (
    <div className={css.workbench}>
      {showActivityBar && activityBarSide === 'left' ? bar : null}
      {node}
      {showActivityBar && activityBarSide === 'right' ? bar : null}
    </div>
  )
}
