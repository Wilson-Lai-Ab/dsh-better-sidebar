export interface RevealCommand {
    cmd: string;
    args: string[];
}
/**
 * The spawn argv that reveals `path` in the platform file manager.
 * @param platform - process.platform (injectable for tests).
 * @param path - absolute file or directory.
 * @param isDir - whether `path` is a directory (Linux opens the dir itself;
 *   files open the parent folder).
 */
export declare function revealCommand(platform: NodeJS.Platform, path: string, isDir: boolean): RevealCommand;
