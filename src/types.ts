import type { App } from "obsidian";

export interface Language {
	code: string;
	name: string;
}

export type OutputBehavior = "new-note" | "replace" | "append";

export type Provider = "claude" | "gemini" | "openai" | "deepseek";

export interface PluginSettings {
	provider: Provider;
	/** Selected model per provider. */
	models: Record<Provider, string>;
	/** API key per provider. */
	apiKeys: Record<Provider, string>;
	outputBehavior: OutputBehavior;
	translateFrontmatter: boolean;
	lastLanguage?: Language;
}

export interface PluginWithSettings {
	app: App;
	settings: PluginSettings;
	saveSettings(): Promise<void>;
}
