import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
	SettingGroupItem,
} from "obsidian";
import { L10nSettings, OutputBehavior, PluginWithSettings, Provider } from "./types";
import { PROVIDERS, PROVIDER_IDS } from "./providers";
import { TranslationService } from "./TranslationService";
import { t } from "./i18n";

export type { L10nSettings };

export function defaultModels(): Record<Provider, string> {
	return Object.fromEntries(
		PROVIDER_IDS.map((id) => [id, PROVIDERS[id].defaultModel]),
	) as Record<Provider, string>;
}

export const DEFAULT_SETTINGS: L10nSettings = {
	provider: "claude",
	models: defaultModels(),
	apiKeys: { claude: "", gemini: "", openai: "", deepseek: "" },
	outputBehavior: "new-note",
	translateFrontmatter: false,
};

export class L10nSettingsTab extends PluginSettingTab {
	plugin: PluginWithSettings;

	/** Models fetched from provider APIs this session, per provider. */
	private fetched: Partial<Record<Provider, string[]>> = {};

	constructor(app: App, plugin: Plugin & PluginWithSettings) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private get provider(): Provider {
		return this.plugin.settings.provider;
	}

	/** Declarative definitions used by Obsidian 1.13.0 and later. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		// Model and key rows of the active provider only; they sit right
		// under the provider dropdown and swap when it changes.
		const providerItems: SettingGroupItem[] = PROVIDER_IDS.flatMap(
			(id) => [
				{
					name: t("settingModelName"),
					desc: t("settingModelDesc"),
					visible: () => this.provider === id,
					render: (s: Setting) => this.buildModel(s, id),
				},
				{
					name: t("settingApiKeyName"),
					desc: this.apiKeyDesc(id),
					visible: () => this.provider === id,
					render: (s: Setting) => this.buildApiKey(s, id),
				},
			],
		);
		return [
			{
				type: "group",
				heading: t("settingHeading"),
				items: [
					{
						name: t("settingProviderName"),
						desc: t("settingProviderDesc"),
						render: (s: Setting) => this.buildProvider(s),
					},
					...providerItems,
					{
						name: t("settingOutputName"),
						desc: t("settingOutputDesc"),
						control: {
							type: "dropdown",
							key: "outputBehavior",
							defaultValue: DEFAULT_SETTINGS.outputBehavior,
							options: this.outputOptions(),
						},
					},
					{
						name: t("settingFrontmatterName"),
						desc: t("settingFrontmatterDesc"),
						control: {
							type: "toggle",
							key: "translateFrontmatter",
							defaultValue: DEFAULT_SETTINGS.translateFrontmatter,
						},
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof L10nSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		switch (key) {
			case "outputBehavior":
				this.plugin.settings.outputBehavior = value as OutputBehavior;
				break;
			case "translateFrontmatter":
				this.plugin.settings.translateFrontmatter = value as boolean;
				break;
			default:
				return;
		}
		await this.plugin.saveSettings();
	}

	/** Imperative fallback for Obsidian versions older than 1.13.0. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName(t("settingHeading")).setHeading();

		this.buildProvider(
			new Setting(containerEl)
				.setName(t("settingProviderName"))
				.setDesc(t("settingProviderDesc")),
		);

		// One container per provider, directly under the dropdown.
		this.sections = {};
		for (const id of PROVIDER_IDS) {
			const section = containerEl.createDiv();
			this.buildModel(
				new Setting(section)
					.setName(t("settingModelName"))
					.setDesc(t("settingModelDesc")),
				id,
			);
			this.buildApiKey(
				new Setting(section)
					.setName(t("settingApiKeyName"))
					.setDesc(this.apiKeyDesc(id)),
				id,
			);
			this.sections[id] = section;
		}
		this.updateSections();

		new Setting(containerEl)
			.setName(t("settingOutputName"))
			.setDesc(t("settingOutputDesc"))
			.addDropdown((dd) => {
				dd.addOptions(this.outputOptions())
					.setValue(this.plugin.settings.outputBehavior)
					.onChange(async (v) => {
						this.plugin.settings.outputBehavior = v as OutputBehavior;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(t("settingFrontmatterName"))
			.setDesc(t("settingFrontmatterDesc"))
			.addToggle((tg) => {
				tg.setValue(this.plugin.settings.translateFrontmatter).onChange(
					async (v) => {
						this.plugin.settings.translateFrontmatter = v;
						await this.plugin.saveSettings();
					},
				);
			});
	}

	private sections: Partial<Record<Provider, HTMLElement>> = {};

	private updateSections(): void {
		for (const id of PROVIDER_IDS) {
			this.sections[id]?.toggle(id === this.provider);
		}
	}

	private outputOptions(): Record<string, string> {
		return {
			"new-note": t("settingOutputNewNote"),
			replace: t("settingOutputReplace"),
			append: t("settingOutputAppend"),
		};
	}

	private apiKeyDesc(id: Provider): DocumentFragment {
		const url = PROVIDERS[id].keyUrl;
		return createFragment((frag) => {
			frag.appendText(t("settingApiKeyDescPrefix"));
			frag.createEl("a", {
				text: url.replace(/^https?:\/\//, ""),
				href: url,
				attr: { target: "_blank", rel: "noopener noreferrer" },
			});
		});
	}

	/** Active provider dropdown. */
	private buildProvider(setting: Setting): void {
		setting.addDropdown((dd) => {
			for (const id of PROVIDER_IDS) dd.addOption(id, PROVIDERS[id].name);
			dd.setValue(this.provider).onChange(async (v) => {
				this.plugin.settings.provider = v as Provider;
				await this.plugin.saveSettings();
				this.updateSections();
				(this as { refreshDomState?: () => void }).refreshDomState?.();
			});
		});
	}

	/** Model text field with suggestions, reset and fetch-from-API buttons. */
	private buildModel(setting: Setting, id: Provider): void {
		const info = PROVIDERS[id];
		const listId = `ai-translator-models-${id}`;
		let input: HTMLInputElement | null = null;

		const fillList = (list: HTMLDataListElement) => {
			list.empty();
			const all = new Set([...info.models, ...(this.fetched[id] ?? [])]);
			for (const m of all) list.createEl("option", { value: m });
		};

		setting.addText((text) => {
			input = text.inputEl;
			text.setPlaceholder(info.defaultModel)
				.setValue(this.plugin.settings.models[id])
				.onChange(async (v) => {
					this.plugin.settings.models[id] = v.trim() || info.defaultModel;
					await this.plugin.saveSettings();
				});
			text.inputEl.setAttr("list", listId);
			const list = setting.controlEl.createEl("datalist", { attr: { id: listId } });
			fillList(list);
			setting.addExtraButton((b) =>
				b
					.setIcon("rotate-ccw")
					.setTooltip(t("settingResetModel"))
					.onClick(async () => {
						this.plugin.settings.models[id] = info.defaultModel;
						await this.plugin.saveSettings();
						if (input) input.value = info.defaultModel;
					}),
			);
			setting.addButton((b) =>
				b.setButtonText(t("settingFetchModels")).onClick(async () => {
					const key = this.plugin.settings.apiKeys[id];
					if (!key) {
						new Notice(t("noticeSetApiKey", { name: info.name }));
						return;
					}
					try {
						const models = await TranslationService.listModels(id, key);
						this.fetched[id] = models.sort();
						fillList(list);
						new Notice(
							t("settingModelsFetched", { count: models.length }),
						);
					} catch {
						new Notice(t("settingModelsFetchFailed"));
					}
				}),
			);
		});
	}

	/** Masked API key input for the currently selected provider. */
	private buildApiKey(setting: Setting, id: Provider): void {
		setting.addText((text) => {
			text.inputEl.type = "password";
			text.setPlaceholder(t("settingApiKeyPlaceholder"))
				.setValue(this.plugin.settings.apiKeys[id])
				.onChange(async (v) => {
					this.plugin.settings.apiKeys[id] = v.trim();
					await this.plugin.saveSettings();
				});
		});
	}
}
