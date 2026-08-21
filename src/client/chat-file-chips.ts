/**
 * Sent file chips expand to fenced `path:lines` blocks. The user bubble is
 * plain text, so those fences stay ugly. Replace each fence with a pill that
 * opens the same file the composer chip would.
 */
import type { Context } from '../context-types.ts'
import { looksLikeFileAt, openFileRef } from './composer-file-drop.ts'
import { fileChipLabel, type FileRef } from './file-ref.ts'
import { isPluginDragActive } from './dom-sync.ts'
import css from './sidebar.module.css'

const FENCE = /```([^\n`]+):(\d+)(?:-(\d+))?\n[\s\S]*?```/g
const AT_TOKEN = /@[^\s]+/g

/** Host at-file-mention / folder drop: `@path` with a slash, a dot, or a line span. */
export function pathMentionOf(token: string): FileRef | null {
  return looksLikeFileAt(token)
}

export function parseSentFileFence(info: string, start: string, end?: string): FileRef | null {
  const path = info.trim()
  if (path === '') return null
  const from = Number(start)
  const to = end !== undefined ? Number(end) : from
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to < from) return null
  return { path, lines: { start: from, end: to } }
}

function splitAtMentions(text: string): { kind: 'text' | 'chip'; text?: string; ref?: FileRef }[] {
  const out: { kind: 'text' | 'chip'; text?: string; ref?: FileRef }[] = []
  let cursor = 0
  AT_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = AT_TOKEN.exec(text)) !== null) {
    const ref = pathMentionOf(match[0])
    if (ref === null) continue
    if (match.index > cursor) out.push({ kind: 'text', text: text.slice(cursor, match.index) })
    out.push({ kind: 'chip', ref })
    cursor = match.index + match[0].length
  }
  if (cursor === 0) return text === '' ? [] : [{ kind: 'text', text }]
  if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) })
  return out
}

export function splitUserFences(text: string): { kind: 'text' | 'chip'; text?: string; ref?: FileRef }[] {
  const out: { kind: 'text' | 'chip'; text?: string; ref?: FileRef }[] = []
  let cursor = 0
  FENCE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = FENCE.exec(text)) !== null) {
    const ref = parseSentFileFence(match[1] ?? '', match[2] ?? '', match[3])
    if (ref === null) continue
    if (match.index > cursor) out.push(...splitAtMentions(text.slice(cursor, match.index)))
    out.push({ kind: 'chip', ref })
    cursor = match.index + match[0].length
  }
  if (cursor === 0) {
    const mentions = splitAtMentions(text)
    return mentions.some(part => part.kind === 'chip') ? mentions : []
  }
  if (cursor < text.length) out.push(...splitAtMentions(text.slice(cursor)))
  return out
}

function decorateBubble(bubble: HTMLElement, sessionId: string, ctx: Context): void {
  if (bubble.querySelector('[data-dsh-chat-chip]')) return
  const source = bubble.textContent ?? ''
  const parts = splitUserFences(source)
  if (parts.length === 0) return
  bubble.replaceChildren()
  for (const part of parts) {
    if (part.kind === 'text' && part.text !== undefined && part.text !== '') {
      bubble.append(part.text)
      continue
    }
    if (part.ref === undefined) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.className = css.chatFileChip ?? ''
    button.dataset.dshChatChip = ''
    button.textContent = fileChipLabel(part.ref)
    const ref = part.ref
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      openFileRef(ctx, sessionId, ref)
    })
    bubble.append(button)
  }
}

export function registerChatFileChips(ctx: Context): () => void {
  let frame = 0
  const paint = (): void => {
    if (isPluginDragActive()) return
    const sessionId = ctx.sessions.list.getSnapshot().current
    if (sessionId === undefined) return
    for (const bubble of document.querySelectorAll<HTMLElement>('[data-time-hover-root] [class*="bubble"]')) {
      decorateBubble(bubble, sessionId, ctx)
    }
  }
  const schedule = (): void => {
    if (frame !== 0) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      paint()
    })
  }
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  schedule()
  return () => {
    observer.disconnect()
    if (frame !== 0) window.cancelAnimationFrame(frame)
  }
}
