/**
 * The source-control panel: an IDEA-style three-way status list (staged /
 * modified / untracked), stage/unstage, commit with a message box, and
 * branch switch. History is NOT inlined — "Open in bottom panel" lands an
 * IDEA-style log tab next to the terminal. File rows open a right-click
 * menu (open / stage / discard / copy). Refresh is manual + on mount.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import {
  Button, IconBranchOutline16, IconCodeOutline16, IconCopyOutline16, IconRefreshOutline16,
  IconTrashOutline16, Input, Menu, Modal, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { GitRepoInfo, GitStatusEntry, GitStatusResult, SessionScope } from './api.ts'
import { api } from './api.ts'
import { displayNameOf, type GitGroupBy } from './git-groups.ts'
import { subscribeGitFocus, takeGitFocus } from './git-focus.ts'
import { buildPathTree } from './git-tree.ts'
import { GitPathTree } from './GitPathTree.tsx'
import { relativeTo } from './paths.ts'
import { t } from './locales.ts'
import { badgeOf, classOfKind, kindOfEntry } from './git-status-style.ts'
import { dockTabToCenter, openHistoryTab, type SidebarStore, type SidebarTab } from './state.ts'
import { focusLatestCenterView } from './conversation-views.tsx'
import css from './sidebar.module.css'

const GROUP_BY_KEY = 'dsh-sidebar:git-group-by'

function readGroupBy(): GitGroupBy {
  try {
    const stored = localStorage.getItem(GROUP_BY_KEY)
    if (stored === 'directory' || stored === 'module' || stored === 'none') return stored
  } catch { /* private mode */ }
  return 'module'
}

/**
 * Opening a diff splits the git pane (leaf → split). React remounts GitView
 * and would otherwise drop the nested-repo selection + change list. Keep the
 * last snapshot for this session so the remount paints immediately.
 */
interface GitViewSnapshot {
  repos: GitRepoInfo[]
  repoRoot: string | undefined
  status: GitStatusResult | null
  branchNames: string[]
  commitMsg: string
  focusDir?: string
}

const snapshots = new Map<string, GitViewSnapshot>()

function snapshotKey(scope: SessionScope): string {
  return `${scope.sessionId}\0${scope.cwd ?? ''}`
}

/** The badge's class list (base badge + its status color). */
function badgeClassName(entry: GitStatusEntry): string {
  return [css.gitBadge, classOfKind(kindOfEntry(entry))].filter(Boolean).join(' ')
}

/** The file path's class list (base name + status color; deleted rows also
 *  get a strikethrough so the removal reads at a glance). */
function nameClassName(entry: GitStatusEntry): string {
  const classes: (string | undefined)[] = [css.gitName, classOfKind(kindOfEntry(entry))]
  if (badgeOf(entry) === 'D') classes.push(css.gitDeletedText)
  return classes.filter(Boolean).join(' ')
}

/** Whether the entry carries STAGED (index) changes — the X letter is set. */
function isStagedEntry(entry: GitStatusEntry): boolean {
  const index = entry.xy[0]
  return index !== undefined && index !== ' ' && index !== '?'
}

/** Whether the entry carries UNSTAGED (worktree) changes — the Y letter is set.
 *  Untracked `??` also satisfies this (it is a worktree-only change), but the
 *  panel buckets it separately via {@link isUntracked}; a file with both
 *  letters set ('MM') lands in BOTH staged and modified. */
function isUnstagedEntry(entry: GitStatusEntry): boolean {
  if (entry.xy === '??') return true
  const worktree = entry.xy[1]
  return worktree !== undefined && worktree !== ' ' && worktree !== '?'
}

/** Whether the entry is untracked (`??`): git diff never includes it. */
function isUntracked(entry: GitStatusEntry): boolean {
  return badgeOf(entry) === '?'
}

/** The last path segment (tab title for a file's diff). */
function baseName(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

/** The pending destructive action (discard / revert / cherry-pick), gated by a confirm modal. */
interface ConfirmState {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<unknown>
}

export function GitView(props: {
  scope: SessionScope
  store: SidebarStore
  onOpenFile: (path: string) => void
  /** Open a diff tab (the shell places it below the git pane on first use). */
  onOpenDiff: (tab: SidebarTab) => void
}) {
  const { scope, store, onOpenFile, onOpenDiff } = props
  const cached = snapshots.get(snapshotKey(scope))
  const [status, setStatus] = useState<GitStatusResult | null>(cached?.status ?? null)
  const [repos, setRepos] = useState<GitRepoInfo[]>(cached?.repos ?? [])
  const [repoRoot, setRepoRoot] = useState<string | undefined>(cached?.repoRoot)
  const [groupBy, setGroupBy] = useState<GitGroupBy>(readGroupBy)
  const [loading, setLoading] = useState(cached === undefined)
  const [error, setError] = useState<string | null>(null)
  const [branchNames, setBranchNames] = useState<string[]>(cached?.branchNames ?? [])
  const [commitMsg, setCommitMsg] = useState(cached?.commitMsg ?? '')
  const [busy, setBusy] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)

  /** The open file-row context menu (cursor position for the portaled Menu). */
  const [fileMenu, setFileMenu] = useState<{ entry: GitStatusEntry; staged: boolean; x: number; y: number } | null>(null)
  /** The pending destructive action awaiting confirmation. */
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  /** The multi-repo picker modal (a workspace with several git roots). */
  const [repoPickerOpen, setRepoPickerOpen] = useState(false)
  /** Branch / group-by menus portal out of the overflow-clipped panel. */
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const [focusDir, setFocusDir] = useState<string | undefined>(cached?.focusDir)
  const repoRootRef = useRef(repoRoot)
  const groupByRef = useRef(groupBy)
  const refreshRef = useRef<(nextRepo?: string) => Promise<void>>(async () => {})
  repoRootRef.current = repoRoot
  groupByRef.current = groupBy

  /** IDEA-style three-way split: staged (index X), modified (worktree Y on a
   *  tracked file), untracked (`??`). A file with both index and worktree
   *  changes ('MM') appears in BOTH staged and modified. */
  const entries = status?.entries ?? []
  const stagedEntries = entries.filter(isStagedEntry)
  const untrackedEntries = entries.filter(isUntracked)
  const modifiedEntries = entries.filter(entry => isUnstagedEntry(entry) && !isUntracked(entry))

  const gitScope: SessionScope = { ...scope, repo: repoRoot }

  useEffect(() => {
    snapshots.set(snapshotKey(scope), { repos, repoRoot, status, branchNames, commitMsg, focusDir })
  }, [scope.sessionId, scope.cwd, repos, repoRoot, status, branchNames, commitMsg, focusDir])

  const refresh = useCallback(async (nextRepo?: string): Promise<void> => {
    const key = snapshotKey(scope)
    const keep = snapshots.get(key)
    // A remount / background refresh must not blank the list; switching repo
    // still shows the loading placeholder.
    if (keep === undefined || nextRepo !== undefined) setLoading(true)
    setError(null)
    try {
      const listed = await api.gitRepos(scope).catch(() => ({ repos: [] as GitRepoInfo[] }))
      const preferred = nextRepo ?? keep?.repoRoot ?? repoRoot
      const selected = preferred !== undefined && listed.repos.some(repo => repo.root === preferred)
        ? preferred
        : listed.repos[0]?.root
      const active: SessionScope = { ...scope, repo: selected }
      const [statusResult, branchResult] = await Promise.all([
        api.gitStatus(active),
        api.gitBranch(active).catch(() => ({ current: '', names: [] as string[] })),
      ])
      const root = statusResult.root ?? selected
      setRepos(listed.repos)
      setRepoRoot(root)
      setStatus(statusResult)
      setBranchNames(branchResult.names)
      snapshots.set(key, {
        repos: listed.repos,
        repoRoot: root,
        status: statusResult,
        branchNames: branchResult.names,
        commitMsg: snapshots.get(key)?.commitMsg ?? keep?.commitMsg ?? '',
        focusDir: snapshots.get(key)?.focusDir ?? keep?.focusDir,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
    // repoRoot is read as the "keep current selection" hint; changing it must
    // not re-fire refresh (the picker calls refresh(next) explicitly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.sessionId, scope.cwd])

  useEffect(() => { void refresh() }, [refresh])
  refreshRef.current = refresh

  /** Open the IDEA-style log in the bottom panel (same strip as the terminal). */
  const openHistory = (): void => {
    const repo = repoRoot ?? ''
    store.reduce(s => openHistoryTab(s, {
      id: `git-log:${repo || 'default'}`,
      type: 'git-log',
      title: t('history'),
      meta: repo === '' ? undefined : repo,
    }))
  }

  /** One change's diff tab (id is path+side so the same file focuses). */
  const worktreeDiffTab = (entry: GitStatusEntry, staged: boolean): SidebarTab => ({
    id: `diff:w:${staged ? 's' : 'u'}:${entry.path}`,
    type: 'diff',
    title: baseName(entry.path),
    diff: { kind: 'worktree', path: entry.path, staged, untracked: isUntracked(entry), repo: repoRoot },
  })

  /** Click: preview in the workbench below the source-control pane. */
  const openWorktreeDiff = (entry: GitStatusEntry, staged: boolean): void => {
    onOpenDiff(worktreeDiffTab(entry, staged))
  }

  /** Double-click: dock the same preview onto the conversation header. */
  const dockWorktreeDiff = (entry: GitStatusEntry, staged: boolean): void => {
    const tab = worktreeDiffTab(entry, staged)
    const prefs = store.getPrefs()
    store.reduce(s => dockTabToCenter(s, 'seed', tab.id, tab, prefs.centerTabOverflow, prefs.centerTabMax))
    focusLatestCenterView(tab.title)
  }

  const stageEntry = async (entry: GitStatusEntry, staged: boolean): Promise<void> => {
    setBusy(true)
    try {
      if (staged) await api.gitUnstage(gitScope, entry.path)
      else await api.gitStage(gitScope, entry.path)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const unstageAll = async (): Promise<void> => {
    setBusy(true)
    try {
      await api.gitUnstage(gitScope)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  /** Stage all tracked modifications/deletions (untracked files stay put). */
  const stageTrackedAll = async (): Promise<void> => {
    setBusy(true)
    try {
      await api.gitStageTracked(gitScope)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  /** Add all untracked files to the index in one batch. */
  const stageUntrackedAll = async (): Promise<void> => {
    setBusy(true)
    try {
      await api.gitStageUntracked(gitScope, untrackedEntries.map(entry => entry.path))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const commit = async (): Promise<void> => {
    const message = commitMsg.trim()
    if (message === '' || busy) return
    setBusy(true)
    setCommitError(null)
    try {
      await api.gitCommit(gitScope, message)
      setCommitMsg('')
      await refresh()
    } catch (reason) {
      setCommitError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  const checkout = async (branch: string): Promise<void> => {
    if (branch === status?.branch || busy) return
    setBusy(true)
    setCommitError(null)
    try {
      await api.gitCheckout(gitScope, branch)
      await refresh()
    } catch (reason) {
      setCommitError(`${t('checkoutError')}: ${reason instanceof Error ? reason.message : String(reason)}`)
    } finally {
      setBusy(false)
    }
  }

  /** Run one destructive operation after the confirm modal, then refresh. */
  const runConfirmed = (confirmState: ConfirmState): void => {
    setConfirm({ ...confirmState, onConfirm: async () => {
      setBusy(true)
      setCommitError(null)
      try {
        await confirmState.onConfirm()
        await refresh()
      } catch (reason) {
        setCommitError(reason instanceof Error ? reason.message : String(reason))
      } finally {
        setBusy(false)
      }
    } })
  }

  /** Copy `text` to the clipboard (best-effort; no visual feedback needed — the menu closes). */
  const copy = (text: string): void => {
    void writeClipboard(text)
  }

  const openFileMenu = (event: MouseEvent, entry: GitStatusEntry, staged: boolean): void => {
    event.preventDefault()
    event.stopPropagation()
    setFileMenu({ entry, staged, x: event.clientX, y: event.clientY })
  }

  const changeGroupBy = (next: GitGroupBy): void => {
    setGroupBy(next)
    try { localStorage.setItem(GROUP_BY_KEY, next) } catch { /* private mode */ }
  }

  useEffect(() => {
    const apply = (focus: { repo: string; dir: string }): void => {
      setFocusDir(focus.dir)
      if (groupByRef.current === 'none') changeGroupBy('directory')
      if (focus.repo !== repoRootRef.current) void refreshRef.current(focus.repo)
    }
    const pending = takeGitFocus()
    if (pending !== undefined) apply(pending)
    return subscribeGitFocus(() => {
      const next = takeGitFocus()
      if (next !== undefined) apply(next)
    })
  }, [scope.sessionId, scope.cwd])

  const stagedTree = useMemo(() => buildPathTree(stagedEntries), [stagedEntries])
  const modifiedTree = useMemo(() => buildPathTree(modifiedEntries), [modifiedEntries])
  const untrackedTree = useMemo(() => buildPathTree(untrackedEntries), [untrackedEntries])
  const branchItems = useMemo(() => {
    const current = status?.branch
    const names = current !== undefined && current !== '' && !branchNames.includes(current)
      ? [current, ...branchNames]
      : branchNames
    return names.map(name => ({ id: name, label: name }))
  }, [status?.branch, branchNames])

  const renderEntry = (entry: GitStatusEntry, staged: boolean, name = displayNameOf(entry.path, groupBy)): ReactNode => {
    return (
      <div key={`${staged ? 's' : 'u'}:${entry.path}`} className={css.gitRow}>
        <button
          type="button"
          className={css.gitRowMain}
          title={entry.path}
          onClick={() => { openWorktreeDiff(entry, staged) }}
          onDoubleClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            dockWorktreeDiff(entry, staged)
          }}
          onContextMenu={(event) => { openFileMenu(event, entry, staged) }}
        >
          <span className={badgeClassName(entry)}>{badgeOf(entry)}</span>
          <span className={nameClassName(entry)}>{name}</span>
        </button>
        <button
          type="button"
          className={css.iconButton}
          aria-label={staged ? t('unstage') : t('stage')}
          title={staged ? t('unstage') : t('stage')}
          disabled={busy}
          onClick={() => { void stageEntry(entry, staged) }}
        >
          {staged ? <IconTrashOutline16 /> : <IconBranchOutline16 />}
        </button>
      </div>
    )
  }

  return (
    <div className={css.git}>
      <div className={css.gitHeader}>
        {repos.length > 1 && (
          <Menu
            className={css.gitPicker}
            open={repoPickerOpen}
            onClose={() => { setRepoPickerOpen(false) }}
            portal
            align="start"
            selectedId={repoRoot}
            items={repos.map(repo => ({
              id: repo.root,
              label: repo.rel === '.' ? repo.name : `${repo.name} (${repo.rel})`,
            }))}
            onSelect={(id) => {
              setRepoPickerOpen(false)
              void refresh(id)
            }}
            anchor={(
              <button
                type="button"
                className={css.gitBranchSelect}
                aria-label={t('gitRepo')}
                title={t('gitRepo')}
                aria-haspopup="menu"
                aria-expanded={repoPickerOpen}
                disabled={busy}
                onClick={() => { setRepoPickerOpen(open => !open) }}
              >
                {repos.find(repo => repo.root === repoRoot)?.rel === '.'
                  ? repos.find(repo => repo.root === repoRoot)?.name
                  : `${repos.find(repo => repo.root === repoRoot)?.name ?? ''} (${repos.find(repo => repo.root === repoRoot)?.rel ?? ''})`}
              </button>
            )}
          />
        )}
        <Menu
          className={css.gitPicker}
          open={branchMenuOpen}
          onClose={() => { setBranchMenuOpen(false) }}
          portal
          align="start"
          selectedId={status?.branch}
          items={branchItems}
          onSelect={(id) => {
            setBranchMenuOpen(false)
            void checkout(id)
          }}
          anchor={(
            <button
              type="button"
              className={css.gitBranchSelect}
              aria-label={t('branch')}
              title={t('branch')}
              aria-haspopup="menu"
              aria-expanded={branchMenuOpen}
              disabled={busy || (status !== null && !status.isRepo)}
              onClick={() => { setBranchMenuOpen(open => !open) }}
            >
              {status?.branch ?? t('branch')}
            </button>
          )}
        />
        <Menu
          className={css.gitGroupPicker}
          open={groupMenuOpen}
          onClose={() => { setGroupMenuOpen(false) }}
          portal
          align="start"
          selectedId={groupBy}
          items={[
            { id: 'none', label: t('groupByNone') },
            { id: 'directory', label: t('groupByDirectory') },
            { id: 'module', label: t('groupByModule') },
          ]}
          onSelect={(id) => {
            setGroupMenuOpen(false)
            changeGroupBy(id as GitGroupBy)
          }}
          anchor={(
            <button
              type="button"
              className={css.gitGroupSelect}
              aria-label={t('groupBy')}
              title={t('groupBy')}
              aria-haspopup="menu"
              aria-expanded={groupMenuOpen}
              onClick={() => { setGroupMenuOpen(open => !open) }}
            >
              {groupBy === 'none' ? t('groupByNone') : groupBy === 'directory' ? t('groupByDirectory') : t('groupByModule')}
            </button>
          )}
        />
        <button
          type="button"
          className={css.gitLink}
          onClick={openHistory}
        >
          {t('history')}
        </button>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('refresh')}
          title={t('refresh')}
          onClick={() => { void refresh() }}
        >
          <IconRefreshOutline16 size={14} />
        </button>
      </div>

      {loading && <div className={css.gitPlaceholder}>{t('loading')}</div>}
      {!loading && error !== null && <div className={css.gitError}>{error}</div>}
      {!loading && status !== null && !status.isRepo && (
        <div className={css.gitPlaceholder}>{t('notRepo')}</div>
      )}

      {status !== null && status.isRepo && (
        <>
          {entries.length === 0 && <div className={css.gitEmpty}>{t('noChanges')}</div>}

          {stagedEntries.length > 0 && (
            <div className={css.gitSection}>
              <div className={css.gitSectionHeader}>
                <span>{t('staged')} ({stagedEntries.length})</span>
                <button type="button" className={css.gitLink} disabled={busy} onClick={() => { void unstageAll() }}>
                  {t('unstageAll')}
                </button>
              </div>
              {groupBy === 'none'
                ? stagedEntries.map(entry => renderEntry(entry, true))
                : (
                  <GitPathTree
                    nodes={stagedTree}
                    focusDir={focusDir}
                    renderFile={(entry, name) => renderEntry(entry, true, name)}
                  />
                )}
            </div>
          )}

          {modifiedEntries.length > 0 && (
            <div className={css.gitSection}>
              <div className={css.gitSectionHeader}>
                <span>{t('modified')} ({modifiedEntries.length})</span>
                <button type="button" className={css.gitLink} disabled={busy} onClick={() => { void stageTrackedAll() }}>
                  {t('stageAll')}
                </button>
              </div>
              {groupBy === 'none'
                ? modifiedEntries.map(entry => renderEntry(entry, false))
                : (
                  <GitPathTree
                    nodes={modifiedTree}
                    focusDir={focusDir}
                    renderFile={(entry, name) => renderEntry(entry, false, name)}
                  />
                )}
            </div>
          )}

          {untrackedEntries.length > 0 && (
            <div className={css.gitSection}>
              <div className={css.gitSectionHeader}>
                <span>{t('untracked')} ({untrackedEntries.length})</span>
                <button type="button" className={css.gitLink} disabled={busy} onClick={() => { void stageUntrackedAll() }}>
                  {t('addAll')}
                </button>
              </div>
              {groupBy === 'none'
                ? untrackedEntries.map(entry => renderEntry(entry, false))
                : (
                  <GitPathTree
                    nodes={untrackedTree}
                    focusDir={focusDir}
                    renderFile={(entry, name) => renderEntry(entry, false, name)}
                  />
                )}
            </div>
          )}

          <div className={css.gitCommit}>
            <Input
              className={css.gitCommitInput}
              placeholder={t('commitPlaceholder')}
              value={commitMsg}
              disabled={busy}
              onChange={(event) => { setCommitMsg(event.target.value); setCommitError(null) }}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void commit()
              }}
            />
            <button
              type="button"
              className={css.gitCommitButton}
              disabled={busy || commitMsg.trim() === '' || stagedEntries.length === 0}
              onClick={() => { void commit() }}
            >
              {t('commit')}
            </button>
          </div>
          {commitError !== null && <div className={css.gitError}>{commitError}</div>}

          {/*
            The one shared file-row context menu, positioned at the right-click
            cursor (portal so the panel's overflow clip cannot crop it).
          */}
          <Menu
            open={fileMenu !== null}
            onClose={() => { setFileMenu(null) }}
            items={[
              { id: 'open', label: t('openEditor'), icon: <IconCodeOutline16 size={14} /> },
              fileMenu?.staged === true
                ? { id: 'stage', label: t('unstage'), icon: <IconTrashOutline16 size={14} /> }
                : { id: 'stage', label: t('stage'), icon: <IconBranchOutline16 size={14} /> },
              ...(fileMenu !== null && !isUntracked(fileMenu.entry)
                ? [{ id: 'discard', label: t('discard'), icon: <IconTrashOutline16 size={14} />, danger: true }]
                : []),
              { type: 'separator', id: 'sep1' },
              { id: 'relative', label: t('copyRelative'), icon: <IconCopyOutline16 size={14} /> },
              { id: 'absolute', label: t('copyAbsolute'), icon: <IconCopyOutline16 size={14} /> },
            ]}
            onSelect={(id) => {
              const target = fileMenu
              if (target === null) return
              setFileMenu(null)
              if (id === 'open') {
                onOpenFile(target.entry.path)
                return
              }
              if (id === 'stage') {
                void stageEntry(target.entry, target.staged)
                return
              }
              if (id === 'discard') {
                runConfirmed({
                  title: t('discardTitle'),
                  description: t('discardDesc', { path: target.entry.path }),
                  confirmLabel: t('discard'),
                  onConfirm: () => api.gitDiscard(gitScope, target.entry.path),
                })
                return
              }
              if (id === 'relative') {
                copy(relativeTo(scope.cwd ?? '', target.entry.path))
                return
              }
              if (id === 'absolute') copy(target.entry.path)
            }}
            portal
            align="start"
            getAnchorRect={() => (fileMenu === null ? null : new DOMRect(fileMenu.x, fileMenu.y, 0, 0))}
            anchor={<span />}
          />

          {/* Destructive actions land here first: Cancel / Confirm. */}
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
        </>
      )}

    </div>
  )
}
