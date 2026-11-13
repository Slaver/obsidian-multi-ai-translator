import en from "./en.json";
import de from "./de.json";
import es from "./es.json";
import fr from "./fr.json";
import id from "./id.json";
import it from "./it.json";
import ja from "./ja.json";
import ko from "./ko.json";
import pt from "./pt.json";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";

/** Same keys as en.json, values widened to plain `string` for locale files. */
export type Translations = { [K in keyof typeof en]: string };

// ---------------------------------------------------------------------------
// Locale normalization
// ---------------------------------------------------------------------------

/**
 * Maps moment.js locale codes (lowercase, hyphen-separated) to the plugin's
 * supported locale codes.  Falls back to "en" for anything unsupported.
 */
const LOCALE_MAP: Record<string, string> = {
	"zh-cn": "zh-CN",
	"zh-tw": "zh-TW",
	"zh-hk": "zh-TW",
	"zh-mo": "zh-TW",
	"pt-br": "pt",
	"pt-pt": "pt",
};

const SUPPORTED_LOCALES = new Set([
	"en",
	"de",
	"es",
	"fr",
	"id",
	"it",
	"ja",
	"ko",
	"pt",
	"zh-CN",
	"zh-TW",
]);

/**
 * Resolves an arbitrary locale string to one of the plugin's supported codes,
 * or "en" if no match is found.
 */
export function normalizeLocale(locale: string): string {
	const lower = locale.toLowerCase();

	// Explicit overrides (e.g. zh-cn → zh-CN)
	if (LOCALE_MAP[lower]) return LOCALE_MAP[lower];

	// Exact match (case-insensitive)
	for (const supported of SUPPORTED_LOCALES) {
		if (supported.toLowerCase() === lower) return supported;
	}

	// Language-prefix fallback (e.g. "es-mx" → "es")
	const prefix = lower.split(/[-_]/)[0] ?? lower;
	for (const supported of SUPPORTED_LOCALES) {
		if (supported.toLowerCase() === prefix) return supported;
	}

	return "en";
}

// ---------------------------------------------------------------------------
// Locale detection
// ---------------------------------------------------------------------------

/** Returns the current Obsidian UI locale code (via the bundled moment.js). */
export function getLocale(): string {
	const momentLocale = (
		window as typeof window & { moment?: { locale(): string } }
	).moment?.locale();
	return momentLocale ?? "en";
}

// ---------------------------------------------------------------------------
// Translation registry
// ---------------------------------------------------------------------------

const locales: Record<string, Partial<Translations>> = {
	en,
	de,
	es,
	fr,
	id,
	it,
	ja,
	ko,
	pt,
	"zh-CN": zhCN,
	"zh-TW": zhTW,
};

// ---------------------------------------------------------------------------
// t() – look up a translation string with optional variable interpolation
// ---------------------------------------------------------------------------

/**
 * Returns the translated string for the given key in the current Obsidian
 * locale, falling back to English when a translation is missing.
 *
 * Variable placeholders use the `{{key}}` syntax, e.g.:
 *   t("noticeTranslationComplete", { count: "1,234" })
 */
export function t(
	key: keyof Translations,
	vars?: Record<string, string | number>,
): string {
	const locale = normalizeLocale(getLocale());
	const dict = locales[locale] ?? {};
	let str = dict[key] ?? en[key];

	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			str = str.replace(`{{${k}}}`, String(v));
		}
	}

	return str;
}
