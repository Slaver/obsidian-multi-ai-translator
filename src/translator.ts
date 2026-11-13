import { Editor, EditorPosition, Notice, TFile } from "obsidian";
import { LanguageSuggestModal } from "./LanguageSuggestModal";
import { TranslationService } from "./TranslationService";
import { Language, PluginWithSettings } from "./types";
import { PROVIDERS } from "./providers";
import { t } from "./i18n";

const FRONTMATTER_REGEX = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/;

interface TranslationOptions {
	format: string;
}

interface SelectionRange {
	from: EditorPosition;
	to: EditorPosition;
}

function splitFrontmatter(
	content: string,
): { frontmatter: string; body: string } | null {
	const match = FRONTMATTER_REGEX.exec(content);
	if (!match) {
		return null;
	}
	return { frontmatter: match[1] ?? "", body: match[2] ?? "" };
}

function requireApiKey(plugin: PluginWithSettings): boolean {
	const { provider, apiKeys } = plugin.settings;
	if (!apiKeys[provider]) {
		new Notice(t("noticeSetApiKey", { name: PROVIDERS[provider].name }));
		return false;
	}
	return true;
}

/**
 * Calls the selected AI provider while showing a progress notice.
 * Returns null after showing the matching error notice on failure.
 */
async function requestTranslation(
	plugin: PluginWithSettings,
	sourceText: string,
	lang: Language,
	options: TranslationOptions,
): Promise<string | null> {
	const { provider, apiKeys, models } = plugin.settings;
	const info = PROVIDERS[provider];
	const progressNotice = new Notice(t("noticeTranslating"), 0);
	try {
		return await TranslationService.translate(
			{
				provider,
				apiKey: apiKeys[provider],
				model: models[provider] || info.defaultModel,
				text: sourceText,
				languageName: lang.name,
				languageCode: lang.code,
				format: options.format,
			},
			(done, total) => {
				if (total > 1) {
					progressNotice.setMessage(
						t("noticeTranslatingProgress", {
							done,
							total,
						}),
					);
				}
			},
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "";
		if (msg === "unauthorized") {
			new Notice(t("noticeInvalidKey", { name: info.name }));
		} else if (msg === "rate_limited") {
			new Notice(t("noticeRateLimited", { name: info.name }));
		} else if (msg.startsWith("api_error:")) {
			new Notice(
				t("noticeApiError", { detail: msg.slice("api_error:".length) }),
			);
		} else {
			new Notice(t("noticeTranslationFailed"));
		}
		return null;
	} finally {
		progressNotice.hide();
	}
}

async function doTranslate(
	plugin: PluginWithSettings,
	file: TFile,
	lang: Language,
): Promise<void> {
	let content: string;
	try {
		content = await plugin.app.vault.read(file);
	} catch {
		new Notice(t("noticeReadFailed"));
		return;
	}

	let sourceText = content;
	let frontmatter = "";
	if (!plugin.settings.translateFrontmatter) {
		const parsed = splitFrontmatter(content);
		if (parsed) {
			frontmatter = parsed.frontmatter;
			sourceText = parsed.body;
		}
	}

	const result = await requestTranslation(plugin, sourceText, lang, {
		format: file.extension ?? "md",
	});
	if (!result) {
		return;
	}

	const translated = result;
	const outputContent = frontmatter + translated;
	const { outputBehavior } = plugin.settings;

	try {
		if (outputBehavior === "replace") {
			await plugin.app.vault.modify(file, outputContent);
		} else if (outputBehavior === "append") {
			await plugin.app.vault.modify(
				file,
				content + "\n\n---\n\n" + translated,
			);
		} else {
			// new-note (default)
			const folder = file.parent ? file.parent.path : "";
			const newPath =
				(folder && folder !== "/" ? folder + "/" : "") +
				`${file.basename} (${lang.code}).md`;
			const existing = plugin.app.vault.getAbstractFileByPath(newPath);
			if (existing instanceof TFile) {
				await plugin.app.vault.modify(existing, outputContent);
			} else {
				await plugin.app.vault.create(newPath, outputContent);
			}
		}
	} catch {
		new Notice(t("noticeSaveFailed"));
		return;
	}

	new Notice(t("noticeTranslationComplete"));
}

/**
 * Translates a selection and replaces it in place. The output behavior
 * setting only applies to whole-note translation and is ignored here.
 */
async function doTranslateSelection(
	plugin: PluginWithSettings,
	editor: Editor,
	lang: Language,
	range: SelectionRange,
	sourceText: string,
): Promise<void> {
	const result = await requestTranslation(plugin, sourceText, lang, {
		format: plugin.app.workspace.getActiveFile()?.extension ?? "md",
	});
	if (!result) {
		return;
	}

	const translated = result;

	try {
		// The note may have been edited while the translation was in flight,
		// so only write when the captured text is still where we left it.
		if (editor.getRange(range.from, range.to) === sourceText) {
			editor.replaceRange(translated, range.from, range.to);
		} else if (editor.getSelection() === sourceText) {
			editor.replaceSelection(translated);
		} else {
			new Notice(t("noticeSelectionChanged"));
			return;
		}
	} catch {
		new Notice(t("noticeSaveFailed"));
		return;
	}

	new Notice(t("noticeTranslationComplete"));
}

export function translateActiveNote(
	plugin: PluginWithSettings,
	targetFile?: TFile,
): void {
	if (!requireApiKey(plugin)) {
		return;
	}

	const file = targetFile ?? plugin.app.workspace.getActiveFile();
	if (!file) {
		new Notice(t("noticeNoActiveNote"));
		return;
	}

	new LanguageSuggestModal(
		plugin.app,
		plugin.settings.lastLanguage,
		(lang) => {
			plugin.settings.lastLanguage = lang;
			void plugin.saveSettings();
			void doTranslate(plugin, file, lang);
		},
	).open();
}

export function translateToLastLanguage(
	plugin: PluginWithSettings,
	targetFile?: TFile,
): void {
	const lang = plugin.settings.lastLanguage;
	if (!lang) {
		return translateActiveNote(plugin, targetFile);
	}

	if (!requireApiKey(plugin)) {
		return;
	}

	const file = targetFile ?? plugin.app.workspace.getActiveFile();
	if (!file) {
		new Notice(t("noticeNoActiveNote"));
		return;
	}

	void doTranslate(plugin, file, lang);
}

/**
 * Captures the current selection synchronously, before any modal steals focus.
 */
function captureSelection(
	editor: Editor,
): { text: string; range: SelectionRange } | null {
	const text = editor.getSelection();
	if (!text) {
		return null;
	}
	return {
		text,
		range: { from: editor.getCursor("from"), to: editor.getCursor("to") },
	};
}

export function translateSelection(
	plugin: PluginWithSettings,
	editor: Editor,
): void {
	if (!requireApiKey(plugin)) {
		return;
	}

	const selection = captureSelection(editor);
	if (!selection) {
		new Notice(t("noticeNoSelection"));
		return;
	}

	new LanguageSuggestModal(
		plugin.app,
		plugin.settings.lastLanguage,
		(lang) => {
			plugin.settings.lastLanguage = lang;
			void plugin.saveSettings();
			void doTranslateSelection(
				plugin,
				editor,
				lang,
				selection.range,
				selection.text,
			);
		},
	).open();
}

export function translateSelectionToLastLanguage(
	plugin: PluginWithSettings,
	editor: Editor,
): void {
	const lang = plugin.settings.lastLanguage;
	if (!lang) {
		return translateSelection(plugin, editor);
	}

	if (!requireApiKey(plugin)) {
		return;
	}

	const selection = captureSelection(editor);
	if (!selection) {
		new Notice(t("noticeNoSelection"));
		return;
	}

	void doTranslateSelection(
		plugin,
		editor,
		lang,
		selection.range,
		selection.text,
	);
}
