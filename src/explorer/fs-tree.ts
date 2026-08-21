/**
 * Single-level directory listing for the sidebar explorer. Streams the level
 * with opendir, sorts directories first then names (case-insensitive), and
 * marks POSIX-hidden entries (dot-prefixed) for dimmed display. Symlinks are
 * reported as files without probing their target — the explorer shows what
 * dirent says, keeping the read cheap for arbitrarily large levels.
 */
import { opendir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { SidebarError } from '../wire.ts'

/** One explorer row. */
export interface SidebarFsEntry {
  name: string
  path: string
  isDir: boolean
  hidden: boolean
}

/** One listed level. */
export interface SidebarFsListing {
  path: string
  entries: SidebarFsEntry[]
  truncated: boolean
}

/** Directory-first, case-insensitive name ordering (VSCode explorer order). */
export function compareEntries(a: SidebarFsEntry, b: SidebarFsEntry): number {
  if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

/**
 * List one directory level.
 * @param path - absolute directory path.
 * @param maxEntries - row bound of one level (extra rows flag `truncated`).
 * @returns the sorted listing.
 * @throws {SidebarError} fs-error when the level is unreadable or not a directory.
 */
export async function listDirectory(path: string, maxEntries = 1000): Promise<SidebarFsListing> {
  let level
  try {
    level = await opendir(path)
  } catch (error) {
    throw new SidebarError('fs-error', `cannot list "${path}": ${messageOf(error)}`, 400)
  }
  const rows: SidebarFsEntry[] = []
  let overflow = 0
  try {
    for await (const dirent of level) {
      if (rows.length >= maxEntries) {
        overflow += 1
        continue
      }
      rows.push({
        name: dirent.name,
        // Platform join: on Windows the level path uses '\' — a hardcoded '/'
        // would leak mixed separators into every row's path.
        path: join(path, dirent.name),
        isDir: dirent.isDirectory(),
        hidden: dirent.name.startsWith('.'),
      })
    }
  } catch (error) {
    throw new SidebarError('fs-error', `cannot list "${path}": ${messageOf(error)}`, 400)
  }
  rows.sort(compareEntries)
  return { path, entries: rows, truncated: overflow > 0 }
}

/** Stop walking a single-child chain after this many hops (symlink loops). */
const COMPACT_DEPTH = 32

/**
 * Collapse a directory that has exactly one subdirectory and nothing else
 * into one row (`src/main/java/com`) — same idea as the git path tree.
 * A folder with files or more than one child stays an expand point.
 */
export async function compactDirectoryEntry(
  entry: SidebarFsEntry,
  maxEntries = 1000,
): Promise<SidebarFsEntry> {
  if (!entry.isDir) return entry
  const names = [entry.name]
  let current = entry
  for (let depth = 0; depth < COMPACT_DEPTH; depth += 1) {
    let listing: SidebarFsListing
    try {
      listing = await listDirectory(current.path, maxEntries)
    } catch {
      break
    }
    if (listing.truncated || listing.entries.length !== 1) break
    const only = listing.entries[0]
    if (only === undefined || !only.isDir) break
    names.push(only.name)
    current = only
  }
  if (names.length === 1) return entry
  return { ...current, name: names.join('/') }
}

/** Compact every directory row in a listing (the explorer `fs.tree` path). */
export async function listDirectoryCompact(
  path: string,
  maxEntries = 1000,
): Promise<SidebarFsListing> {
  const listing = await listDirectory(path, maxEntries)
  if (listing.truncated) return listing
  const entries = await Promise.all(
    listing.entries.map(entry => compactDirectoryEntry(entry, maxEntries)),
  )
  return { ...listing, entries }
}

/** The root row label of a listing: the last path segment (or the full path at the filesystem root). */
export function rootLabel(path: string): string {
  const base = basename(path)
  return base !== '' ? base : path
}

/** Parent of a path, or undefined at the filesystem root (the explorer's "up" target). */
export function parentOf(path: string): string | undefined {
  const parent = dirname(path)
  return parent === path ? undefined : parent
}

/** Normalize a caller-supplied path to an absolute, resolved path or throw fs-error. */
export function requireAbsolute(path: string): string {
  if (!path.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(path)) {
    throw new SidebarError('fs-error', `"${path}" is not an absolute path`, 400)
  }
  return resolve(path)
}

/**
 * Whether `target` lies under `base` (or equals it), tolerant of separator
 * style and — on Windows, where the filesystem is case-insensitive — of
 * letter case. The media route uses this instead of a raw `startsWith` so a
 * case-mismatched or mixed-separator path can never be misclassified
 * (e.g. `C:\Users\Me` vs `c:/users/me/file.png`).
 * @param platform - filesystem semantics; injectable so both branches are
 * unit-testable on any host.
 */
export function isWithin(base: string, target: string, platform: NodeJS.Platform = process.platform): boolean {
  const norm = (value: string): string => value.replace(/[\\/]+/g, '/').replace(/\/$/, '')
  const b = norm(base)
  const t = norm(target)
  if (platform === 'win32') {
    const lb = b.toLowerCase()
    const lt = t.toLowerCase()
    return lt === lb || lt.startsWith(`${lb}/`)
  }
  return t === b || t.startsWith(`${b}/`)
}

/** Message text of an unknown thrown value. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
