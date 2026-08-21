/**
 * In-conversation preview for tabs docked next to 对话 / 轨迹.
 *
 * The host conversation.view seat has no definite height (flex 1 0 auto /
 * min-height auto), so explorer/editor children collapse. This overlay
 * sits on the conversation column and renders the tab body ourselves.
 */
import { useEffect, type ReactNode } from 'react'
import type { Context } from '../context-types.ts'
import { TabContent } from './tab-content.tsx'
import { editorTabForPath } from './intercept.tsx'
import {
  CENTER_PANE_ID, openDiffTab, promoteCenterTabToEditor, toggleExpanded,
  type SidebarState, type SidebarStore, type SidebarTab,
} from './state.ts'
import { classOfKind, latestGitKinds, workspacePathOfTab } from './git-status-style.ts'
import { observeHostHeader, scheduleGuardedFrame } from './dom-sync.ts'
import { t } from './locales.ts'
import { effectiveTokenValue, isDarkScheme } from './theme.ts'
import css from './sidebar.module.css'

/**
 * Follow the host 对话 / 轨迹 / docked-file tab strip. Clicking Chat or
 * Trajectory hides the overlay; clicking a docked file tab shows it.
 * Must stay mounted even while the overlay is hidden.
 */
export function useHostHeaderTabSync(ctx: Context, store: SidebarStore): void {
  useEffect(() => {
    let header: HTMLElement | undefined
    const tabOf = (button: HTMLElement): SidebarTab | undefined => {
      const tabs = store.getSnapshot().state?.centerTabs ?? []
      const id = button.getAttribute('data-dsh-center-tab')
      if (id !== null) return tabs.find(tab => tab.id === id)
      const label = button.querySelector('[data-dsh-center-label]')?.textContent?.trim()
        ?? button.textContent?.trim()
        ?? ''
      return tabs.find(tab => tab.title === label)
    }
    const applyFrom = (button: HTMLElement): void => {
      const match = tabOf(button)
      store.reduce(s => {
        const next = match === undefined ? null : match.id
        return s.centerActive === next ? s : { ...s, centerActive: next }
      })
    }
    const applyFromHostSelection = (): void => {
      if (header === undefined) return
      const selected = header.querySelector('[role="tab"][aria-selected="true"], [role="tab"].tabActive')
      if (!(selected instanceof HTMLElement)) return
      applyFrom(selected)
    }
    const tablistOf = (): HTMLElement | undefined => {
      const list = header?.querySelector('[role="tablist"]')
      return list instanceof HTMLElement ? list : undefined
    }
    const paintHostPins = (tablist: HTMLElement): void => {
      tablist.querySelector(':scope > [data-dsh-center-pin-plate]')?.remove()
      const pins = [...tablist.querySelectorAll(':scope > [role="tab"]:not([data-dsh-center-tab])')]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
      for (const node of tablist.querySelectorAll('[data-dsh-center-pin]')) {
        if (node instanceof HTMLElement && !pins.includes(node)) {
          node.removeAttribute('data-dsh-center-pin')
          node.style.removeProperty('left')
        }
      }
      if (pins.length === 0 || document.body.hasAttribute('data-dsh-center-tabs-wrap')) {
        for (const node of pins) {
          node.removeAttribute('data-dsh-center-pin')
          node.style.removeProperty('left')
        }
        return
      }
      const fill = effectiveTokenValue('--dsw-alias-bg-layer-1')
        || effectiveTokenValue('--dsw-alias-bg-base')
        || (isDarkScheme() ? '#111114' : '#ffffff')
      if (tablist.style.getPropertyValue('--dsh-pin-fill') !== fill) {
        tablist.style.setProperty('--dsh-pin-fill', fill)
      }
      let left = 0
      for (const node of pins) {
        if (!node.hasAttribute('data-dsh-center-pin')) node.setAttribute('data-dsh-center-pin', '')
        const nextLeft = `${left}px`
        if (node.style.left !== nextLeft) node.style.left = nextLeft
        left += node.getBoundingClientRect().width
      }
    }
    const decorate = (): void => {
      if (header === undefined) return
      const tablist = header.querySelector('[role="tablist"]')
      if (!(tablist instanceof HTMLElement)) return
      const tabs = store.getSnapshot().state?.centerTabs ?? []
      const byTitle = new Map(tabs.map(tab => [tab.title, tab]))
      for (const node of tablist.querySelectorAll('[role="tab"]')) {
        if (!(node instanceof HTMLElement)) continue
        const labelled = node.querySelector('[data-dsh-center-label]')
        const raw = labelled?.textContent?.trim() ?? node.childNodes[0]?.textContent?.trim() ?? node.textContent?.trim() ?? ''
        const markedId = node.getAttribute('data-dsh-center-tab')
        const tab = (markedId === null ? undefined : tabs.find(item => item.id === markedId)) ?? byTitle.get(raw)
        if (tab === undefined) {
          if (markedId === null) continue
          node.removeAttribute('data-dsh-center-tab')
          node.querySelector('[data-dsh-center-close]')?.remove()
          continue
        }
        if (markedId !== tab.id) node.setAttribute('data-dsh-center-tab', tab.id)
        if (labelled === null) {
          const label = document.createElement('span')
          label.setAttribute('data-dsh-center-label', '')
          while (node.firstChild !== null && !(node.firstChild instanceof HTMLElement && node.firstChild.hasAttribute('data-dsh-center-close'))) {
            label.appendChild(node.firstChild)
          }
          node.insertBefore(label, node.firstChild)
        }
        const painted = node.querySelector('[data-dsh-center-label]')
        if (painted instanceof HTMLElement) {
          const kindClass = classOfKind(latestGitKinds().get(workspacePathOfTab(tab) ?? ''))
          for (const name of [css.gitAdded, css.gitUntracked, css.gitModified, css.gitDeleted, css.gitConflict]) {
            if (name !== undefined && name !== kindClass && painted.classList.contains(name)) {
              painted.classList.remove(name)
            }
          }
          if (kindClass !== undefined && !painted.classList.contains(kindClass)) painted.classList.add(kindClass)
        }
        if (node.querySelector('[data-dsh-center-close]') !== null) continue
        const close = document.createElement('button')
        close.type = 'button'
        close.setAttribute('data-dsh-center-close', '')
        close.className = css.centerTabClose ?? ''
        close.setAttribute('aria-label', t('close'))
        close.textContent = '×'
        close.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          const host = close.closest('[data-dsh-center-tab]')
          const tabId = host?.getAttribute('data-dsh-center-tab')
          if (tabId === null || tabId === undefined) return
          const sessionId = store.getSnapshot().sessionId
          ctx.betterSidebar?.closeTab(tabId, sessionId === undefined ? undefined : { sessionId })
          const chat = header?.querySelector('[role="tab"]:not([data-dsh-center-tab])')
          if (chat instanceof HTMLElement) chat.click()
        })
        node.appendChild(close)
      }
      if (!tablist.hasAttribute('data-dsh-center-wheel')) {
        tablist.setAttribute('data-dsh-center-wheel', '')
        tablist.addEventListener('wheel', (event) => {
          if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
          if (tablist.scrollWidth <= tablist.clientWidth) return
          event.preventDefault()
          const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? tablist.clientWidth : 1
          tablist.scrollLeft += (event.deltaX + event.deltaY) * unit
        }, { passive: false })
      }
      paintHostPins(tablist)
      applyFromHostSelection()
    }
    const workspacePathOf = (tab: SidebarTab): string | undefined => {
      if (tab.type === 'editor' && tab.path !== undefined && tab.path !== '') return tab.path
      if (tab.type === 'diff') {
        if (tab.diff?.kind === 'worktree') return tab.diff.path
        if (tab.diff?.kind === 'commit' && tab.diff.path !== undefined && tab.diff.path !== '') return tab.diff.path
      }
      return tab.path
    }
    const promoteToWorkspaceEditor = (tab: SidebarTab): void => {
      const path = workspacePathOf(tab)
      if (path === undefined) return
      const sessionId = store.getSnapshot().sessionId
      if (sessionId === undefined) return
      const editor = editorTabForPath(ctx, sessionId, path)
      store.reduce(s => promoteCenterTabToEditor(s, tab.id, editor))
      const host = header?.querySelector(`[data-dsh-center-tab="${CSS.escape(tab.id)}"]`)
      const label = host?.querySelector('[data-dsh-center-label]')
      if (label !== null && label !== undefined) label.textContent = editor.title
      host?.setAttribute('data-dsh-center-tab', editor.id)
    }
    const onClick = (event: Event): void => {
      if (header === undefined) return
      if (event.target instanceof Element && event.target.closest('[data-dsh-center-close]') !== null) return
      const button = (event.target instanceof Element ? event.target : null)?.closest('[role="tab"]')
      if (!(button instanceof HTMLElement) || !header.contains(button)) return
      applyFrom(button)
    }
    const onDblClick = (event: Event): void => {
      if (header === undefined) return
      if (event.target instanceof Element && event.target.closest('[data-dsh-center-close]') !== null) return
      const button = (event.target instanceof Element ? event.target : null)?.closest('[role="tab"]')
      if (!(button instanceof HTMLElement) || !header.contains(button)) return
      const tab = tabOf(button)
      if (tab === undefined) return
      event.preventDefault()
      event.stopPropagation()
      promoteToWorkspaceEditor(tab)
    }
    const remount = (): void => {
      const found = document.querySelector('[data-slot="conversation.session.header"] header')
      if (!(found instanceof HTMLElement)) return
      if (header !== found) {
        header?.removeEventListener('click', onClick)
        header?.removeEventListener('dblclick', onDblClick)
        header = found
        header.addEventListener('click', onClick)
        header.addEventListener('dblclick', onDblClick)
      }
      decorate()
    }
    const guarded = scheduleGuardedFrame(remount)
    remount()
    const off = store.subscribe(guarded.schedule)
    const onResize = (): void => { guarded.schedule() }
    window.addEventListener('resize', onResize)
    const root = document.getElementById('root')
    const watcher = root === null ? undefined : observeHostHeader(root, guarded.schedule)
    return () => {
      off()
      watcher?.disconnect()
      guarded.disconnect()
      window.removeEventListener('resize', onResize)
      header?.removeEventListener('click', onClick)
      header?.removeEventListener('dblclick', onDblClick)
    }
  }, [ctx, store])
}

export function CenterPreview(props: {
  ctx: Context
  store: SidebarStore
  state: SidebarState
  sessionId: string
  cwd: string | undefined
  left: number
  right: number
  top: number
  bottom: number
  onReferenceFile: (path: string) => void
}): ReactNode {
  const { ctx, store, state, sessionId, cwd, left, right, top, bottom, onReferenceFile } = props
  const activeId = state.centerActive
  if (activeId === null || state.centerTabs.length === 0) return null
  const tab = state.centerTabs.find(candidate => candidate.id === activeId)
  if (tab === undefined) return null

  return (
    <div
      className={css.centerPreview}
      style={{ left, right: window.innerWidth - right, top, bottom }}
    >
      <div className={css.centerPreviewBody}>
        <TabContent
          tab={tab}
          sessionId={sessionId}
          cwd={cwd}
          expanded={state.expanded}
          onToggleDir={(path) => { store.reduce(s => toggleExpanded(s, path)) }}
          onReferenceFile={onReferenceFile}
          ctx={ctx}
          store={store}
          visible
          onSubagentJump={() => { /* session jump stays in the sidebar topology */ }}
          onOpenDiff={(diffTab: SidebarTab) => { store.reduce(s => openDiffTab(s, CENTER_PANE_ID, diffTab)) }}
        />
      </div>
    </div>
  )
}
