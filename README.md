# Multi-AI Translator for Obsidian

Translate notes or selected text with the AI of your choice: **Claude, Gemini, OpenAI or DeepSeek**. Bring your own API keys. Works on desktop and mobile.

Fork of [l10n-dev/obsidian-plugin-ai-translator](https://github.com/l10n-dev/obsidian-plugin-ai-translator) (MIT), with the l10n.dev backend replaced by direct calls to the AI providers.

## Features

- Choose the provider and model in settings; each provider has its own API key and model.
- Default models: `claude-sonnet-5-5`, `gemini-4-hydrogen`, `gpt-6.1-terra`, `deepseek-flash`. Type any model ID, or use **Fetch models** to list the ones available for your key.
- Preserves Markdown structure; code, URLs and link targets are left untouched.
- Translate the active note or the selection via the command palette, ribbon icon, or context menu.
- Remembers the last used language.
- Output modes: new note, replace, or append. Optional frontmatter translation.
- Long notes are split into chunks and translated in parallel.
- Mobile-compatible: uses Obsidian's `requestUrl`, no Node.js APIs.

## Installation

Not in the community store. Build and copy manually:

```bash
npm install && npm run build
mkdir -p <vault>/.obsidian/plugins/multi-ai-translator
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/multi-ai-translator/
```

Then enable **Multi-AI Translator** in **Settings → Community plugins**.

## Privacy

Note text is sent to the provider you select, using your own API key. Keys are stored in the plugin's `data.json` inside your vault (note: this syncs with the vault).

## License

MIT, see [LICENSE](LICENSE).
