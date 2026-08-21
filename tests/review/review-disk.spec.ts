import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../../src/index.ts'
import { pickReviewDocument } from '../../src/client/review/index.ts'
import {
  emptyReviewDocument,
  parseReviewDocument,
  readReviewDocument,
  reviewFilePath,
  writeReviewDocument,
} from '../../src/review/index.ts'
import type { SidebarWebRoute } from '../../src/context-types.ts'

describe('review disk path', () => {
  it('puts review.json next to the session log', () => {
    expect(reviewFilePath(
      '/tmp/sessions',
      '/Users/laiweibin/work/workSoftware/dhs-plugins',
      'session-edd31b4a-43ab-40ee-9d1c-20b30693decb',
    )).toBe(join(
      '/tmp/sessions',
      '--Users-laiweibin-work-workSoftware-dhs-plugins--',
      'session-edd31b4a-43ab-40ee-9d1c-20b30693decb',
      'review.json',
    ))
  })
})

describe('review document parse / disk', () => {
  let root = ''

  afterEach(async () => {
    if (root !== '') await rm(root, { recursive: true, force: true })
    root = ''
  })

  it('treats a missing file as an empty document', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-review-'))
    expect(await readReviewDocument(join(root, 'missing.json'))).toEqual(emptyReviewDocument())
  })

  it('writes and reads Keep / Undo rows', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-review-'))
    const cwd = '/Users/laiweibin/work/workSoftware/dhs-plugins'
    const id = 'session-edd31b4a-43ab-40ee-9d1c-20b30693decb'
    const path = reviewFilePath(root, cwd, id)
    await mkdir(join(path, '..'), { recursive: true })
    const doc = {
      decisions: { '/work/a.ts': 'kept' as const },
      seen: { '/work/a.ts': '1:2:edit' },
      hunks: { '/work/a.ts\th1': 'undone' as const },
      touchedAt: 9,
    }
    await writeReviewDocument(path, doc)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(doc)
    expect(await readReviewDocument(path)).toEqual(doc)
  })

  it('drops malformed fields instead of crashing', () => {
    expect(parseReviewDocument({ decisions: 'nope', seen: { a: 1 }, hunks: null, touchedAt: 'x' })).toEqual(
      emptyReviewDocument(),
    )
  })

  it('migrates a leftover browser copy onto an empty disk file', () => {
    const local = {
      decisions: { '/a.ts': 'kept' as const },
      seen: { '/a.ts': '1:1:edit' },
      hunks: {},
      touchedAt: 2,
    }
    expect(pickReviewDocument(emptyReviewDocument(), local)).toEqual({ document: local, migrate: true })
    expect(pickReviewDocument(local, emptyReviewDocument())).toEqual({ document: local, migrate: false })
  })
})

describe('review.get / review.put host routes', () => {
  let root = ''

  afterEach(async () => {
    if (root !== '') await rm(root, { recursive: true, force: true })
    root = ''
    delete process.env.DSH_SESSIONS_ROOT
  })

  async function invoke(method: string, payload: unknown): Promise<{
    ok: boolean
    value?: unknown
    error?: { code?: string; message: string }
  }> {
    const routes: SidebarWebRoute[] = []
    apply({
      webRuntime: { trustedHosts: [] },
      webServer: {
        register: (route: SidebarWebRoute) => { routes.push(route); return () => {} },
        registerUpgrade: () => () => {},
      },
      sessions: { get: () => undefined },
      tools: { register: () => () => {} },
      effect: (fn: () => void | (() => void)) => { fn() },
      inject: () => () => {},
      get: () => undefined,
    } as never)
    const route = routes.find(item => item.path === '/sidebar/api')!
    const body = Buffer.from(JSON.stringify(payload))
    const req = {
      method: 'POST',
      url: `/sidebar/api/${method}`,
      headers: { host: '127.0.0.1:3080' },
      [Symbol.asyncIterator]: async function* () { yield body },
    } as never
    const out = { body: '' }
    const res = {
      writeHead: () => {},
      end: (chunk: unknown) => { out.body += String(chunk ?? '') },
    } as never
    await route.handler(req, res)
    return JSON.parse(out.body) as { ok: boolean; value?: unknown; error?: { code?: string; message: string } }
  }

  it('writes Keep / Undo into the session review.json via review.put', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-review-sessions-'))
    process.env.DSH_SESSIONS_ROOT = root
    const cwd = '/Users/laiweibin/work/workSoftware/dhs-plugins'
    const sessionId = 'session-review-put-probe'
    const document = {
      decisions: { '/work/kept.ts': 'kept' as const },
      seen: { '/work/kept.ts': '1:1:edit' },
      hunks: {},
      touchedAt: 42,
    }
    const put = await invoke('review.put', { sessionId, cwd, document })
    expect(put.ok).toBe(true)
    expect(put.value).toEqual(document)
    expect(JSON.parse(await readFile(reviewFilePath(root, cwd, sessionId), 'utf8'))).toEqual(document)
    const get = await invoke('review.get', { sessionId, cwd })
    expect(get.ok).toBe(true)
    expect(get.value).toEqual(document)
  })
})
