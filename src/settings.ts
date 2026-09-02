import { App, PluginSettingTab, Setting } from 'obsidian';
import NabuPlugin from './main';

export interface NabuPluginSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: NabuPluginSettings = {
	mySetting: 'default',
};

export class NabuSettingTab extends PluginSettingTab {
	plugin: NabuPlugin;

	constructor(app: App, plugin: NabuPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
