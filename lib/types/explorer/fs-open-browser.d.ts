/**
 * OS default-app "open this path" argv. Pure so tests pin the command
 * without spawning Safari / Edge. The host route runs the result.
 *
 * Unlike reveal (which selects the item in the file manager), this asks
 * the platform to open the path with its default handler — HTML files
 * land in the system browser.
 */
export interface OpenInBrowserCommand {
    cmd: string;
    args: string[];
}
/**
 * The spawn argv that opens `path` with the OS default application.
 * @param platform - process.platform (injectable for tests).
 * @param path - absolute file or directory.
 */
export declare function openInBrowserCommand(platform: NodeJS.Platform, path: string): OpenInBrowserCommand;
