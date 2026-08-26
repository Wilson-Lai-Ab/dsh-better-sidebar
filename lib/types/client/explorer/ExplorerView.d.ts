import { type GitRepoInfo } from '../api.ts';
import type { SidebarStore } from '../state.ts';
export declare function ExplorerView(props: {
    sessionId: string;
    cwd: string | undefined;
    store?: SidebarStore;
    expanded: string[];
    onToggle: (path: string) => void;
    onOpenFile: (path: string) => void;
    /** Double-click: dock the file onto the conversation header. */
    onOpenFileAbove?: (path: string) => void;
    /** Insert a file chip into the composer draft. */
    onReferenceFile: (path: string) => void;
    /** Open a bottom-panel terminal at this directory. */
    onOpenTerminal?: (dir: string) => void;
    /** Open the Git panel focused on this path's work tree. */
    onOpenGit?: (path: string, isDir: boolean, repos: GitRepoInfo[]) => void;
    /** Open the sidebar browser tab at this GUI-origin URL. */
    onOpenPluginBrowser?: (href: string) => void;
}): import("react").JSX.Element;
