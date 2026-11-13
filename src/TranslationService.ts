import { requestUrl } from "obsidian";
import { Provider } from "./types";

export interface TranslateParams {
	provider: Provider;
	apiKey: string;
	model: string;
	text: string;
	languageName: string;
	languageCode: string;
	format: string;
}

const MAX_CHUNK_CHARS = 12000;
const CONCURRENCY = 4;

function systemPrompt(p: TranslateParams): string {
	return [
		`You are a professional translator. Translate the user's text into ${p.languageName} (${p.languageCode}).`,
		`The text is in "${p.format}" format.`,
		"Rules:",
		"- Preserve all Markdown/format structure exactly: headings, lists, tables, links, images, callouts, wikilinks, footnotes, HTML.",
		"- Do not translate code blocks, inline code, URLs, file paths, link targets, or YAML keys.",
		"- Keep line breaks and blank lines as in the source.",
		"- Output ONLY the translated text, with no commentary and no surrounding code fence.",
		"- If a part is already in the target language, leave it as is.",
	].join("\n");
}

/** Splits text at blank lines (outside code fences) into chunks of bounded size. */
export function splitIntoChunks(text: string): string[] {
	const blocks: string[] = [];
	let current: string[] = [];
	let inFence = false;
	for (const line of text.split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		current.push(line);
		if (!inFence && line.trim() === "") {
			blocks.push(current.join("\n"));
			current = [];
		}
	}
	if (current.length) blocks.push(current.join("\n"));

	const chunks: string[] = [];
	let buf = "";
	for (const b of blocks) {
		const piece = buf ? buf + "\n" + b : b;
		if (buf && piece.length > MAX_CHUNK_CHARS) {
			chunks.push(buf);
			buf = b;
		} else {
			buf = piece;
		}
	}
	if (buf) chunks.push(buf);
	return chunks;
}

async function post(
	url: string,
	headers: Record<string, string>,
	body: unknown,
): Promise<unknown> {
	const response = await requestUrl({
		url,
		method: "POST",
		headers: { "Content-Type": "application/json", ...headers },
		body: JSON.stringify(body),
		throw: false,
	});
	if (response.status === 401 || response.status === 403) {
		throw new Error("unauthorized");
	}
	if (response.status === 429) throw new Error("rate_limited");
	if (response.status !== 200) {
		let detail = "";
		try {
			const j = response.json as {
				error?: { message?: string } | string;
			};
			detail =
				typeof j.error === "string" ? j.error : (j.error?.message ?? "");
		} catch {
			detail = response.text.slice(0, 200);
		}
		throw new Error(`api_error:${response.status} ${detail}`);
	}
	return response.json;
}

async function callProvider(
	p: TranslateParams,
	chunk: string,
): Promise<string> {
	const system = systemPrompt(p);
	switch (p.provider) {
		case "claude": {
			const r = (await post(
				"https://api.anthropic.com/v1/messages",
				{
					"x-api-key": p.apiKey,
					"anthropic-version": "2023-06-01",
				},
				{
					model: p.model,
					max_tokens: 16000,
					system,
					messages: [{ role: "user", content: chunk }],
				},
			)) as { content?: { type: string; text?: string }[] };
			return (r.content ?? [])
				.filter((c) => c.type === "text")
				.map((c) => c.text ?? "")
				.join("");
		}
		case "gemini": {
			const r = (await post(
				`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent`,
				{ "x-goog-api-key": p.apiKey },
				{
					systemInstruction: { parts: [{ text: system }] },
					contents: [{ role: "user", parts: [{ text: chunk }] }],
					// Gemini 3/4 think by default; translation doesn't need it.
					...(/^gemini-[34]/.test(p.model)
						? {
								generationConfig: {
									thinkingConfig: { thinkingLevel: "low" },
								},
							}
						: {}),
				},
			)) as {
				candidates?: {
					content?: { parts?: { text?: string; thought?: boolean }[] };
				}[];
			};
			return (r.candidates?.[0]?.content?.parts ?? [])
				.filter((x) => !x.thought)
				.map((x) => x.text ?? "")
				.join("");
		}
		case "openai":
		case "deepseek": {
			const isOpenAI = p.provider === "openai";
			const body: Record<string, unknown> = {
				model: p.model,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: chunk },
				],
			};
			// Translation needs no chain-of-thought; DeepSeek enables it by default.
			if (!isOpenAI) body.thinking = { type: "disabled" };
			const r = (await post(
				isOpenAI
					? "https://api.openai.com/v1/chat/completions"
					: "https://api.deepseek.com/chat/completions",
				{ Authorization: `Bearer ${p.apiKey}` },
				body,
			)) as { choices?: { message?: { content?: string } }[] };
			return r.choices?.[0]?.message?.content ?? "";
		}
	}
}

export class TranslationService {
	/**
	 * Translates text chunk by chunk. onProgress is called with (done, total).
	 */
	static async translate(
		p: TranslateParams,
		onProgress?: (done: number, total: number) => void,
	): Promise<string> {
		const chunks = splitIntoChunks(p.text);
		const out: string[] = new Array<string>(chunks.length).fill("");
		let next = 0;
		let done = 0;
		onProgress?.(0, chunks.length);

		const translateChunk = async (chunk: string): Promise<string> => {
			if (!chunk.trim()) return chunk;
			let translated = "";
			for (let attempt = 0; ; attempt++) {
				try {
					translated = await callProvider(p, chunk);
					break;
				} catch (err) {
					const limited =
						err instanceof Error && err.message === "rate_limited";
					if (!limited || attempt >= 2) throw err;
					await new Promise((r) => window.setTimeout(r, 2000 * (attempt + 1)));
				}
			}
			if (!translated.trim()) throw new Error("empty_response");
			// Keep the source's trailing whitespace so chunks rejoin cleanly.
			const trailing = /\s*$/.exec(chunk)?.[0] ?? "";
			return translated.replace(/\s+$/, "") + trailing;
		};

		// Small worker pool: chunks run in parallel, results keep their order.
		const worker = async () => {
			while (next < chunks.length) {
				const i = next++;
				out[i] = await translateChunk(chunks[i] ?? "");
				onProgress?.(++done, chunks.length);
			}
		};
		await Promise.all(
			Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker),
		);
		return out.join("\n");
	}

	/** Lists model IDs available for the given key. */
	static async listModels(
		provider: Provider,
		apiKey: string,
	): Promise<string[]> {
		const urls: Record<Provider, string> = {
			claude: "https://api.anthropic.com/v1/models?limit=100",
			gemini:
				"https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
			openai: "https://api.openai.com/v1/models",
			deepseek: "https://api.deepseek.com/models",
		};
		const headers: Record<string, string> =
			provider === "claude"
				? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
				: provider === "gemini"
					? { "x-goog-api-key": apiKey }
					: { Authorization: `Bearer ${apiKey}` };
		const response = await requestUrl({
			url: urls[provider],
			headers,
			throw: false,
		});
		if (response.status === 401 || response.status === 403) {
			throw new Error("unauthorized");
		}
		if (response.status !== 200) throw new Error("network_error");
		const j = response.json as {
			data?: { id: string }[];
			models?: { name: string; supportedGenerationMethods?: string[] }[];
		};
		if (provider === "gemini") {
			return (j.models ?? [])
				.filter((m) =>
					m.supportedGenerationMethods?.includes("generateContent"),
				)
				.map((m) => m.name.replace(/^models\//, ""));
		}
		return (j.data ?? []).map((m) => m.id);
	}
}
