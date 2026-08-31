import { describe, expect, it } from 'vitest'
import { pendingEdits } from '../src/client/review/review-filter.ts'
import { setReviewDecision } from '../src/client/review/review-store.ts'
import { sessionKindByPath } from '../src/client/git-status-style.ts'
import type { SessionEdit } from '../src/client/review/review-model.ts'

const edit: SessionEdit = {
  path: '/work/proj/src/client/api.ts',
  kind: 'edit',
  turn: 1,
  seq: 1,
  prompt: 'x',
}

describe('pendingEdits after Keep', () => {
  it('drops a kept file so explorer session color does not stick', () => {
    const sessionId = `keep-color-${Date.now()}`
    expect(pendingEdits(sessionId, [edit])).toEqual([edit])
    setReviewDecision(sessionId, edit.path, 'kept', edit)
    const pending = pendingEdits(sessionId, [edit])
    expect(pending).toEqual([])
    expect(sessionKindByPath('/work/proj', pending).get(edit.path)).toBeUndefined()
    expect(sessionKindByPath('/work/proj', pending).get('/work/proj/src/client')).toBeUndefined()
  })
})
