# Testing the Multi-AI Translator plugin

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- An Obsidian vault (desktop or mobile)
- An API key for at least one provider: Claude, Gemini, OpenAI or DeepSeek

## 1. Build

```bash
npm install
npm run build
```

This produces `main.js` in the repository root.

## 2. Install into a vault

Copy `main.js`, `manifest.json` and `styles.css` into:

```
<YourVault>/.obsidian/plugins/multi-ai-translator/
```

Then enable **Multi-AI Translator** in **Settings → Community plugins**. For live reloading during development, clone the repository into that folder and run `npm run dev`.

## 3. Configure

1. Open **Settings → Multi-AI Translator**.
2. Choose an **AI provider**. The model and API key rows of that provider appear below it.
3. Paste the API key. Optionally change the model or press **Fetch models**.
4. Choose an **Output behavior** and set **Translate frontmatter** as desired.

## 4. Run a translation

Open a note and use the command palette (`Translate current note`), the ribbon icon, or the editor / file explorer context menu. Pick a language and wait for the notice.

## 5. Manual test checklist

| Scenario | Expected result |
|---|---|
| Output = **create new note** | `{filename} ({lang-code}).md` created in the same folder |
| Output = **replace** | Current note content replaced |
| Output = **append** | Translation appended below `---` |
| **Translate frontmatter** OFF | YAML block is identical to the original |
| **Translate frontmatter** ON | YAML block is translated too |
| Switch provider in settings | Only that provider's model and key rows are shown; other keys are kept |
| Wrong API key | Notice: "Invalid <provider> API key." |
| No API key for selected provider | Notice asking to set the key in settings |
| Rate limit / quota exceeded | Notice about rate limit; two automatic retries first |
| Long note (> 12,000 characters) | Progress notice "N of M parts done"; output keeps order and formatting |
| Code blocks, URLs, wikilinks | Left untranslated |
| Translate selection | Only the selection is replaced; nothing happens if it changed meanwhile |
| **Fetch models** with a valid key | Suggestions list is extended |
| No note open, command triggered | Notice: "No active note to translate." |
| Language picker closed without selecting | Translation cancelled silently |

Repeat on mobile after copying the three files into the vault's plugin folder.

## 6. Linting

```bash
npm run lint
```
