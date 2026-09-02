import "obsidian";

/**
 * Augments Obsidian's public `FileManager` type with a couple of methods
 * that exist at runtime but aren't part of the documented public API.
 * They're stable enough in practice (widely used by other community
 * plugins) but could change or disappear in a future Obsidian release.
 */
declare module "obsidian" {
	interface FileManager {
		/** @unofficial - creates a new Markdown file in the given folder. */
		createNewMarkdownFile(folder: TFolder, filename: string, contents?: string): Promise<TFile>;
		/** @unofficial - opens Obsidian's built-in rename prompt for a file. */
		promptForFileRename(file: TFile): Promise<void>;
	}
}