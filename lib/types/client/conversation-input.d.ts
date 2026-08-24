/**
 * Resolve the session composer input through `ctx.get('conversation')`.
 * Kept off `conversation-draft.ts` so caret/layout can read the snapshot
 * without a cycle through `document.querySelector`.
 */
import type { Context, SidebarSessionInput } from '../context-types.ts';
export declare function sessionInput(ctx: Context, sessionId: string): SidebarSessionInput | undefined;
