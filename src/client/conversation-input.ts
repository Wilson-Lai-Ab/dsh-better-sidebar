/**
 * Resolve the session composer input through `ctx.get('conversation')`.
 * Kept off `conversation-draft.ts` so caret/layout can read the snapshot
 * without a cycle through `document.querySelector`.
 */
import type { Context, SidebarConversation, SidebarSessionInput } from '../context-types.ts'

export function sessionInput(ctx: Context, sessionId: string): SidebarSessionInput | undefined {
  const actx = ctx.sessions.scope(sessionId)
  if (actx === undefined) return undefined
  const conversation = ctx.get('conversation') as SidebarConversation | undefined
  if (conversation === undefined) return undefined
  return conversation.input.for(actx)
}
