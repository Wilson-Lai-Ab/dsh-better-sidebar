/**
 * `pnpm install` from github: (dsh-idea-style on Windows) never installs
 * devDependencies, so `tsdown` is missing. Skip rebuild when the CLI is
 * absent — the committed lib/ is what those installs run.
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bin = resolve(root, 'node_modules/.bin', process.platform === 'win32' ? 'tsdown.cmd' : 'tsdown')
if (!existsSync(bin) && !existsSync(resolve(root, 'node_modules/tsdown'))) process.exit(0)
const result = spawnSync(bin, [], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status === null ? 1 : result.status)
