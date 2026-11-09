# Testing the L10n.dev - AI Translator plugin

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- An Obsidian vault (desktop or mobile)
- A [l10n.dev](https://l10n.dev) account and API key — sign up for a 3-day free trial (10,000 characters) and get your key at [l10n.dev/ws/keys](https://l10n.dev/ws/keys)

---

## 1. Get the plugin files

**For testing a release** — download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).

**For local development** — build from source:

```bash
npm install
npm run build
```

This produces `main.js` in the repository root.

---

## 2. Install into your vault (desktop)

1. Locate your vault folder. Inside it, open (or create) the directory:
   ```
   <YourVault>/.obsidian/plugins/note-ai-translator/
   ```
2. Copy the following files from the repository root into that folder:
   - `main.js`
   - `manifest.json`
   - `styles.css` (if present)
3. Open Obsidian.
4. Go to **Settings → Community plugins**.
5. If prompted, select **Turn on community plugins**.
6. Find **L10n.dev - AI Translator** in the list and toggle it on.

> **Tip:** Clone the repository directly into `<YourVault>/.obsidian/plugins/note-ai-translator/` and run `npm run dev` for live reloading during development.

---

## 3. Configure the plugin

1. Open **Settings → L10n.dev - AI Translator**.
2. Paste your l10n.dev API key into the **API key** field — the remaining balance should appear below it automatically.
3. Choose an **Output behavior** and set the **Translate frontmatter** toggle as desired.

---

## 4. Run a translation

1. Open any Markdown note.
2. Trigger translation using any of these entry points:
   - **Command palette** — `Ctrl/Cmd + P` → `Translate current note`
   - **Ribbon** — select the globe icon in the left sidebar
   - **Context menu (editor)** — right-click inside the note body → **Translate…**
   - **Context menu (file explorer)** — right-click a `.md` file → **Translate…**
3. Type a language name in the picker (e.g. "Spanish") and select a result.
4. The output is saved according to the output behavior setting.

---

## 5. Manual test checklist

| Scenario | Expected result |
|---|---|
| Valid API key, output = **create new note** | `{filename} ({lang-code}).md` created in the same folder |
| Valid API key, output = **replace** | Current note content replaced |
| Valid API key, output = **append** | Translation appended below `---` |
| **Translate frontmatter** OFF | YAML block at top of translated file is identical to original |
| **Translate frontmatter** ON | YAML block is translated along with the body |
| Wrong API key | Notice: "Invalid API key. Get your key at https://l10n.dev/ws/keys" |
| Insufficient balance | Notice: "Insufficient balance. Subscribe or upgrade your plan at https://l10n.dev/#pricing" |
| No API key entered | Settings show "New accounts get a 3-day free trial with 10,000 characters." and the **View plans** button opens the pricing page |
| No note open, command triggered | Notice: "No active note to translate." |
| Language picker closed without selecting | Translation cancelled silently |
| Success | Notice shows characters used and remaining balance |

---

## 6. Mobile testing

1. Build `main.js` on desktop (`npm run build`).
2. Transfer `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/note-ai-translator/` folder using a sync solution (e.g. iCloud, Obsidian Sync, or manual file transfer).
3. Open Obsidian on the mobile device and enable the plugin as described in step 2.
4. Repeat the manual test checklist on mobile, paying attention to the language picker and context menu behaviour.

---

## 7. Linting

```bash
npm run lint
```

The project uses [eslint-plugin-obsidianmd](https://github.com/obsidianmd/eslint-plugin) for Obsidian-specific code guidelines alongside `typescript-eslint`.
