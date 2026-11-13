import { Language } from "./types";

export const LANGUAGES: Language[] = [
	["ar", "Arabic"], ["bg", "Bulgarian"], ["zh-CN", "Chinese (Simplified)"],
	["zh-TW", "Chinese (Traditional)"], ["hr", "Croatian"], ["cs", "Czech"],
	["da", "Danish"], ["nl", "Dutch"], ["en", "English"], ["et", "Estonian"],
	["fi", "Finnish"], ["fr", "French"], ["de", "German"], ["el", "Greek"],
	["he", "Hebrew"], ["hi", "Hindi"], ["hu", "Hungarian"], ["id", "Indonesian"],
	["it", "Italian"], ["ja", "Japanese"], ["ko", "Korean"], ["lv", "Latvian"],
	["lt", "Lithuanian"], ["ms", "Malay"], ["no", "Norwegian"], ["fa", "Persian"],
	["pl", "Polish"], ["pt", "Portuguese"], ["pt-BR", "Portuguese (Brazil)"],
	["ro", "Romanian"], ["ru", "Russian"], ["sr", "Serbian"], ["sk", "Slovak"],
	["sl", "Slovenian"], ["es", "Spanish"], ["sv", "Swedish"], ["th", "Thai"],
	["tr", "Turkish"], ["uk", "Ukrainian"], ["vi", "Vietnamese"],
	["ka", "Georgian"], ["kk", "Kazakh"], ["be", "Belarusian"], ["bn", "Bengali"],
	["ca", "Catalan"], ["tl", "Filipino"], ["is", "Icelandic"], ["sw", "Swahili"],
	["ta", "Tamil"], ["ur", "Urdu"], ["az", "Azerbaijani"], ["hy", "Armenian"],
].map(([code, name]) => ({ code: code as string, name: name as string }));

export function searchLanguages(query: string): Language[] {
	const q = query.trim().toLowerCase();
	if (!q) return LANGUAGES;
	return LANGUAGES.filter(
		(l) =>
			l.name.toLowerCase().includes(q) || l.code.toLowerCase().startsWith(q),
	);
}
