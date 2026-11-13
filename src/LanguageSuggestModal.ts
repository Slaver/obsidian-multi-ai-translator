import { App, SuggestModal } from "obsidian";
import { Language } from "./types";
import { searchLanguages } from "./languages";
import { t } from "./i18n";

export class LanguageSuggestModal extends SuggestModal<Language> {
	private onSelect: (lang: Language) => void;
	private lastLanguage: Language | undefined;
	
	constructor(
		app: App,
		lastLanguage: Language | undefined,
		onSelect: (lang: Language) => void,
	) {
		super(app);
		this.lastLanguage = lastLanguage;
		this.onSelect = onSelect;
		this.setPlaceholder(
			lastLanguage
				? t("modalPlaceholderLastUsed", { name: lastLanguage.name })
				: t("modalPlaceholderDefault"),
		);
	}

	getSuggestions(query: string): Language[] {
		const found = searchLanguages(query);
		const last = this.lastLanguage;
		if (!last) return found;
		return [last, ...found.filter((l) => l.code !== last.code)];
	}

	renderSuggestion(lang: Language, el: HTMLElement): void {
		el.createSpan({
			text: t("modalSuggestion", { name: lang.name, code: lang.code }),
		});
		if (this.lastLanguage?.code === lang.code) {
			el.createSpan({
				text: t("modalLastUsedBadge"),
				cls: "ai-translator-last-used-badge",
			});
		}
	}

	onChooseSuggestion(lang: Language): void {
		this.onSelect(lang);
	}
}
