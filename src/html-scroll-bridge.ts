/**
 * HTML preview scroll bridge. The preview iframe is sandboxed without
 * allow-same-origin, so the parent cannot read iframe.scrollY. The html
 * route injects a tiny script that postMessages scroll to the parent and
 * restores on command — that is the only way 对话 ↔ file tab keeps the
 * HTML preview offset.
 */
export const HTML_SCROLL_SOURCE = 'dsh-better-sidebar:html-scroll'

export type HtmlScrollPos = { top: number; left: number }

const MARK = 'data-dsh-html-scroll'

/** Inline listener injected into previewed HTML documents. */
export function htmlScrollBridgeScript(): string {
  return `<script ${MARK}="1">(function(){var s=${JSON.stringify(HTML_SCROLL_SOURCE)};function p(){return{top:window.scrollY||document.documentElement.scrollTop||0,left:window.scrollX||document.documentElement.scrollLeft||0}}function send(){try{parent.postMessage({source:s,type:"scroll",top:p().top,left:p().left},"*")}catch(e){}}var t=false;window.addEventListener("scroll",function(){if(t)return;t=true;requestAnimationFrame(function(){t=false;send()})},{passive:true});window.addEventListener("message",function(ev){var d=ev.data;if(!d||d.source!==s||d.type!=="restore")return;window.scrollTo(Number(d.left)||0,Number(d.top)||0)});send()})();</script>`
}

export function injectHtmlScrollBridge(html: string): string {
  if (html.includes(MARK)) return html
  const script = htmlScrollBridgeScript()
  const lower = html.toLowerCase()
  const head = lower.lastIndexOf('</head>')
  if (head !== -1) return `${html.slice(0, head)}${script}${html.slice(head)}`
  const body = lower.lastIndexOf('</body>')
  if (body !== -1) return `${html.slice(0, body)}${script}${html.slice(body)}`
  return `${html}${script}`
}

export function parseHtmlScrollMessage(data: unknown): HtmlScrollPos | undefined {
  if (data === null || typeof data !== 'object') return undefined
  const record = data as { source?: unknown; type?: unknown; top?: unknown; left?: unknown }
  if (record.source !== HTML_SCROLL_SOURCE || record.type !== 'scroll') return undefined
  const top = typeof record.top === 'number' && Number.isFinite(record.top) ? record.top : undefined
  const left = typeof record.left === 'number' && Number.isFinite(record.left) ? record.left : undefined
  if (top === undefined || left === undefined) return undefined
  return { top, left }
}

export function htmlScrollRestoreMessage(pos: HtmlScrollPos): { source: string; type: 'restore'; top: number; left: number } {
  return { source: HTML_SCROLL_SOURCE, type: 'restore', top: pos.top, left: pos.left }
}
