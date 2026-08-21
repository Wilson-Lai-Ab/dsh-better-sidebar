/**
 * The editor tab host: resolves a file's previewer through the sidebar
 * registry (`matchFileViewer`), fetches bytes per the matched viewer's
 * fetch strategy, and renders its component — or the shared download pane
 * when nothing can render the file. The header shows the file title; the
 * editable code/markdown viewers render their own toolbar below it.
 *
 * The strategy dispatch is pure (planFirstMatch / planFsReadOutcome in
 * editor-load.ts); this component only wires it to the host APIs.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createElement } from 'react'
import clsx from 'clsx'
import type { Context } from '../context-types.ts'
import { api, mediaUrl, type SessionScope } from './api.ts'
import { BinaryDownload } from './binary-download.tsx'
import { planFirstMatch, planFsReadOutcome, type EditorLoadAction } from './editor-load.ts'
import { t } from './locales.ts'
import { resolveSidebarPath } from './produced-files.ts'
import {
  ReviewBar,
  revertLastReview,
  canRevertReview,
  decisionOf,
  reviewRevision,
  subscribeReview,
  useSessionEdits,
} from './review/index.ts'
import type { FileViewerDescriptor } from './service.ts'
import type { SidebarStore } from './state.ts'

import css from './sidebar.module.css'

type EditorLoad =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; viewer: FileViewerDescriptor; content?: string; truncated?: boolean; mediaUrl?: string; customData?: unknown }
  | { status: 'binary' }

export function EditorHost(props: { ctx: Context; store: SidebarStore; scope: SessionScope; path: string; title: string }) {
  const { ctx, store, scope, path, title } = props
  const [load, setLoad] = useState<EditorLoad>({ status: 'loading' })
  const rootRef = useRef<HTMLDivElement>(null)
  const { latest } = useSessionEdits(ctx, scope.sessionId, scope.cwd)
  const abs = resolveSidebarPath(scope.cwd, path)
  const review = latest.find(edit => edit.path === abs || edit.path === path)
  const reviewTick = useSyncExternalStore(subscribeReview, reviewRevision)
  const fileDecision = review === undefined ? undefined : decisionOf(scope.sessionId, review.path, review)
  const seenDecision = useRef<{ path: string; tick: number; decision?: string }>({ path: '', tick: -1 })

  const applyContent = (next?: string | null): void => {
    if (next === undefined) return
    setLoad((current) => current.status === 'ready' ? { ...current, content: next ?? '' } : current)
  }

  useEffect(() => {
    let cancelled = false
    // Aborts the matched viewer's `load` when the editor tears down (tab
    // closed, path changed, session switched) or re-matches the viewer.
    const controller = new AbortController()
    setLoad({ status: 'loading' })
    const mediaUrlOf = (): string => mediaUrl(scope, path)
    const apply = (action: EditorLoadAction): void => {
      if (cancelled) return
      switch (action.kind) {
        case 'binary':
          setLoad({ status: 'binary' })
          return
        case 'render':
          setLoad({
            status: 'ready',
            viewer: action.viewer,
            content: action.content,
            truncated: action.truncated,
            mediaUrl: action.mediaUrl,
            customData: action.customData,
          })
          return
        case 'customLoad':
          void action.viewer.load?.(path, scope, controller.signal).then((data) => {
            if (cancelled) return
            setLoad({ status: 'ready', viewer: action.viewer, customData: data })
          }).catch((error: unknown) => {
            if (cancelled) return
            setLoad({ status: 'error', message: error instanceof Error ? error.message : String(error) })
          })
          return
        case 'fetchFsRead':
          api.fsRead(scope, path).then((result) => {
            if (cancelled) return
            // Binary reads carry the head bytes for the detect re-match.
            const outcome = planFsReadOutcome(action.viewer, {
              binary: result.kind === 'binary',
              content: result.kind === 'text' ? result.content : '',
              truncated: result.truncated,
              head: result.kind === 'binary' ? result.head : undefined,
            }, (head) => ctx.betterSidebar?.matchFileViewer(path, head), mediaUrlOf)
            apply(outcome)
          }).catch((error: unknown) => {
            if (cancelled) return
            setLoad({ status: 'error', message: error instanceof Error ? error.message : String(error) })
          })
          return
      }
    }
    apply(planFirstMatch(ctx.betterSidebar?.matchFileViewer(path), mediaUrlOf))
    return () => { cancelled = true; controller.abort() }
  }, [scope.sessionId, scope.cwd, path, ctx])

  // File-level undo / Ctrl+Z may happen from the review list (no onDone).
  // Reload only when this file's keep/undo actually flips — not on first open.
  useEffect(() => {
    if (review === undefined) return
    const prev = seenDecision.current
    if (prev.path !== path) {
      seenDecision.current = { path, tick: reviewTick, decision: fileDecision }
      return
    }
    if (prev.tick === reviewTick && prev.decision === fileDecision) return
    seenDecision.current = { path, tick: reviewTick, decision: fileDecision }
    let cancelled = false
    void api.fsRead(scope, path).then((result) => {
      if (cancelled) return
      applyContent(result.kind === 'text' ? result.content : '')
    }).catch(() => {
      if (!cancelled) applyContent('')
    })
    return () => { cancelled = true }
  }, [fileDecision, reviewTick, path, review, scope])

  useEffect(() => {
    const root = rootRef.current
    if (root === null) return
    const onKey = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      if (event.target instanceof Element && event.target.closest('.cm-editor') !== null) return
      const key = event.key.toLowerCase()
      const redo = key === 'y' || (key === 'z' && event.shiftKey)
      const undo = key === 'z' && !event.shiftKey
      if (!undo && !redo) return
      const direction = undo ? 'undo' : 'redo'
      if (!canRevertReview(scope.sessionId, abs, direction)) return
      event.preventDefault()
      event.stopPropagation()
      void revertLastReview(scope, abs, direction).then((result) => {
        if (!result.applied) return
        applyContent(result.content)
      })
    }
    root.addEventListener('keydown', onKey)
    return () => { root.removeEventListener('keydown', onKey) }
  }, [abs, scope])

  return (
    <div className={css.editor} ref={rootRef} tabIndex={-1}>
      <div className={clsx(css.editorHeader, css.editorPathHeader)}>
        <span className={css.editorTitle} title={path}>{title}</span>
      </div>
      {review !== undefined && (
        <ReviewBar
          scope={scope}
          edit={review}
          onDone={(next) => {
            applyContent(next)
            requestAnimationFrame(() => { rootRef.current?.focus() })
          }}
        />
      )}
      {load.status === 'loading' && <div className={css.editorPlaceholder}>{t('loading')}</div>}
      {load.status === 'error' && <div className={css.editorError}>{load.message}</div>}
      {load.status === 'binary' && <BinaryDownload scope={scope} path={path} />}
      {load.status === 'ready' && createElement(load.viewer.component, {
        ctx, store, scope, path, title,
        viewerId: load.viewer.id,
        content: load.content,
        truncated: load.truncated,
        mediaUrl: load.mediaUrl,
        customData: load.customData,
      })}
    </div>
  )
}
