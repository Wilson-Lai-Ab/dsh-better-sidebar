/**
 * `@` trigger source that owns file-reference chips. The composer serializes
 * each occurrence through this codec on send; without it, send is blocked.
 * Candidates stay empty — files enter via the explorer / selection popup /
 * drag, not the `@` menu.
 */
import type { Context } from '../context-types.ts'
import { FILE_SOURCE, fileClipboardText, decodeFileRef, serializeFileRef } from './file-ref.ts'

interface FileTriggerSource {
  trigger: '@'
  name: string
  order?: number
  candidates: () => Promise<readonly never[]>
  onPick: () => undefined
  codec: {
    clipboardText: (ref: string) => string
    serialize: (ref: string, signal: AbortSignal) => Promise<string>
  }
}

interface InputTriggerRegistry {
  registerSource: (source: FileTriggerSource) => () => void
}

export function registerFileTriggerSource(ctx: Context): () => void {
  const slash = ctx.get('inputTriggers') as InputTriggerRegistry | undefined
  if (slash === undefined || typeof slash.registerSource !== 'function') {
    return () => { /* no trigger pipeline in this composition */ }
  }
  const source: FileTriggerSource = {
    trigger: '@',
    name: FILE_SOURCE,
    order: 20,
    candidates: () => Promise.resolve([]),
    onPick: () => undefined,
    codec: {
      clipboardText: (raw) => {
        const ref = decodeFileRef(raw)
        return ref === null ? `@${raw}` : fileClipboardText(ref)
      },
      serialize: (raw, _signal) => Promise.resolve(serializeFileRef(raw)),
    },
  }
  return slash.registerSource(source)
}
