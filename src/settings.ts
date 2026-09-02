import { App, PluginSettingTab, Setting } from "obsidian";
import type NabuPlugin from "./main";

export default interface NabuPluginSettings {
	sameFolderForLinkedNotes: boolean;
}

export const DEFAULT_SETTINGS: NabuPluginSettings = {
	sameFolderForLinkedNotes: false,
};

export class NabuPluginSettingTab extends PluginSettingTab {
	plugin: NabuPlugin;

	constructor(app: App, plugin: NabuPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Create linked notes in the same folder as their source note")
			.setDesc(
				"When you click a link to a note that doesn't exist yet, create it in the " +
					"same folder as the note you clicked the link from, instead of using the " +
					"vault's default new-note location.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.sameFolderForLinkedNotes).onChange(async (value) => {
					this.plugin.settings.sameFolderForLinkedNotes = value;
					await this.plugin.saveSettings();
				}),
			);

		containerEl.createEl("h3", { text: "Canvas hotkeys" });
		containerEl.createEl("p", {
			text:
				"The group-selection and rename-selection commands have no default hotkey. " +
				"Bind them under Settings → Hotkeys, search for \"Canvas Companion\".",
			cls: "setting-item-description",
		});
	}
}
