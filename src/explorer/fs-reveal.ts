/**
 * OS file-manager "reveal this path" argv. Pure so tests pin the command
 * without spawning Finder / Explorer. The host route runs the result.
 */
import { dirname } from 'node:path'

export interface RevealCommand {
  cmd: string
  args: string[]
}

/**
 * The spawn argv that reveals `path` in the platform file manager.
 * @param platform - process.platform (injectable for tests).
 * @param path - absolute file or directory.
 * @param isDir - whether `path` is a directory (Linux opens the dir itself;
 *   files open the parent folder).
 */
export function revealCommand(
  platform: NodeJS.Platform,
  path: string,
  isDir: boolean,
): RevealCommand {
  if (platform === 'darwin') return { cmd: 'open', args: ['-R', path] }
  if (platform === 'win32') return { cmd: 'explorer', args: [`/select,${path}`] }
  return { cmd: 'xdg-open', args: [isDir ? path : dirname(path)] }
}
