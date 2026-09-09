/**
 * The file explorer: a lazy VSCode-style tree rooted at the session's
 * working directory. Levels load on expansion (one API call per directory),
 * directories sort first, hidden entries render dimmed, and the expansion
 * set lives in the per-session state. Clicking a file opens an editor tab.
 *
 * Row actions: hovering a row reveals an @-reference button on the far
 * right (inserts a file chip into the composer), rows are draggable onto
 * the conversation input, and right-click opens a context menu to reveal
 * in the OS file manager, open a bottom terminal at the folder, rename,
 * jump to the Git panel, open in the system or sidebar browser, copy the
 * relative or absolute path (with a brief
 * "copied" label replacing the button after a successful write); file
 * rows also offer a download action (the host serves raw bytes, binary-safe).
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  IconBranchOutline16, IconCodeOutline16, IconCopyOutline16, IconDownloadOutline16,
  IconFolderClose16, IconFolderOpen16, IconRefreshOutline16, Menu, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { api, downloadUrl, type FsEntry, type FsFindHit, type GitRepoInfo } from '../api.ts'
import { presentFindHit } from '../../explorer/match.ts'
import { setFileDragging } from '../dom-sync.ts'
import { encodeFileRef, FILE_REF_MIME, fileClipboardText, fileRefOf } from '../file-ref.ts'
import type { Context } from '../../context-types.ts'
import { classOfKind, explorerKindOf, gitKindByPath, sessionKindByPath, type GitStatusKind } from '../git-status-style.ts'
import { localHistoryFaceOf, sessionEditsFromLhPending, type LhPendingKind } from '../lh-pending.ts'
import { ancestorDirsOf, relativeTo, sameFsPath } from '../paths.ts'
import { t } from '../locales.ts'
import { IconCollapseAllOutline16, IconGlobeOutline16, IconLocateOutline16, IconTerminalOutline16 } from '../icons.tsx'
import { collapseAllExplorer, expandExplorerToPath, type SidebarStore } from '../state.ts'
import { previewFilePathOf } from './reveal.ts'
import { gitFocusOf } from './git-focus.ts'
import { pluginBrowserHref } from './plugin-browser.ts'
import { entryNameOf, explorerRowMenuIds, siblingPathOf, terminalCwdOf } from './row-menu.ts'
import css from '../sidebar.module.css'

interface LevelData {
  entries?: FsEntry[]
  error?: string
}

/** Root label: the last path segment (mirror of the host rootLabel). */
function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return at === -1 ? trimmed : trimmed.slice(at + 1)
}

/** How long the row's "copied" label stays after a successful write. */
const COPIED_MS = 1200
const LOCATE_MS = 1200
const FIND_DEBOUNCE_MS = 150

function highlightName(name: string, indices: readonly number[]): ReactNode {
  if (indices.length === 0) return name
  const marks = new Set(indices)
  const parts: ReactNode[] = []
  let buf = ''
  let on = false
  const flush = (key: string, mark: boolean): void => {
    if (buf === '') return
    parts.push(mark ? <mark key={key} className={css.explorerFindMark}>{buf}</mark> : <span key={key}>{buf}</span>)
    buf = ''
  }
  for (let i = 0; i < name.length; i += 1) {
    const hit = marks.has(i)
    if (hit !== on) {
      flush(`${i}-${on ? 'm' : 't'}`, on)
      on = hit
    }
    buf += name[i]
  }
  flush('end', on)
  return parts
}

export function ExplorerView(props: {
  ctx?: Context
  sessionId: string
  cwd: string | undefined
  store?: SidebarStore
  expanded: string[]
  onToggle: (path: string) => void
  onOpenFile: (path: string) => void
  /** Double-click: dock the file onto the conversation header. */
  onOpenFileAbove?: (path: string) => void
  /** Insert a file chip into the composer draft. */
  onReferenceFile: (path: string) => void
  /** Open a bottom-panel terminal at this directory. */
  onOpenTerminal?: (dir: string) => void
  /** Open the Git panel focused on this path's work tree. */
  onOpenGit?: (path: string, isDir: boolean, repos: GitRepoInfo[]) => void
  /** Open the sidebar browser tab at this GUI-origin URL. */
  onOpenPluginBrowser?: (href: string) => void
}) {
  const {
    ctx, sessionId, cwd, store, expanded, onToggle, onOpenFile, onOpenFileAbove, onReferenceFile,
    onOpenTerminal, onOpenGit, onOpenPluginBrowser,
  } = props
  const [data, setData] = useState<Record<string, LevelData>>({})
  const dataRef = useRef(data)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [gitKinds, setGitKinds] = useState<Map<string, GitStatusKind>>(() => new Map())
  const [lhEdits, setLhEdits] = useState<{ path: string; kind: LhPendingKind }[]>([])
  const sessionKinds = useMemo(
    () => sessionKindByPath(cwd, lhEdits),
    [cwd, lhEdits],
  )

  useEffect(() => {
    const face = localHistoryFaceOf(ctx)
    if (face === undefined) {
      setLhEdits([])
      return
    }
    let cancelled = false
    const load = (): void => {
      void face.listReview(sessionId, cwd).then((result) => {
        if (cancelled || !result.ok) return
        setLhEdits(sessionEditsFromLhPending(result.value?.records ?? []))
      }).catch(() => {
        if (!cancelled) setLhEdits([])
      })
    }
    load()
    const timer = window.setInterval(load, 2500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [ctx, sessionId, cwd])
  const rowKind = (path: string, isDir: boolean): GitStatusKind | undefined =>
    explorerKindOf(path, sessionKinds, gitKinds, isDir)
  /** The row whose path was just copied ("copied" label replaces its button). */
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  /** Open context menu: the row path (and whether it is a directory) plus the cursor position. */
  const [rowMenu, setRowMenu] = useState<{ path: string; isDir: boolean; x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState<{ path: string; isDir: boolean; value: string } | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitRepoInfo[]>([])
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<FsFindHit[] | null>(null)
  const [findError, setFindError] = useState<string | null>(null)
  const [finding, setFinding] = useState(false)
  const [locatePath, setLocatePath] = useState<string | null>(null)
  const snapshot = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    () => store?.getSnapshot().state,
    () => store?.getSnapshot().state,
  )
  const previewPath = snapshot === undefined ? undefined : previewFilePathOf(snapshot)
  const canLocate = cwd !== undefined && previewPath !== undefined && ancestorDirsOf(cwd, previewPath) !== null
  const canCollapse = expanded.length > 0

  const storeLevel = useCallback((path: string, level: LevelData) => {
    dataRef.current = { ...dataRef.current, [path]: level }
    setData(dataRef.current)
  }, [])

  const loadDir = useCallback((dir: string) => {
    if (dataRef.current[dir] !== undefined) return
    storeLevel(dir, {})
    api.fsTree({ sessionId, cwd }, dir).then((listing) => {
      storeLevel(dir, { entries: listing.entries })
    }).catch((error: unknown) => {
      storeLevel(dir, { error: error instanceof Error ? error.message : String(error) })
    })
  }, [sessionId, cwd, storeLevel])

  useEffect(() => {
    const q = query.trim()
    if (q === '') {
      setHits(null)
      setFindError(null)
      setFinding(false)
      return
    }
    let cancelled = false
    setFinding(true)
    const timer = window.setTimeout(() => {
      api.fsFind({ sessionId, cwd }, q).then((result) => {
        if (cancelled) return
        setHits(result.hits)
        setFindError(null)
      }).catch((error: unknown) => {
        if (cancelled) return
        setHits([])
        setFindError(error instanceof Error ? error.message : String(error))
      }).finally(() => {
        if (!cancelled) setFinding(false)
      })
    }, FIND_DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, sessionId, cwd])

  useEffect(() => {
    let cancelled = false
    void api.gitStatus({ sessionId, cwd }).then((status) => {
      if (!cancelled) setGitKinds(gitKindByPath(status))
    }).catch(() => {
      if (!cancelled) setGitKinds(new Map())
    })
    void api.gitRepos({ sessionId, cwd }).then((result) => {
      if (!cancelled) setRepos(result.repos)
    }).catch(() => {
      if (!cancelled) setRepos([])
    })
    return () => { cancelled = true }
  }, [sessionId, cwd, refreshTick])

  useEffect(() => {
    // Load the visible set; already-loaded levels (kept in the cache) are
    // not refetched. Only the refresh button wipes the cache.
    const root = cwd
    if (root === undefined) return
    loadDir(root)
    for (const dir of expanded) loadDir(dir)
  }, [cwd, expanded, refreshTick, loadDir])

  useEffect(() => {
    if (locatePath === null) return
    const row = bodyRef.current?.querySelector(`[data-explorer-path="${CSS.escape(locatePath)}"]`)
    if (!(row instanceof HTMLElement)) return
    row.scrollIntoView({ block: 'center' })
    const timer = window.setTimeout(() => {
      setLocatePath(current => current === locatePath ? null : current)
    }, LOCATE_MS)
    return () => { window.clearTimeout(timer) }
  }, [locatePath, data, expanded])

  useEffect(() => {
    const clear = (): void => { setFileDragging(false) }
    window.addEventListener('dragend', clear, true)
    window.addEventListener('drop', clear, true)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('dragend', clear, true)
      window.removeEventListener('drop', clear, true)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [])

  /** Copy `text`; on success flip the row's copied label for a moment. */
  const copyPath = useCallback((text: string, path: string): void => {
    void writeClipboard(text).then((ok) => {
      if (!ok) return
      setCopiedPath(path)
      window.setTimeout(() => {
        setCopiedPath(current => current === path ? null : current)
      }, COPIED_MS)
    })
  }, [])

  /** The row's trailing actions: the @-reference button, or the copied label. */
  const rowActions = (entry: FsEntry): ReactNode => {
    if (copiedPath === entry.path) {
      return <span className={css.explorerCopied}>{t('copied')}</span>
    }
    return (
      <button
        type="button"
        className={css.explorerRef}
        aria-label={t('referenceFile')}
        title={t('referenceFile')}
        onClick={(event) => {
          event.stopPropagation()
          onReferenceFile(entry.path)
        }}
      >
        {t('referenceFile')}
      </button>
    )
  }

  const startFileDrag = (event: DragEvent, path: string): void => {
    const ref = fileRefOf(path, cwd)
    setFileDragging(true)
    event.dataTransfer.setData(FILE_REF_MIME, encodeFileRef(ref))
    event.dataTransfer.setData('text/plain', fileClipboardText(ref))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const openRowMenu = (event: MouseEvent, path: string, isDir: boolean): void => {
    event.preventDefault()
    event.stopPropagation()
    setRowMenu({ path, isDir, x: event.clientX, y: event.clientY })
  }

  /** Download a file through the host route (raw bytes, binary-safe). */
  const downloadFile = (path: string): void => {
    const url = downloadUrl({ sessionId, cwd }, path)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  const wipeCache = (): void => {
    dataRef.current = {}
    setData({})
    setRefreshTick(tick => tick + 1)
  }

  const commitRename = (from: string, nextName: string): void => {
    const to = siblingPathOf(from, nextName)
    if (to === undefined || to === from) {
      setRenaming(null)
      setRenameError(null)
      return
    }
    void api.fsRename({ sessionId, cwd }, from, to).then(() => {
      store?.reduce(s => ({
        ...s,
        expanded: s.expanded.map((item) => {
          if (item === from) return to
          if (item.startsWith(`${from}/`) || item.startsWith(`${from}\\`)) return `${to}${item.slice(from.length)}`
          return item
        }),
      }))
      setRenaming(null)
      setRenameError(null)
      wipeCache()
    }).catch((error: unknown) => {
      setRenameError(error instanceof Error ? error.message : t('renameFailed'))
    })
  }

  const rowName = (path: string, name: string, kindClass: string | undefined): ReactNode => {
    if (renaming?.path === path) {
      return (
        <input
          className={css.explorerRename}
          value={renaming.value}
          autoFocus
          aria-label={t('rename')}
          onClick={(event) => { event.stopPropagation() }}
          onChange={(event) => {
            setRenaming(current => current === null ? current : { ...current, value: event.target.value })
            setRenameError(null)
          }}
          onBlur={() => { commitRename(path, renaming.value) }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              commitRename(path, renaming.value)
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              setRenaming(null)
              setRenameError(null)
            }
          }}
        />
      )
    }
    return <span className={clsx(css.explorerName, kindClass)}>{name}</span>
  }

  const root = cwd

  const renderLevel = (dir: string, depth: number): ReactNode => {
    const level = data[dir]
    if (level === undefined) {
      return <div className={css.explorerRow} style={{ paddingLeft: depth * 22 + 6 }}>{t('loading')}</div>
    }
    if (level.error !== undefined) {
      return (
        <div className={clsx(css.explorerRow, css.explorerError)} style={{ paddingLeft: depth * 22 + 6 }}>
          {level.error}
        </div>
      )
    }
    const entries = level.entries ?? []
    return entries.map(entry => {
      if (entry.isDir) {
        const isOpen = expanded.includes(entry.path)
        return (
          <div key={entry.path}>
            <div
              role="button"
              tabIndex={0}
              draggable
              data-explorer-path={entry.path}
              className={clsx(css.explorerRow, css.explorerDir, entry.hidden && css.explorerHidden, sameFsPath(locatePath ?? undefined, entry.path) && css.explorerRowActive)}
              style={{ paddingLeft: depth * 22 + 6 }}
              onDragStart={(event) => { startFileDrag(event, entry.path) }}
              onDragEnd={() => { setFileDragging(false) }}
              onClick={() => { if (renaming?.path !== entry.path) onToggle(entry.path) }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onToggle(entry.path)
                }
              }}
              onContextMenu={(event) => { openRowMenu(event, entry.path, true) }}
            >
              {isOpen ? <IconFolderOpen16 size={14} /> : <IconFolderClose16 size={14} />}
              {rowName(entry.path, entry.name, classOfKind(rowKind(entry.path, true)))}
              {rowActions(entry)}
            </div>
            {isOpen && renderLevel(entry.path, depth + 1)}
          </div>
        )
      }
      return (
        <div
          key={entry.path}
          role="button"
          tabIndex={0}
          draggable
          data-explorer-path={entry.path}
          className={clsx(css.explorerRow, entry.hidden && css.explorerHidden, (sameFsPath(previewPath, entry.path) || sameFsPath(locatePath ?? undefined, entry.path)) && css.explorerRowActive)}
          style={{ paddingLeft: depth * 22 + 6 }}
          title={entry.path}
          onDragStart={(event) => { startFileDrag(event, entry.path) }}
          onDragEnd={() => { setFileDragging(false) }}
          onClick={() => { if (renaming?.path !== entry.path) onOpenFile(entry.path) }}
          onDoubleClick={(event) => {
            if (onOpenFileAbove === undefined) return
            event.preventDefault()
            event.stopPropagation()
            onOpenFileAbove(entry.path)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenFile(entry.path)
            }
          }}
          onContextMenu={(event) => { openRowMenu(event, entry.path, false) }}
        >
          <IconCodeOutline16 size={14} />
          {rowName(entry.path, entry.name, classOfKind(rowKind(entry.path, false)))}
          {rowActions(entry)}
        </div>
      )
    })
  }

  return (
    <div className={css.explorer}>
      <div className={css.explorerHeader}>
        <span className={css.explorerRoot} title={root}>{root === undefined ? t('noSession') : baseName(root)}</span>
        <div className={css.explorerHeaderActions}>
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('locateInExplorer')}
            title={t('locateInExplorer')}
            disabled={!canLocate}
            onClick={() => {
              if (store === undefined || cwd === undefined || previewPath === undefined) return
              setQuery('')
              store.reduce(s => expandExplorerToPath(s, cwd, previewPath))
              setLocatePath(previewPath)
            }}
          >
            <IconLocateOutline16 size={14} />
          </button>
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('collapseExplorer')}
            title={t('collapseExplorer')}
            disabled={!canCollapse}
            onClick={() => { store?.reduce(s => collapseAllExplorer(s)) }}
          >
            <IconCollapseAllOutline16 size={14} />
          </button>
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('refresh')}
            title={t('refresh')}
            onClick={() => {
              dataRef.current = {}
              setData({})
              setRefreshTick(tick => tick + 1)
            }}
          >
            <IconRefreshOutline16 size={14} />
          </button>
        </div>
      </div>
      <div className={css.explorerFind}>
        <input
          className={css.explorerFindInput}
          type="search"
          value={query}
          placeholder={t('findFilePlaceholder')}
          aria-label={t('findFile')}
          onChange={(event) => { setQuery(event.target.value) }}
        />
      </div>
      <div className={css.explorerBody} ref={bodyRef}>
        {root === undefined ? (
          <div className={css.explorerEmpty}>{t('noSession')}</div>
        ) : query.trim() !== '' ? (
          <div className={css.explorerFindList}>
            {findError !== null && <div className={css.explorerError}>{findError}</div>}
            {finding && hits === null && <div className={css.explorerEmpty}>{t('loading')}</div>}
            {!finding && hits !== null && hits.length === 0 && findError === null && (
              <div className={css.explorerEmpty}>{t('findFileEmpty')}</div>
            )}
            {hits?.map((hit) => {
              const shown = presentFindHit(hit.rel)
              const fileName = hit.rel.split('/').pop() ?? hit.rel
              const baseStart = hit.rel.length - fileName.length
              const nameIndices = hit.indices
                .filter(index => index >= baseStart && index < baseStart + shown.name.length)
                .map(index => index - baseStart)
              return (
                <div
                  key={hit.path}
                  role="button"
                  tabIndex={0}
                  className={clsx(css.explorerRow, css.explorerFindRow, sameFsPath(previewPath, hit.path) && css.explorerRowActive)}
                  title={hit.rel}
                  onClick={() => { onOpenFile(hit.path) }}
                  onDoubleClick={(event) => {
                    if (onOpenFileAbove === undefined) return
                    event.preventDefault()
                    event.stopPropagation()
                    onOpenFileAbove(hit.path)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenFile(hit.path)
                    }
                  }}
                >
                  <IconCodeOutline16 size={14} />
                  <span className={css.explorerFindName}>{highlightName(shown.name, nameIndices)}</span>
                  {shown.location !== null && (
                    <span className={css.explorerFindLocation}>of {shown.location}</span>
                  )}
                  {shown.module !== null && (
                    <span className={css.explorerFindModule}>{shown.module}</span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <div
              className={css.explorerRow}
              style={{ paddingLeft: 6 }}
              draggable
              onDragStart={(event) => { startFileDrag(event, root) }}
              onDragEnd={() => { setFileDragging(false) }}
              onContextMenu={(event) => { openRowMenu(event, root, true) }}
            >
              <IconFolderOpen16 size={14} />
              <span className={clsx(css.explorerName, classOfKind(rowKind(root, true)))}>{baseName(root)}</span>
              {copiedPath === root
                ? <span className={css.explorerCopied}>{t('copied')}</span>
                : (
                  <button
                    type="button"
                    className={css.explorerRef}
                    aria-label={t('referenceFile')}
                    title={t('referenceFile')}
                    onClick={(event) => {
                      event.stopPropagation()
                      onReferenceFile(root)
                    }}
                  >
                    {t('referenceFile')}
                  </button>
                )}
            </div>
            {data[root] !== undefined && renderLevel(root, 1)}
            {renameError !== null && <div className={css.explorerError}>{renameError}</div>}
          </>
        )}
      </div>
      {/*
        The one shared context menu, positioned at the right-click cursor
        (portal so the explorer's overflow clip cannot crop it).
      */}
      <Menu
        open={rowMenu !== null}
        onClose={() => { setRowMenu(null) }}
        items={rowMenu === null ? [] : explorerRowMenuIds({
          isDir: rowMenu.isDir,
          isRoot: cwd !== undefined && rowMenu.path === cwd,
          inGit: gitFocusOf(rowMenu.path, rowMenu.isDir, repos) !== undefined,
        }).flatMap((id) => {
          const pluginHref = pluginBrowserHref({
            origin: window.location.origin,
            sessionId,
            cwd,
            path: rowMenu.path,
            isDir: rowMenu.isDir,
          })
          const row = {
            reveal: { id, label: t('revealInFinder'), icon: <IconFolderOpen16 size={14} /> },
            terminal: { id, label: t('openInTerminal'), icon: <IconTerminalOutline16 size={14} /> },
            browser: {
              id,
              label: t('openInBrowser'),
              icon: <IconGlobeOutline16 size={14} />,
              submenu: [
                { id: 'browser-system', label: t('openInSystemBrowser') },
                ...(pluginHref === undefined
                  ? []
                  : [{ id: 'browser-plugin', label: t('openInPluginBrowser') }]),
              ],
            },
            rename: { id, label: t('rename'), icon: <IconCodeOutline16 size={14} /> },
            git: { id, label: t('openGitHere'), icon: <IconBranchOutline16 size={14} /> },
            download: { id, label: t('download'), icon: <IconDownloadOutline16 size={14} /> },
            relative: { id, label: t('copyRelative'), icon: <IconCopyOutline16 size={14} /> },
            absolute: { id, label: t('copyAbsolute'), icon: <IconCopyOutline16 size={14} /> },
          }[id]
          if (row === undefined) return []
          return id === 'download' || id === 'relative'
            ? [{ type: 'separator' as const, id: `sep-${id}` }, row]
            : [row]
        })}
        onSelect={(id) => {
          const target = rowMenu
          if (target === null) return
          setRowMenu(null)
          if (id === 'reveal') {
            void api.fsReveal({ sessionId, cwd }, target.path).catch(() => { /* host surfaces its own error */ })
            return
          }
          if (id === 'terminal') {
            onOpenTerminal?.(terminalCwdOf(target.path, target.isDir))
            return
          }
          if (id === 'browser-system') {
            void api.fsOpenInBrowser({ sessionId, cwd }, target.path).catch(() => { /* host surfaces its own error */ })
            return
          }
          if (id === 'browser-plugin') {
            const href = pluginBrowserHref({
              origin: window.location.origin,
              sessionId,
              cwd,
              path: target.path,
              isDir: target.isDir,
            })
            if (href !== undefined) onOpenPluginBrowser?.(href)
            return
          }
          if (id === 'rename') {
            setRenameError(null)
            setRenaming({ path: target.path, isDir: target.isDir, value: entryNameOf(target.path) })
            return
          }
          if (id === 'git') {
            onOpenGit?.(target.path, target.isDir, repos)
            return
          }
          if (id === 'download') {
            downloadFile(target.path)
            return
          }
          copyPath(
            id === 'relative' ? relativeTo(cwd ?? '', target.path) : target.path,
            target.path,
          )
        }}
        portal
        align="start"
        getAnchorRect={() => (rowMenu === null ? null : new DOMRect(rowMenu.x, rowMenu.y, 0, 0))}
        anchor={<span />}
      />
    </div>
  )
}
