import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
} from "obsidian";
import { L10nSettings, OutputBehavior, PluginWithSettings } from "./types";
import { TranslationService } from "./TranslationService";
import { t, localizeUrl, getLocale, URLS } from "./i18n";

export type { L10nSettings };

const TRIAL_CHARS = 10000;

export const DEFAULT_SETTINGS: L10nSettings = {
	apiKey: "",
	outputBehavior: "new-note",
	translateFrontmatter: false,
	generateGlossary: false,
};

export class L10nSettingsTab extends PluginSettingTab {
	plugin: PluginWithSettings;

	private quotaEl: HTMLElement | null = null;

	constructor(app: App, plugin: Plugin & PluginWithSettings) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Declarative definitions used by Obsidian 1.13.0 and later, which render
	 * the tab from these and index them for settings search. The API key and
	 * balance rows stay imperative: the former needs a masked input, the
	 * latter an asynchronously loaded value.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: "group",
				heading: t("settingHeading"),
				items: [
					{
						name: t("settingApiKeyName"),
						desc: this.apiKeyDesc(),
						render: (setting: Setting) => {
							this.buildApiKeyControl(setting);
						},
					},
					{
						name: t("settingBalanceName"),
						desc: t("settingBalanceDesc"),
						render: (setting: Setting) => {
							this.buildBalanceControl(setting);
						},
					},
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
					{
						name: t("settingGlossaryName"),
						desc: this.glossaryDesc(),
						control: {
							type: "toggle",
							key: "generateGlossary",
							defaultValue: DEFAULT_SETTINGS.generateGlossary,
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
			case "generateGlossary":
				this.plugin.settings.generateGlossary = value as boolean;
				break;
			default:
				return;
		}
		await this.plugin.saveSettings();
	}

	/**
	 * Imperative fallback for Obsidian versions older than 1.13.0. Bypassed
	 * once getSettingDefinitions() returns a non-empty array.
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName(t("settingHeading")).setHeading();

		const apiKeySetting = new Setting(containerEl)
			.setName(t("settingApiKeyName"))
			.setDesc(this.apiKeyDesc());
		this.buildApiKeyControl(apiKeySetting);

		const balanceSetting = new Setting(containerEl)
			.setName(t("settingBalanceName"))
			.setDesc(t("settingBalanceDesc"));
		this.buildBalanceControl(balanceSetting);

		new Setting(containerEl)
			.setName(t("settingOutputName"))
			.setDesc(t("settingOutputDesc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(this.outputOptions())
					.setValue(this.plugin.settings.outputBehavior)
					.onChange(async (value) => {
						this.plugin.settings.outputBehavior =
							value as OutputBehavior;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(t("settingFrontmatterName"))
			.setDesc(t("settingFrontmatterDesc"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.translateFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.translateFrontmatter = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(t("settingGlossaryName"))
			.setDesc(this.glossaryDesc())
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.generateGlossary)
					.onChange(async (value) => {
						this.plugin.settings.generateGlossary = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private outputOptions(): Record<string, string> {
		return {
			"new-note": t("settingOutputNewNote"),
			replace: t("settingOutputReplace"),
			append: t("settingOutputAppend"),
		};
	}

	private apiKeyDesc(): DocumentFragment {
		const url = localizeUrl(URLS.API_KEYS, getLocale());
		return createFragment((frag) => {
			frag.appendText(t("settingApiKeyDescPrefix"));
			frag.createEl("a", {
				text: url.replace(/^https?:\/\//, ""),
				href: url,
				attr: { target: "_blank", rel: "noopener noreferrer" },
			});
		});
	}

	private glossaryDesc(): DocumentFragment {
		return createFragment((frag) => {
			frag.appendText(t("settingGlossaryDesc"));
			frag.createEl("a", {
				text: t("settingGlossaryManageLink"),
				href: localizeUrl(URLS.GLOSSARY, getLocale()),
				attr: { target: "_blank", rel: "noopener noreferrer" },
				cls: "inline-link",
			});
			frag.createEl("a", {
				text: t("settingLinguisticLink"),
				href: localizeUrl(URLS.LINGUISTIC, getLocale()),
				attr: { target: "_blank", rel: "noopener noreferrer" },
				cls: "inline-link",
			});
		});
	}

	/** Masked API key input; refreshes the balance readout on every change. */
	private buildApiKeyControl(setting: Setting): void {
		setting.addText((text) => {
			text.inputEl.type = "password";
			text.setPlaceholder(t("settingApiKeyPlaceholder"))
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value.trim();
					await this.plugin.saveSettings();
					this.refreshBalance();
				});
		});
	}

	private buildBalanceControl(setting: Setting): void {
		setting.addButton((btn) => {
			btn.setButtonText(t("settingBalanceBuyBtn")).onClick(() => {
				window.open(localizeUrl(URLS.PRICING, getLocale()), "_blank");
			});
		});
		this.quotaEl = setting.descEl.createSpan({ text: "" });
		this.refreshBalance();
	}

	private refreshBalance(): void {
		const quotaEl = this.quotaEl;
		if (!quotaEl) return;

		const apiKey = this.plugin.settings.apiKey;
		if (!apiKey) {
			quotaEl.setText(
				t("settingBalanceTrial", {
					count: TRIAL_CHARS.toLocaleString(),
				}),
			);
			return;
		}

		quotaEl.setText(t("settingBalanceLoading"));
		TranslationService.getBalance(apiKey)
			.then((res) => {
				// A re-render may have replaced the element we started with.
				if (this.quotaEl !== quotaEl) return;
				quotaEl.setText(
					t("settingBalanceCount", {
						count: res.currentBalance.toLocaleString(),
					}),
				);
			})
			.catch(() => {
				if (this.quotaEl !== quotaEl) return;
				quotaEl.setText("");
			});
	}
}
