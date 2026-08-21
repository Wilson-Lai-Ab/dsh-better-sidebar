/**
 * The file explorer: a lazy VSCode-style tree rooted at the session's
 * working directory. Levels load on expansion (one API call per directory),
 * directories sort first, hidden entries render dimmed, and the expansion
 * set lives in the per-session state. Clicking a file opens an editor tab.
 *
 * Row actions: hovering a row reveals an @-reference button on the far
 * right (inserts a file chip into the composer), rows are draggable onto
 * the conversation input, and right-click opens a context menu to copy the
 * relative or absolute path (with a brief "copied" label replacing the
 * button after a successful write); file rows also offer a download action
 * (the host serves raw bytes, binary-safe).
 */
import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  IconCodeOutline16, IconCopyOutline16, IconDownloadOutline16, IconFolderClose16, IconFolderOpen16,
  IconRefreshOutline16, Menu, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { api, downloadUrl, type FsEntry, type FsFindHit } from '../api.ts'
import { presentFindHit } from '../../explorer/match.ts'
import { setFileDragging } from '../dom-sync.ts'
import { encodeFileRef, FILE_REF_MIME, fileClipboardText, fileRefOf } from '../file-ref.ts'
import { classOfKind, gitKindByPath, type GitStatusKind } from '../git-status-style.ts'
import { relativeTo } from '../paths.ts'
import { t } from '../locales.ts'
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
  sessionId: string
  cwd: string | undefined
  expanded: string[]
  onToggle: (path: string) => void
  onOpenFile: (path: string) => void
  /** Double-click: dock the file onto the conversation header. */
  onOpenFileAbove?: (path: string) => void
  /** Insert a file chip into the composer draft. */
  onReferenceFile: (path: string) => void
}) {
  const { sessionId, cwd, expanded, onToggle, onOpenFile, onOpenFileAbove, onReferenceFile } = props
  const [data, setData] = useState<Record<string, LevelData>>({})
  const dataRef = useRef(data)
  const [refreshTick, setRefreshTick] = useState(0)
  const [gitKinds, setGitKinds] = useState<Map<string, GitStatusKind>>(() => new Map())
  /** The row whose path was just copied ("copied" label replaces its button). */
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  /** Open context menu: the row path (and whether it is a directory) plus the cursor position. */
  const [rowMenu, setRowMenu] = useState<{ path: string; isDir: boolean; x: number; y: number } | null>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<FsFindHit[] | null>(null)
  const [findError, setFindError] = useState<string | null>(null)
  const [finding, setFinding] = useState(false)

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
              className={clsx(css.explorerRow, css.explorerDir, entry.hidden && css.explorerHidden)}
              style={{ paddingLeft: depth * 22 + 6 }}
              onDragStart={(event) => { startFileDrag(event, entry.path) }}
              onDragEnd={() => { setFileDragging(false) }}
              onClick={() => { onToggle(entry.path) }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onToggle(entry.path)
                }
              }}
              onContextMenu={(event) => { openRowMenu(event, entry.path, true) }}
            >
              {isOpen ? <IconFolderOpen16 size={14} /> : <IconFolderClose16 size={14} />}
              <span className={clsx(css.explorerName, classOfKind(gitKinds.get(entry.path)))}>{entry.name}</span>
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
          className={clsx(css.explorerRow, entry.hidden && css.explorerHidden)}
          style={{ paddingLeft: depth * 22 + 6 }}
          title={entry.path}
          onDragStart={(event) => { startFileDrag(event, entry.path) }}
          onDragEnd={() => { setFileDragging(false) }}
          onClick={() => { onOpenFile(entry.path) }}
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
          <span className={clsx(css.explorerName, classOfKind(gitKinds.get(entry.path)))}>{entry.name}</span>
          {rowActions(entry)}
        </div>
      )
    })
  }

  return (
    <div className={css.explorer}>
      <div className={css.explorerHeader}>
        <span className={css.explorerRoot} title={root}>{root === undefined ? t('noSession') : baseName(root)}</span>
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
      <div className={css.explorerBody}>
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
                  className={clsx(css.explorerRow, css.explorerFindRow)}
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
              <span className={clsx(css.explorerName, classOfKind(gitKinds.get(root)))}>{baseName(root)}</span>
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
        items={[
          // Download applies to files only (the host route refuses directories).
          ...(rowMenu?.isDir === false
            ? [{ id: 'download', label: t('download'), icon: <IconDownloadOutline16 size={14} /> }]
            : []),
          { id: 'relative', label: t('copyRelative'), icon: <IconCopyOutline16 size={14} /> },
          { id: 'absolute', label: t('copyAbsolute'), icon: <IconCopyOutline16 size={14} /> },
        ]}
        onSelect={(id) => {
          const target = rowMenu
          if (target === null) return
          setRowMenu(null)
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
