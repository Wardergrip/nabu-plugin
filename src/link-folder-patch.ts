import { App, PaneType, TFile, TFolder } from "obsidian";
import { around } from "monkey-around";
import type CanvasCompanionSettings from "./settings";

/**
 * `Workspace.openLinkText(linktext, sourcePath, newLeaf, openViewState)` is
 * the public, documented method Obsidian calls for every link click
 * (editor, canvas, backlinks - all of it), including links that point to a
 * note that doesn't exist yet. `sourcePath` is the path of the note the
 * link was clicked from.
 *
 * While the setting is on: if the link target doesn't exist yet, we create
 * it ourselves in the source note's folder and open it directly - instead
 * of letting Obsidian create it wherever the vault's default new-note
 * location says. If the target already exists, we hand off to the original
 * method untouched.
 */
export function patchLinkedNoteFolder(app: App, settings: CanvasCompanionSettings): () => void {
	return around(app.workspace, {
		openLinkText(next: typeof app.workspace.openLinkText) {
			return async function (
				this: typeof app.workspace,
				linktext: string,
				sourcePath: string,
				newLeaf?: PaneType | boolean,
				openViewState?: Parameters<typeof app.workspace.openLinkText>[3],
			): Promise<void> {
				if (!settings.sameFolderForLinkedNotes) {
					return next.call(this, linktext, sourcePath, newLeaf, openViewState);
				}

				const existing = app.metadataCache.getFirstLinkpathDest(linktext, sourcePath);
				if (existing) {
					return next.call(this, linktext, sourcePath, newLeaf, openViewState);
				}

				const sourceAbstract = app.vault.getAbstractFileByPath(sourcePath);
				const parent: TFolder =
					sourceAbstract instanceof TFile && sourceAbstract.parent
						? sourceAbstract.parent
						: app.vault.getRoot();

				const notePath = linktext.split("#")[0] ?? linktext;
				const filename = notePath.split("/").pop() || notePath;

				let file: TFile;
				try {
					file = await app.fileManager.createNewMarkdownFile(parent, filename, "");
				} catch (error) {
					return next.call(this, linktext, sourcePath, newLeaf, openViewState);
				}

				const leaf = app.workspace.getLeaf(newLeaf);
				await leaf.openFile(file, openViewState);
			};
		},
	});
}