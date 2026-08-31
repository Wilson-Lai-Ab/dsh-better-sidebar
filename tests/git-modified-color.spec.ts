import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(import.meta.dirname, '../src/client/sidebar.module.css'), 'utf8')
const gitModifiedRule = /\n\.gitModified\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''

describe('gitModified / review coloring', () => {
  it('uses the same business-primary blue as the git panel (no washed color-mix)', () => {
    expect(gitModifiedRule).toContain('--dsw-alias-state-business-primary')
    expect(gitModifiedRule).not.toContain('color-mix')
  })

  it('lets review name/path/badge beat the default gray via compound classes', () => {
    expect(css).toContain('.reviewPath.gitModified')
    expect(css).toContain('.reviewName.gitAdded')
    expect(css).toContain('.reviewKind.gitModified')
    expect(css).toMatch(/\.reviewName\.gitModified,\s*\n\.reviewPath\.gitModified,\s*\n\.reviewKind\.gitModified \{ color: var\(--dsw-alias-state-business-primary\)/)
  })
})
