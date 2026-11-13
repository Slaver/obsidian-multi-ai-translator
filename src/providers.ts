import { Provider } from "./types";

export interface ProviderInfo {
	id: Provider;
	name: string;
	defaultModel: string;
	/** Suggested models; the user may also type any model ID. */
	models: string[];
	keyUrl: string;
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
	claude: {
		id: "claude",
		name: "Claude (Anthropic)",
		defaultModel: "claude-sonnet-5-5",
		models: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"],
		keyUrl: "https://console.anthropic.com/settings/keys",
	},
	gemini: {
		id: "gemini",
		name: "Gemini (Google)",
		defaultModel: "gemini-4-hydrogen",
		models: [
			"gemini-4-hydrogen",
			"gemini-4-argon",
			"gemini-4-carbon",
			"gemini-3.8-flash",
		],
		keyUrl: "https://aistudio.google.com/apikey",
	},
	openai: {
		id: "openai",
		name: "OpenAI",
		defaultModel: "gpt-6.1-terra",
		models: ["gpt-6.1-terra", "gpt-6.1-sol", "gpt-6-astra", "gpt-6-luna"],
		keyUrl: "https://platform.openai.com/api-keys",
	},
	deepseek: {
		id: "deepseek",
		name: "DeepSeek",
		defaultModel: "deepseek-flash",
		models: ["deepseek-flash", "deepseek-v4-pro"],
		keyUrl: "https://platform.deepseek.com/api_keys",
	},
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as Provider[];
