export interface SelectionRectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}
export interface SelectionPopupPositionOptions {
    viewportHeight: number;
    popupHeight: number;
    composerTop?: number;
    gap: number;
}
/** Place the selection action without entering the bottom composer area. */
export declare function selectionPopupPosition(rect: SelectionRectLike, options: SelectionPopupPositionOptions): {
    left: number;
    top: number;
};
