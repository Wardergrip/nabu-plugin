import { App, TFile, TFolder } from "obsidian";
import type { FileManager } from "obsidian-typings";
import { around } from "monkey-around";
import type NabuPluginSettings from "./settings";

/**
 * `app.fileManager.createNewMarkdownFileFromLinktext(filename, sourcePath)` is
 * the (undocumented) method Obsidian calls when you click a link that points
 * to a note that doesn't exist yet. `sourcePath` is the path of the note the
 * link was clicked from. We patch it so that, while the setting is on, the
 * new note is created next to that source note instead of wherever the
 * vault's "default location for new notes" setting says.
 *
 * Only this specific creation path is patched - manually creating a note
 * (command palette, ribbon, etc.) is untouched.
 */
export function patchLinkedNoteFolder(app: App, settings: NabuPluginSettings): () => void {
	const fileManager = app.fileManager as unknown as FileManager;

	return around(fileManager, {
		createNewMarkdownFileFromLinktext(next: FileManager["createNewMarkdownFileFromLinktext"]) {
			return async function (
				this: FileManager,
				filename: string,
				sourcePath: string,
			): Promise<TFile> {
				if (!settings.sameFolderForLinkedNotes) {
					return next.call(this, filename, sourcePath);
				}

				const sourceAbstract = app.vault.getAbstractFileByPath(sourcePath);
				const parent: TFolder =
					sourceAbstract instanceof TFile && sourceAbstract.parent
						? sourceAbstract.parent
						: app.vault.getRoot();

				return this.createNewMarkdownFile(parent, filename, "");
			};
		},
	});
}
