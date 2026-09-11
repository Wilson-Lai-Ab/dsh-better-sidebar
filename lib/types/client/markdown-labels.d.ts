/**
 * Fence copy labels for DSH MarkdownText.
 *
 * DSH 0.1.0-rc.6 takes `codeLabels: { copyLabel, copiedLabel }`.
 * DSH 0.1.2 (the running GUI) takes `labels: { code: { copyLabel, copiedLabel } }`
 * and reads `labels.code.copyLabel` with no fallback — a missing `code`
 * throws `Cannot read properties of undefined (reading 'code')` on the
 * first fenced block. Pass both so either renderer works.
 */
export interface MarkdownFenceCopy {
    copyLabel: string;
    copiedLabel: string;
}
export declare function markdownTextLabelProps(copy: MarkdownFenceCopy, footnotes?: string): {
    codeLabels: MarkdownFenceCopy;
    labels: {
        code: MarkdownFenceCopy;
        footnotes: string;
    };
};
