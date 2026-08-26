/**
 * Sidebar-browser seed URL for an explorer row. HTML files go through
 * /sidebar/html so relative assets resolve; everything else uses
 * /sidebar/file. Directories have no preview URL.
 */
import { encodeHtmlUrl } from '../../html-route.ts'

export function pluginBrowserHref(input: {
  origin: string
  sessionId: string
  cwd?: string
  path: string
  isDir: boolean
}): string | undefined {
  if (input.isDir) return undefined
  const origin = input.origin.replace(/\/+$/, '')
  const ext = input.path.split(/[\\/]/).pop()?.split('.').pop()?.toLowerCase()
  if (ext === 'html' || ext === 'htm') {
    return `${origin}${encodeHtmlUrl(input.sessionId, input.path)}`
  }
  const params = new URLSearchParams({ sessionId: input.sessionId, path: input.path })
  if (input.cwd !== undefined && input.cwd !== '') params.set('cwd', input.cwd)
  return `${origin}/sidebar/file?${params.toString()}`
}
