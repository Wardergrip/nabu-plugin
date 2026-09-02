import { Notice, Plugin } from "obsidian";
import { getActiveCanvas, groupSelection, renameSelectedNode } from "./canvas";
import { patchLinkedNoteFolder } from "./link-folder-patch";
import NabuPluginSettings, {
	NabuPluginSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

export default class NabuPlugin extends Plugin {
	settings: NabuPluginSettings = DEFAULT_SETTINGS;
	private uninstallLinkFolderPatch: (() => void) | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new NabuPluginSettingTab(this.app, this));

		this.uninstallLinkFolderPatch = patchLinkedNoteFolder(this.app, this.settings);
		this.register(() => this.uninstallLinkFolderPatch?.());

		this.addCommand({
			id: "canvas-group-selection",
			name: "Canvas: Group selection",
			checkCallback: (checking) => {
				const canvas = getActiveCanvas(this.app);
				if (!canvas) return false;
				if (checking) return true;
				const grouped = groupSelection(canvas);
				if (!grouped) new Notice("Select at least one canvas element to group.");
				return true;
			},
		});

		this.addCommand({
			id: "canvas-rename-selection",
			name: "Canvas: Rename selected element",
			checkCallback: (checking) => {
				const canvas = getActiveCanvas(this.app);
				if (!canvas) return false;
				if (checking) return true;
				const renamed = renameSelectedNode(this.app, canvas);
				if (!renamed) {
					new Notice("Select a single file or attachment node to rename.");
				}
				return true;
			},
		});
	}

	async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as Partial<NabuPluginSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
