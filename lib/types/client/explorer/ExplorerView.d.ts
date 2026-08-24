export declare function ExplorerView(props: {
    sessionId: string;
    cwd: string | undefined;
    expanded: string[];
    onToggle: (path: string) => void;
    onOpenFile: (path: string) => void;
    /** Double-click: dock the file onto the conversation header. */
    onOpenFileAbove?: (path: string) => void;
    /** Insert a file chip into the composer draft. */
    onReferenceFile: (path: string) => void;
}): import("react").JSX.Element;
