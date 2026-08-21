/**
 * IDEA-style git log: a commit list on the left (subject / author / time)
 * and the selected commit's file tree + patch on the right. Opened as a
 * bottom-panel tab so the source-control sidebar stays a change list.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import clsx from 'clsx'
import {
  Button, IconCopyOutline16, IconRefreshOutline16, Menu, Modal, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '../context-types.ts'
import { api, type GitLogEntry, type SessionScope } from './api.ts'
import { DiffView, parseUnifiedDiff, type DiffFile } from './DiffView.tsx'
import { buildPathTree } from './git-tree.ts'
import { GitPathTree } from './GitPathTree.tsx'
import { beginOpenTabDrag, setTabDragging } from './TabBar.tsx'
import { dockTabToCenter, type SidebarStore, type SidebarTab } from './state.ts'
import { focusLatestCenterView } from './conversation-views.tsx'
import { t } from './locales.ts'
import css from './sidebar.module.css'

function fileBaseName(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

function commitFileTab(entry: GitLogEntry, path: string, repo?: string): SidebarTab {
  return {
    id: `diff:c:${entry.hashFull}:${path}`,
    type: 'diff',
    title: fileBaseName(path),
    diff: { kind: 'commit', hash: entry.hash, hashFull: entry.hashFull, subject: entry.subject, path, repo },
  }
}

const LOG_BATCH = 40
const LIST_WIDTH_KEY = 'dsh-sidebar:git-log-list-width'
const LIST_WIDTH_MIN = 180
const LIST_WIDTH_MAX = 720
const LIST_WIDTH_DEFAULT = 520
const FILES_HEIGHT_KEY = 'dsh-sidebar:git-log-files-height'
const FILES_HEIGHT_MIN = 72
const FILES_HEIGHT_MAX = 480
const FILES_HEIGHT_DEFAULT = 160

function readStoredSize(key: string, min: number, max: number, fallback: number): number {
  try {
    const stored = Number(localStorage.getItem(key))
    if (Number.isFinite(stored)) return Math.min(max, Math.max(min, Math.round(stored)))
  } catch { /* private mode */ }
  return fallback
}

function refNames(refs: string): string[] {
  return [...new Set(
    refs
      .split(',')
      .map(ref => ref.trim())
      .filter(ref => ref !== '')
      .map(ref => (ref.includes(' -> ') ? ref.slice(ref.indexOf(' -> ') + 4) : ref))
      .map(ref => (ref.startsWith('tag: ') ? ref.slice(5) : ref)),
  )]
}

/** Compact date for the log table: today → time, else `M/D HH:mm`. */
function compactDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  if (sameDay) return time
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()} ${time}`
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function displayPath(path: string): string {
  if (path === '/dev/null') return path
  if (path.startsWith('a/') || path.startsWith('b/')) return path.slice(2)
  return path
}

function fileKind(file: DiffFile): 'add' | 'del' | 'ren' | 'mod' {
  if (file.oldPath === '/dev/null') return 'add'
  if (file.newPath === '/dev/null') return 'del'
  return displayPath(file.oldPath) !== displayPath(file.newPath) ? 'ren' : 'mod'
}

function fileNameClass(file: DiffFile): string {
  const kind = fileKind(file)
  if (kind === 'add') return `${css.gitLogFileName} ${css.gitAdded}`
  if (kind === 'del') return `${css.gitLogFileName} ${css.gitDeleted} ${css.gitDeletedText}`
  return `${css.gitLogFileName} ${css.gitModified}`
}

interface ConfirmState {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<unknown>
}

export function GitLogView(props: { scope: SessionScope; ctx?: Context; repo?: string; store?: SidebarStore }) {
  const { scope, ctx, repo, store } = props
  const [entries, setEntries] = useState<GitLogEntry[]>([])
  const [ended, setEnded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<GitLogEntry | null>(null)
  const [patch, setPatch] = useState<string>('')
  const [patchLoading, setPatchLoading] = useState(false)
  const [fileFilter, setFileFilter] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ entry: GitLogEntry; x: number; y: number } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busy, setBusy] = useState(false)
  const [listWidth, setListWidth] = useState(() => readStoredSize(LIST_WIDTH_KEY, LIST_WIDTH_MIN, LIST_WIDTH_MAX, LIST_WIDTH_DEFAULT))
  const [filesHeight, setFilesHeight] = useState(() => readStoredSize(FILES_HEIGHT_KEY, FILES_HEIGHT_MIN, FILES_HEIGHT_MAX, FILES_HEIGHT_DEFAULT))
  const [dragging, setDragging] = useState(false)
  const [draggingFiles, setDraggingFiles] = useState(false)
  const drag = useRef({ x: 0, width: LIST_WIDTH_DEFAULT })
  const filesDrag = useRef({ y: 0, height: FILES_HEIGHT_DEFAULT })
  const listWidthRef = useRef(listWidth)
  const filesHeightRef = useRef(filesHeight)
  const setListWidthPersist = (next: number): void => {
    listWidthRef.current = next
    setListWidth(next)
  }
  const setFilesHeightPersist = (next: number): void => {
    filesHeightRef.current = next
    setFilesHeight(next)
  }

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const page = await api.gitLog(scope, LOG_BATCH, 0)
      setEntries(page)
      setEnded(page.length < LOG_BATCH)
      setSelected(page[0] ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [scope.sessionId, scope.cwd, scope.repo])

  useEffect(() => { void refresh() }, [refresh])

  const loadMore = async (): Promise<void> => {
    if (loadingMore || ended) return
    setLoadingMore(true)
    try {
      const next = await api.gitLog(scope, LOG_BATCH, entries.length)
      setEntries(current => [...current, ...next])
      if (next.length < LOG_BATCH) setEnded(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (selected === null) {
      setPatch('')
      setFileFilter(null)
      return
    }
    let cancelled = false
    setPatchLoading(true)
    setFileFilter(null)
    void api.gitCommitDiff(scope, selected.hashFull).then(
      (result) => { if (!cancelled) setPatch(result.diff) },
      (reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)) },
    ).finally(() => { if (!cancelled) setPatchLoading(false) })
    return () => { cancelled = true }
  }, [scope.sessionId, scope.cwd, scope.repo, selected?.hashFull])

  const files = useMemo(() => {
    return parseUnifiedDiff(patch).files.map((file) => {
      const path = displayPath(file.newPath === '/dev/null' ? file.oldPath : file.newPath)
      return { path, file }
    })
  }, [patch])
  const fileTree = useMemo(() => buildPathTree(files), [files])

  const visiblePatch = useMemo(() => {
    if (fileFilter === null) return patch
    const chunks = patch.split(/(?=^diff --git )/m)
    const hit = chunks.find(chunk => chunk.includes(`b/${fileFilter}`) || chunk.includes(`a/${fileFilter}`))
    return hit ?? patch
  }, [patch, fileFilter])

  const runConfirmed = (next: ConfirmState): void => {
    setConfirm({
      ...next,
      onConfirm: async () => {
        setBusy(true)
        try {
          await next.onConfirm()
          await refresh()
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
          setBusy(false)
        }
      },
    })
  }

  return (
    <div className={css.gitLogPane}>
      <div className={css.gitLogToolbar}>
        <span className={css.gitLogToolbarTitle}>{t('history')}</span>
        <button type="button" className={css.iconButton} aria-label={t('refresh')} title={t('refresh')} onClick={() => { void refresh() }}>
          <IconRefreshOutline16 size={14} />
        </button>
      </div>
      {loading && <div className={css.gitPlaceholder}>{t('loading')}</div>}
      {!loading && error !== null && <div className={css.gitError}>{error}</div>}
      {!loading && (
        <div className={css.gitLogSplit}>
          <div className={css.gitLogList} style={{ width: listWidth }}>
            <div className={css.gitLogTableHead}>
              <span className={css.gitLogColSubject}>{t('historySubject')}</span>
              <span className={css.gitLogColAuthor}>{t('historyAuthor')}</span>
              <span className={css.gitLogColDate}>{t('historyDate')}</span>
            </div>
            {entries.map(entry => (
              <button
                key={entry.hashFull}
                type="button"
                className={entry.hashFull === selected?.hashFull ? `${css.gitLogRow} ${css.gitLogRowActive}` : css.gitLogRow}
                title={`${entry.subject}\n${entry.author} · ${entry.date}\n${entry.hashFull}`}
                onClick={() => { setSelected(entry) }}
                onContextMenu={(event: MouseEvent) => {
                  event.preventDefault()
                  setMenu({ entry, x: event.clientX, y: event.clientY })
                }}
              >
                <span className={css.gitLogColSubject}>{entry.subject}</span>
                <span className={css.gitLogColAuthor} title={entry.author}>{entry.author}</span>
                <span className={css.gitLogColDate}>{compactDate(entry.date)}</span>
              </button>
            ))}
            {!ended && (
              <button type="button" className={css.gitLogMore} disabled={loadingMore} onClick={() => { void loadMore() }}>
                {loadingMore ? t('loading') : t('loadMore')}
              </button>
            )}
          </div>
          <div
            className={clsx(css.divider, css.dividerRow, dragging && css.dividerActive)}
            onPointerDown={(event) => {
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = { x: event.clientX, width: listWidthRef.current }
              setDragging(true)
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              const next = Math.min(
                LIST_WIDTH_MAX,
                Math.max(LIST_WIDTH_MIN, Math.round(drag.current.width + (event.clientX - drag.current.x))),
              )
              setListWidthPersist(next)
            }}
            onPointerUp={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              event.currentTarget.releasePointerCapture(event.pointerId)
              setDragging(false)
              try { localStorage.setItem(LIST_WIDTH_KEY, String(listWidthRef.current)) } catch { /* private mode */ }
            }}
          />
          <div className={css.gitLogDetail}>
            {selected === null && <div className={css.gitPlaceholder}>{t('historyPick')}</div>}
            {selected !== null && (
              <>
                <div className={css.gitLogFiles} style={{ height: filesHeight }}>
                  {files.length === 0 && !patchLoading && <div className={css.gitPlaceholder}>{t('historyNoFiles')}</div>}
                  {files.length > 0 && (
                    <GitPathTree
                      nodes={fileTree}
                      renderFile={(item, name) => (
                        <button
                          type="button"
                          className={fileFilter === item.path ? `${css.gitLogFile} ${css.gitLogFileActive}` : css.gitLogFile}
                          title={item.path}
                          draggable={selected !== null}
                          onDragStart={(event) => {
                            if (selected === null) return
                            beginOpenTabDrag(event, commitFileTab(selected, item.path, repo))
                          }}
                          onDragEnd={() => { setTabDragging(false) }}
                          onClick={() => { setFileFilter(current => current === item.path ? null : item.path) }}
                          onDoubleClick={(event) => {
                            event.preventDefault()
                            if (selected === null || store === undefined) return
                            const tab = commitFileTab(selected, item.path, repo)
                            const prefs = store.getPrefs()
                            store.reduce(s => dockTabToCenter(s, 'seed', tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax))
                            focusLatestCenterView(tab.title)
                          }}
                        >
                          <span className={fileNameClass(item.file)}>{name}</span>
                        </button>
                      )}
                    />
                  )}
                </div>
                <div
                  className={clsx(css.divider, css.dividerCol, draggingFiles && css.dividerActive)}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    filesDrag.current = { y: event.clientY, height: filesHeightRef.current }
                    setDraggingFiles(true)
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                    const next = Math.min(
                      FILES_HEIGHT_MAX,
                      Math.max(FILES_HEIGHT_MIN, Math.round(filesDrag.current.height + (event.clientY - filesDrag.current.y))),
                    )
                    setFilesHeightPersist(next)
                  }}
                  onPointerUp={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                    event.currentTarget.releasePointerCapture(event.pointerId)
                    setDraggingFiles(false)
                    try { localStorage.setItem(FILES_HEIGHT_KEY, String(filesHeightRef.current)) } catch { /* private mode */ }
                  }}
                />
                <div className={css.gitLogPatch}>
                  {patchLoading && <div className={css.gitPlaceholder}>{t('loading')}</div>}
                  {!patchLoading && (
                    <DiffView
                      ctx={ctx}
                      sessionId={scope.sessionId}
                      cwd={scope.cwd}
                      diff={visiblePatch}
                      onDragFile={selected === null ? undefined : (event, path) => {
                        beginOpenTabDrag(event, commitFileTab(selected, path, repo))
                      }}
                      onOpenFileAbove={selected === null || store === undefined ? undefined : (path) => {
                        const tab = commitFileTab(selected, path, repo)
                        const prefs = store.getPrefs()
                        store.reduce(s => dockTabToCenter(s, 'seed', tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax))
                        focusLatestCenterView(tab.title)
                      }}
                    />
                  )}
                </div>
                <div className={css.gitLogDetailFoot}>
                  <div className={css.gitLogSubject}>{selected.subject}</div>
                  <div className={css.gitLogMeta}>
                    {selected.hash} · {selected.author} · {selected.date}
                  </div>
                  {refNames(selected.refs).length > 0 && (
                    <div className={css.gitLogRefs}>
                      {refNames(selected.refs).map(ref => (
                        <span key={ref} className={css.gitLogRef}>{ref}</span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Menu
        open={menu !== null}
        onClose={() => { setMenu(null) }}
        items={[
          { id: 'copyShort', label: t('copyShortHash'), icon: <IconCopyOutline16 size={14} /> },
          { id: 'copyFull', label: t('copyFullHash'), icon: <IconCopyOutline16 size={14} /> },
          { id: 'copySubject', label: t('copySubject'), icon: <IconCopyOutline16 size={14} /> },
          { type: 'separator', id: 'sep2' },
          { id: 'revert', label: t('revertCommit'), danger: true },
          { id: 'cherryPick', label: t('cherryPickCommit'), danger: true },
        ]}
        onSelect={(id) => {
          const target = menu
          if (target === null) return
          setMenu(null)
          if (id === 'copyShort') { void writeClipboard(target.entry.hash); return }
          if (id === 'copyFull') { void writeClipboard(target.entry.hashFull); return }
          if (id === 'copySubject') { void writeClipboard(target.entry.subject); return }
          if (id === 'revert') {
            runConfirmed({
              title: t('revertTitle'),
              description: t('revertDesc', { subject: target.entry.subject }),
              confirmLabel: t('revertCommit'),
              onConfirm: () => api.gitRevert(scope, target.entry.hashFull),
            })
            return
          }
          if (id === 'cherryPick') {
            runConfirmed({
              title: t('cherryPickTitle'),
              description: t('cherryPickDesc', { subject: target.entry.subject }),
              confirmLabel: t('cherryPickCommit'),
              onConfirm: () => api.gitCherryPick(scope, target.entry.hashFull),
            })
          }
        }}
        portal
        align="start"
        getAnchorRect={() => (menu === null ? null : new DOMRect(menu.x, menu.y, 0, 0))}
        anchor={<span />}
      />
      <Modal
        open={confirm !== null}
        onClose={() => { setConfirm(null) }}
        title={confirm?.title ?? ''}
        closeLabel={t('cancel')}
        footer={(
          <>
            <Button variant="outline" onClick={() => { setConfirm(null) }}>{t('cancel')}</Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                const pending = confirm
                if (pending === null) return
                setConfirm(null)
                void pending.onConfirm()
              }}
            >
              {confirm?.confirmLabel ?? ''}
            </Button>
          </>
        )}
      >
        <p className={css.gitConfirmDesc}>{confirm?.description}</p>
      </Modal>
    </div>
  )
}
