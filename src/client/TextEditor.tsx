/**
 * The code/markdown file viewer: a CodeMirror 6 editor with line wrapping,
 * syntax highlighting (extension-keyed language), a dirty dot and Ctrl/Cmd+S
 * save, and a preview/edit toggle for markdown files. Registered as the
 * `code` (catch-all) and `markdown` built-in viewers; the editor tab host
 * fetches the content through the fsRead strategy and passes it in props,
 * so this component never fetches or dispatches — it only edits.
 *
 * The toolbar (mode toggle / dirty dot / save / status) renders as its own
 * row below the host's title bar, VSCode-style.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { Compartment, EditorState, StateEffect, StateField, type Extension, type Text } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView as CodeMirrorView, keymap, lineNumbers } from '@codemirror/view'
import { showMinimap } from '@replit/codemirror-minimap'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { IconCheckOutline16, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { api, htmlPreviewSrc } from './api.ts'
import { languageForPath } from './lang.ts'
import { cmSurfaceTheme, CmThemeCompartment } from './cm-themes.ts'
import { isDarkScheme, subscribeColorScheme } from './theme.ts'
import { SandboxStatusBar } from './SandboxStatusBar.tsx'
import { insertFileRef } from './conversation-draft.ts'
import { subscribeReveal, takeReveal, type RevealRange } from './editor-reveal.ts'
import { fileRefOf, type FileRef, writeFileRefClipboard } from './file-ref.ts'
import { linesOfSelection } from './selection-payload.ts'
import { gitGutter, gutterLinesOfDiff, gutterLinesOfTexts, setGitGutter, type GutterLine } from './git-gutter.ts'
import { gitFileTarget } from './git-repo.ts'
import { badgeOf } from './git-status-style.ts'
import { resolveSidebarPath } from './produced-files.ts'
import { rememberViewMode, resolveViewMode, type ViewMode } from './editor-view-mode.ts'
import { htmlScrollRestoreMessage, parseHtmlScrollMessage } from '../html-scroll-bridge.ts'
import { previewScrollOf, rememberPreviewScroll } from './preview-scroll.ts'
import { t } from './locales.ts'
import type { FileViewerProps } from './service.ts'
import css from './sidebar.module.css'

const setRevealEffect = StateEffect.define<RevealRange | null>()
const revealLineDeco = Decoration.line({ class: 'dsh-reveal-line' })
const revealMarkDeco = Decoration.mark({ class: 'dsh-reveal-mark' })

function clampReveal(doc: Text, range: RevealRange): { startLine: number; endLine: number; from: number; to: number } {
  const startLine = Math.min(Math.max(range.start, 1), doc.lines)
  const endLine = Math.min(Math.max(range.end, startLine), doc.lines)
  return { startLine, endLine, from: doc.line(startLine).from, to: doc.line(endLine).to }
}

const revealLineField = StateField.define<DecorationSet>({
  create() { return Decoration.none },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setRevealEffect)) continue
      const range = effect.value
      if (range === null) return Decoration.none
      const { startLine, endLine } = clampReveal(transaction.state.doc, range)
      const marks = []
      for (let number = startLine; number <= endLine; number += 1) {
        marks.push(revealLineDeco.range(transaction.state.doc.line(number).from))
      }
      return Decoration.set(marks, true)
    }
    return value.map(transaction.changes)
  },
  provide: field => CodeMirrorView.decorations.from(field),
})

const revealMarkField = StateField.define<DecorationSet>({
  create() { return Decoration.none },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setRevealEffect)) continue
      const range = effect.value
      if (range === null) return Decoration.none
      const { from, to } = clampReveal(transaction.state.doc, range)
      return to > from ? Decoration.set([revealMarkDeco.range(from, to)]) : Decoration.none
    }
    return value.map(transaction.changes)
  },
  provide: field => CodeMirrorView.decorations.from(field),
})

/** The floating "add to conversation" action: file chip + viewport anchor. */
interface SelectionPopup {
  ref: FileRef
  left: number
  top: number
}

/**
 * The sandbox tokens of the HTML preview iframe. NO allow-same-origin (the
 * preview must stay in an opaque origin — with the route's own origin it
 * could read session data) and NO allow-top-navigation (a previewed page
 * must not hijack the GUI). The user can disable the sandbox per-feature
 * in the side card settings (warned); the toggle below reflects it.
 */
export const HTML_IFRAME_SANDBOX = 'allow-scripts allow-popups allow-downloads allow-modals'

/** Keep/Undo bar inset: the live Replit gutter width (max 120, else width/6). */
export function syncMinimapInset(host: HTMLElement, enabled: boolean): void {
  if (!enabled) {
    host.style.setProperty('--dsh-editor-minimap', '0px')
    return
  }
  const gutter = host.querySelector('.cm-minimap-gutter') as HTMLElement | null
  const width = gutter !== null && gutter.clientWidth > 0
    ? gutter.clientWidth
    : Math.min(120, Math.max(0, Math.round(host.clientWidth / 6)))
  host.style.setProperty('--dsh-editor-minimap', `${width}px`)
}

function minimapExtensions(enabled: boolean): Extension[] {
  if (!enabled) return []
  return [
    showMinimap.compute(['doc'], () => ({
      create: () => ({
        dom: document.createElement('div'),
      }),
      displayText: 'characters',
      showOverlay: 'always',
    })),
  ]
}

export function TextEditor(props: FileViewerProps) {
  const { ctx, scope, path, viewerId, content, truncated } = props
  const absPath = resolveSidebarPath(scope.cwd, path)
  const [mode, setMode] = useState<ViewMode>(() => resolveViewMode({
    sessionId: scope.sessionId,
    path,
    viewerId,
    hasReview: false,
  }))
  /** The editor's current text (null while clean); preview renders this. */
  const [draft, setDraft] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<CodeMirrorView | null>(null)
  const savingRef = useRef(false)
  /** The theme compartment of the current view (reconfigured on scheme flip). */
  const themeCompRef = useRef<CmThemeCompartment | null>(null)
  /** Minimap on/off without recreating the document (Side card pref). */
  const minimapCompRef = useRef<Compartment | null>(null)
  /** The app's resolved color scheme; the editor re-themes in place on flips. */
  const [dark, setDark] = useState(() => isDarkScheme())
  /** The floating "add to conversation" popup (viewport-anchored; null = hidden). */
  const [popup, setPopup] = useState<SelectionPopup | null>(null)
  /** Live mirror of the popup state for click-time reads (no re-render race). */
  const popupRef = useRef<SelectionPopup | null>(null)
  /** The markdown preview container (selection-containment + line lookup). */
  const mdRef = useRef<HTMLDivElement>(null)
  const htmlRef = useRef<HTMLIFrameElement>(null)
  const paneVisible = props.visible !== false
  const restoringHtmlScroll = useRef(false)
  /** Last chip-opened span, so markdown preview can mark the same text. */
  const [reveal, setReveal] = useState<RevealRange | null>(null)

  const hidePopup = (): void => {
    popupRef.current = null
    setPopup(null)
  }

  /** Anchor the popup above the selection center; clamp inside the viewport. */
  const showPopup = (ref: FileRef, left: number, top: number): void => {
    const next: SelectionPopup = {
      ref,
      left: Math.min(Math.max(left, 80), window.innerWidth - 80),
      top,
    }
    popupRef.current = next
    setPopup(next)
  }

  /** The popup button's click: mint a file chip in the composer. */
  const commitPopup = (): void => {
    const current = popupRef.current
    if (current === null) return
    insertFileRef(ctx, scope.sessionId, current.ref)
    hidePopup()
  }

  useEffect(() => subscribeColorScheme(() => { setDark(isDarkScheme()) }), [])

  const pickMode = (next: ViewMode): void => {
    rememberViewMode(scope.sessionId, path, next)
    setMode(next)
  }

  // A new file (tab switch) starts clean. Unless the user already picked
  // Preview / Edit for this path, markdown / HTML keep their default mode.
  useEffect(() => {
    setMode(resolveViewMode({
      sessionId: scope.sessionId,
      path,
      viewerId,
      hasReview: false,
    }))
    setDraft(null)
    setDirty(false)
    setSaveState('idle')
    hidePopup()
    setReveal(null)
  }, [content])

  // Create the CodeMirror editor once the content is loaded. The view owns
  // the document; React only tracks dirty/draft state through the update
  // listener. For markdown the view stays mounted while previewing (hidden),
  // so unsaved edits survive the preview/edit toggle. The theme + syntax
  // colors live in a compartment so a scheme flip reconfigures only that
  // part — the document, undo history and scroll position survive.
  useEffect(() => {
    if (content === undefined) return
    const host = hostRef.current
    if (host === null) return
    const language = languageForPath(path)
    const themeComp = new CmThemeCompartment()
    themeCompRef.current = themeComp
    const minimapComp = new Compartment()
    minimapCompRef.current = minimapComp
    const minimapOn = props.store?.getPrefs().editorMinimap !== false
    const state = EditorState.create({
      doc: content,
      extensions: [
        CodeMirrorView.lineWrapping,
        lineNumbers(),
        ...gitGutter(),
        history(),
        EditorState.tabSize.of(2),
        CodeMirrorView.contentAttributes.of({ spellcheck: 'false' }),
        revealLineField,
        revealMarkField,
        cmSurfaceTheme,
        themeComp.of(dark),
        minimapComp.of(minimapExtensions(minimapOn)),
        ...(language !== null ? [language] : []),
        CodeMirrorView.updateListener.of((update) => {
          if (update.docChanged) {
            setDraft(update.state.doc.toString())
            setDirty(true)
          }
        }),
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => { save(); return true },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        // Selection popup (the code and markdown editors): a non-empty
        // selection anchors the floating "add to conversation" button above
        // its head. Scrolling (geometry/viewport change) or losing focus
        // hides it; typing collapses the selection and hides it too.
        ...(viewerId === 'code' || viewerId === 'markdown' ? [
          CodeMirrorView.updateListener.of((update) => {
            if (update.geometryChanged || update.viewportChanged) {
              hidePopup()
              return
            }
            if (!update.view.hasFocus) {
              hidePopup()
              return
            }
            if (!(update.selectionSet || update.docChanged || update.focusChanged)) return
            const sel = update.state.selection.main
            if (sel.empty) {
              hidePopup()
              return
            }
            const text = update.state.sliceDoc(sel.from, sel.to)
            if (text.trim() === '') {
              hidePopup()
              return
            }
            // Page coordinates (the document root may scroll); the popup is
            // position:fixed, so convert to viewport coordinates.
            const rect = update.view.coordsAtPos(sel.head)
            if (rect === null) {
              hidePopup()
              return
            }
            const doc = update.state.doc
            showPopup(
              fileRefOf(path, scope.cwd, {
                start: doc.lineAt(sel.from).number,
                end: doc.lineAt(sel.to).number,
              }, text),
              rect.left - window.scrollX + (rect.right - rect.left) / 2,
              rect.top - window.scrollY,
            )
          }),
        ] : []),
      ],
    })
    const view = new CodeMirrorView({ state, parent: host })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
      themeCompRef.current = null
      minimapCompRef.current = null
    }
    // The keymap's save() reads live refs; scope/path are stable for a
    // tab's lifetime, and the dark flip is handled by the reconfigure
    // effect below (recreating the view here would drop the draft).
  }, [content, path])

  // IDEA-style git marks beside the line numbers (add / modify / delete).
  useEffect(() => {
    const view = viewRef.current
    if (view === null) return
    let cancelled = false
    const apply = (lines: readonly GutterLine[]): void => {
      if (cancelled || viewRef.current !== view) return
      view.dispatch({ effects: setGitGutter.of([...lines]) })
    }
    const allAdd = (): GutterLine[] => {
      const lines: GutterLine[] = []
      for (let line = 1; line <= view.state.doc.lines; line += 1) lines.push({ line, mark: 'add' })
      return lines
    }
    void (async () => {
      const target = await gitFileTarget(scope, absPath)
      const status = await api.gitStatus(target.scope)
      const file = absPath.replace(/\\/g, '/')
      const entry = status.entries.find(item => item.path === target.gitPath || item.path === path || file.endsWith(`/${item.path}`))
      if (entry !== undefined && badgeOf(entry) === '?') {
        apply(allAdd())
        return
      }
      const candidate = target.gitPath
      const unstaged = await api.gitDiff(target.scope, candidate, false).catch(() => ({ diff: '' }))
      const staged = unstaged.diff === ''
        ? await api.gitDiff(target.scope, candidate, true).catch(() => ({ diff: '' }))
        : unstaged
      const text = (staged.diff !== '' ? staged : unstaged).diff
      if (text !== '') {
        apply(gutterLinesOfDiff(text))
        return
      }
      const shown = await api.gitShow(target.scope, candidate, 'HEAD').catch(() => ({ content: null }))
      const current = view.state.doc.toString()
      if (shown.content === null) {
        apply([])
        return
      }
      apply(gutterLinesOfTexts(shown.content, current))
    })().catch(() => {
      apply([])
    })
    return () => { cancelled = true }
  }, [absPath, content, path, scope.sessionId, scope.cwd])

  // Scheme flip: re-theme in place (the compartment holds only the
  // scheme-dependent extensions; everything else is untouched).
  useEffect(() => {
    const view = viewRef.current
    const themeComp = themeCompRef.current
    if (view === null || themeComp === null) return
    view.dispatch({ effects: themeComp.reconfigure(dark) })
  }, [dark])

  // Side card "show minimap" toggle: reconfigure in place so undo/scroll
  // survive.
  const readMinimapOn = useCallback(
    () => props.store?.getPrefs().editorMinimap !== false,
    [props.store],
  )
  const minimapOn = useSyncExternalStore(
    useCallback((listener: () => void) => props.store?.subscribe(listener) ?? (() => {}), [props.store]),
    readMinimapOn,
    readMinimapOn,
  )
  useEffect(() => {
    const view = viewRef.current
    const minimapComp = minimapCompRef.current
    if (view !== null && minimapComp !== null) {
      view.dispatch({ effects: minimapComp.reconfigure(minimapExtensions(minimapOn)) })
    }
    const host = hostRef.current
    if (host === null) return
    const apply = (): void => { syncMinimapInset(host, minimapOn) }
    apply()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(apply)
    observer?.observe(host)
    const gutter = host.querySelector('.cm-minimap-gutter')
    if (gutter instanceof HTMLElement) observer?.observe(gutter)
    return () => { observer?.disconnect() }
  }, [minimapOn])

  // The editor may have been display:none while previewing; re-measure when
  // it becomes visible again (CodeMirror sizes itself on reveal). A mode
  // flip also invalidates any anchored selection popup.
  useEffect(() => {
    hidePopup()
    const view = viewRef.current
    if (mode === 'edit') view?.requestMeasure()
    if (mode === 'edit' && reveal !== null && view !== null) {
      view.dispatch({ effects: setRevealEffect.of(reveal) })
    }
  }, [mode, reveal])



  /** Composer chip click: jump to the requested span and mark it. */
  useEffect(() => {
    const apply = (): void => {
      if (content === undefined && viewRef.current === null) return
      const range = takeReveal(path)
      if (range === undefined) return
      setReveal(range)
      if (viewerId === 'html') pickMode('edit')
      const go = (): void => {
        const view = viewRef.current
        if (view === null) {
          window.requestAnimationFrame(go)
          return
        }
        const { from, to } = clampReveal(view.state.doc, range)
        view.dispatch({
          selection: { anchor: from, head: to },
          effects: [
            setRevealEffect.of(range),
            CodeMirrorView.scrollIntoView(from, { y: 'center' }),
          ],
        })
        view.focus()
      }
      window.requestAnimationFrame(go)
    }
    apply()
    return subscribeReveal(apply)
  }, [path, content, viewerId])

  useEffect(() => {
    if (reveal === null || mode !== 'preview' || viewerId !== 'markdown') return
    const host = mdRef.current
    if (host === null) return
    const existing = host.querySelector('mark[data-dsh-reveal]')
    if (existing !== null) {
      existing.scrollIntoView({ block: 'center' })
      return
    }
    const snippet = reveal.selected?.trim()
    if (snippet === undefined || snippet === '') return
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node !== null) {
      const text = node.textContent ?? ''
      const at = text.indexOf(snippet)
      if (at !== -1) {
        try {
          const marked = document.createElement('mark')
          marked.dataset.dshReveal = ''
          const range = document.createRange()
          range.setStart(node, at)
          range.setEnd(node, at + snippet.length)
          range.surroundContents(marked)
          marked.scrollIntoView({ block: 'center' })
        } catch {
          // Snippet crossed an element boundary — skip the preview mark.
        }
        return
      }
      node = walker.nextNode()
    }
  }, [reveal, mode, viewerId, content])

  useEffect(() => {
    if (mode !== 'preview' || viewerId !== 'markdown') return
    const host = mdRef.current
    if (host === null) return
    const saved = previewScrollOf(scope.sessionId, path)
    if (saved !== undefined) {
      host.scrollTop = saved.top
      host.scrollLeft = saved.left
    }
    const onScroll = (): void => {
      rememberPreviewScroll(scope.sessionId, path, { top: host.scrollTop, left: host.scrollLeft })
    }
    host.addEventListener('scroll', onScroll, { passive: true })
    return () => { host.removeEventListener('scroll', onScroll) }
  }, [mode, viewerId, path, scope.sessionId, content])

  useEffect(() => {
    if (viewerId !== 'html') return
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== htmlRef.current?.contentWindow) return
      const pos = parseHtmlScrollMessage(event.data)
      if (pos === undefined) return
      // Chat hide resets iframe scroll to 0 and would wipe the saved offset.
      if (!paneVisible || restoringHtmlScroll.current) return
      rememberPreviewScroll(scope.sessionId, path, pos)
    }
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage) }
  }, [viewerId, path, scope.sessionId, paneVisible])

  useEffect(() => {
    if (viewerId !== 'html' || mode !== 'preview' || !paneVisible) return
    const pos = previewScrollOf(scope.sessionId, path)
    if (pos === undefined) return
    restoringHtmlScroll.current = true
    const restore = (): void => {
      htmlRef.current?.contentWindow?.postMessage(htmlScrollRestoreMessage(pos), '*')
    }
    restore()
    const timers = [16, 50, 120, 250].map(ms => window.setTimeout(restore, ms))
    const done = window.setTimeout(() => { restoringHtmlScroll.current = false }, 400)
    return () => {
      for (const id of timers) window.clearTimeout(id)
      window.clearTimeout(done)
      restoringHtmlScroll.current = false
    }
  }, [viewerId, mode, paneVisible, path, scope.sessionId])

  const save = (): void => {
    const view = viewRef.current
    if (view === null || savingRef.current) return
    savingRef.current = true
    setSaveState('saving')
    api.fsWrite(scope, path, view.state.doc.toString()).then(() => {
      savingRef.current = false
      setDraft(null)
      setDirty(false)
      setSaveState('saved')
    }).catch(() => {
      savingRef.current = false
      setSaveState('failed')
    })
  }

  const markdown = viewerId === 'markdown'
  const html = viewerId === 'html'

  /**
   * Selection popup for the markdown preview: a mouse-up inside the preview
   * container anchors the floating "add to conversation" button above the
   * selection. Line numbers come from a best-effort reverse-search of the
   * selected text in the source ({@link linesOfSelection} — an ambiguous or
   * missing hit omits them). The button's own mousedown preventDefaults so
   * the selection survives until the click commits.
   */
  const handlePreviewMouseUp = (): void => {
    const sel = window.getSelection()
    if (sel === null || sel.isCollapsed || sel.anchorNode === null || sel.focusNode === null) {
      hidePopup()
      return
    }
    const host = mdRef.current
    if (host === null || !host.contains(sel.anchorNode) || !host.contains(sel.focusNode)) {
      hidePopup()
      return
    }
    const text = sel.toString()
    if (text.trim() === '') {
      hidePopup()
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    const lines = linesOfSelection(draft ?? content ?? '', text)
    showPopup(
      fileRefOf(path, scope.cwd, lines ?? undefined, text),
      rect.left + rect.width / 2,
      rect.top,
    )
  }
  const editable = content !== undefined
  const saveLabel = saveState === 'saving' ? t('loading') : saveState === 'saved' ? t('saved') : saveState === 'failed' ? t('saveFailed') : ''
  // Per-feature sandbox escape hatch: the global side card setting (warned)
  // plus a per-surface temporary unlock. The unlock state starts at the
  // "default unsafe" pref so a preview can open straight into the red
  // unsandboxed state (still restorable from the status row). With the
  // sandbox OFF the preview iframe drops its sandbox attribute entirely —
  // the previewed page then runs on the GUI's own origin with full session
  // access.
  const [localUnlock, setLocalUnlock] = useState(() => props.store?.getPrefs().htmlViewerDefaultUnsafe === true)
  const htmlNoSandbox = props.store?.getPrefs().htmlViewerNoSandbox === true || localUnlock

  return (
    <>
      <div className={css.editorHeader}>
        {(markdown || html) && (
          <div className={css.editorModeToggle}>
            <button
              type="button"
              className={clsx(css.editorModeButton, mode === 'preview' && css.editorModeActive)}
              onClick={() => { pickMode('preview') }}
            >
              {t('preview')}
            </button>
            <button
              type="button"
              className={clsx(css.editorModeButton, mode === 'edit' && css.editorModeActive)}
              onClick={() => { pickMode('edit') }}
            >
              {t('edit')}
            </button>
          </div>
        )}
        {dirty && <span className={css.dirtyDot} title={t('unsaved')} />}
        {editable && dirty && (
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('save')}
            title={`${t('save')} (Ctrl/Cmd+S)`}
            onClick={save}
          >
            <IconCheckOutline16 />
          </button>
        )}
        {saveLabel !== '' && <span className={clsx(css.editorStatus, saveState === 'failed' && css.editorStatusError)}>{saveLabel}</span>}
      </div>
      {editable && (
        <>
          {truncated === true && mode === 'edit' && <div className={css.editorBanner}>{t('truncation')}</div>}
          <div
            className={clsx(css.editorCm, (markdown || html) && mode === 'preview' && css.editorCmHidden)}
            ref={hostRef}
            onCopy={(event) => {
              const current = popupRef.current
              if (current === null) return
              writeFileRefClipboard(event.nativeEvent, current.ref)
            }}
          />
        </>
      )}
      {markdown && mode === 'preview' && (
        <div
          className={css.editorMd}
          ref={mdRef}
          onMouseUp={handlePreviewMouseUp}
          onScroll={hidePopup}
          onCopy={(event) => {
            const current = popupRef.current
            if (current === null) return
            writeFileRefClipboard(event.nativeEvent, current.ref)
          }}
        >
          {/* The fence copy-button labels must come from this plugin's own
              dictionary: the DSH MarkdownText/CodeBlock are cordis-free and
              fall back to hardcoded Chinese otherwise (same pattern as the
              chat's AssistantMarkdown). Render-time t() keeps them following
              the active locale on live switches. */}
          <MarkdownText
            text={draft ?? content ?? ''}
            codeLabels={{ copyLabel: t('copy'), copiedLabel: t('copied') }}
          />
        </div>
      )}
      {html && mode === 'preview' && (
        <>
          <SandboxStatusBar
            sandboxed={!htmlNoSandbox}
            local={localUnlock}
            dangerCopy={t('htmlNoSandboxWarning')}
            onUnlock={() => { setLocalUnlock(true) }}
            onRestore={() => { setLocalUnlock(false) }}
          />
          {/* Route-src (never srcdoc — a srcdoc frame inherits the parent
              origin when unsandboxed; the route URL keeps the frame
              cross-origin by construction). The preview shows the SAVED
              file; the draft is only visible in edit mode. */}
          <iframe
            ref={htmlRef}
            className={css.editorHtml}
            src={htmlPreviewSrc(scope, path, content)}
            sandbox={htmlNoSandbox ? undefined : HTML_IFRAME_SANDBOX}
            referrerPolicy="no-referrer"
            allow=""
            title={path}
            onLoad={() => {
              const pos = previewScrollOf(scope.sessionId, path)
              const win = htmlRef.current?.contentWindow
              if (pos === undefined || win === null || win === undefined) return
              win.postMessage(htmlScrollRestoreMessage(pos), '*')
            }}
          />
        </>
      )}
      {popup !== null && createPortal(
        <button
          type="button"
          className={css.selectionPopup}
          style={{ left: popup.left, top: popup.top }}
          // Keep the selection (and CodeMirror focus) alive until the click
          // commits — without this the popup unmounts before click lands.
          onMouseDown={(event) => { event.preventDefault() }}
          onClick={commitPopup}
        >
          {t('addToConversation')}
        </button>,
        document.body,
      )}
    </>
  )
}
