import type { Context } from '../context-types.ts';
import { type SidebarStore } from './state.ts';
export declare function centerViewId(tabId: string): string;
/** After a dock, click the matching conversation-view tab so the host strip lights it. */
export declare function focusLatestCenterView(title?: string): void;
/**
 * Keep one `conversation.view` entry per docked tab, plus a header drop pad.
 * Returns the disposer for the fiber.
 */
export declare function registerConversationViews(ctx: Context, store: SidebarStore): () => void;
