import { Editor, Menu, Plugin, TAbstractFile, TFile } from "obsidian";
import { L10nSettings } from "./types";
import { DEFAULT_SETTINGS, L10nSettingsTab } from "./settings";
import {
	translateActiveNote,
	translateSelection,
	translateSelectionToLastLanguage,
	translateToLastLanguage,
} from "./translator";
import { t } from "./i18n";

export default class L10nPlugin extends Plugin {
	settings: L10nSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("languages", t("ribbonTooltip"), () => {
			translateActiveNote(this);
		});

		this.addCommand({
			id: "translate-current-note",
			name: t("commandTranslateNote"),
			callback: () => {
				translateActiveNote(this);
			},
		});

		this.addCommand({
			id: "translate-to-last-language",
			name: t("commandTranslateToLast"),
			callback: () => {
				translateToLastLanguage(this);
			},
		});

		this.addCommand({
			id: "translate-selection",
			name: t("commandTranslateSelection"),
			editorCheckCallback: (checking: boolean, editor: Editor) => {
				if (!editor.somethingSelected()) return false;
				if (!checking) translateSelection(this, editor);
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu: Menu, abstractFile: TAbstractFile) => {
					if (!(abstractFile instanceof TFile)) return;
					menu.addItem((item) => {
						item.setTitle(t("menuTranslate"))
							.setIcon("languages")
							.onClick(() => {
								translateActiveNote(this, abstractFile);
							});
					});
				},
			),
		);

		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu: Menu, abstractFile: TAbstractFile) => {
					if (!(abstractFile instanceof TFile)) return;
					menu.addItem((item) => {
						item.setTitle(t("menuTranslateToLast"))
							.setIcon("languages")
							.onClick(() => {
								translateToLastLanguage(this, abstractFile);
							});
					});
				},
			),
		);

		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu: Menu, editor: Editor) => {
					const hasSelection = editor.somethingSelected();
					menu.addItem((item) => {
						item.setTitle(
							hasSelection
								? t("menuTranslateSelectionToLast")
								: t("menuTranslateToLast"),
						)
							.setIcon("languages")
							.onClick(() => {
								if (hasSelection) {
									translateSelectionToLastLanguage(
										this,
										editor,
									);
								} else {
									translateToLastLanguage(this);
								}
							});
					});
				},
			),
		);

		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu: Menu, editor: Editor) => {
					const hasSelection = editor.somethingSelected();
					menu.addItem((item) => {
						item.setTitle(
							hasSelection
								? t("menuTranslateSelection")
								: t("menuTranslate"),
						)
							.setIcon("languages")
							.onClick(() => {
								if (hasSelection) {
									translateSelection(this, editor);
								} else {
									translateActiveNote(this);
								}
							});
					});
				},
			),
		);

		this.addSettingTab(new L10nSettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		const saved = ((await this.loadData()) ?? {}) as Partial<L10nSettings>;
		this.settings = {
			...DEFAULT_SETTINGS,
			...saved,
			models: { ...DEFAULT_SETTINGS.models, ...saved.models },
			apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...saved.apiKeys },
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
