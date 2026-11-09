# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] — 2026-11-09

- Updated for l10n.dev subscription plans: the 3-day free trial with 10,000 characters replaces the monthly free quota
- The **Buy characters** button is now **View plans**; the insufficient balance notice points to subscribing or upgrading
- README now lists the Basic, Standard and Pro plans

## [1.3.1] — 2026-08-11

- Settings are now discoverable in Obsidian's settings search on 1.13.0 and later (declarative settings API); older versions are unaffected

## [1.3.0] — 2026-08-11

- Translate selected text from the editor context menu; falls back to the whole note when nothing is selected
- Added "Translate selection" command

## [1.2.2] — 2026-07-14

- Usage details notification is fixed 

## [1.2.1] — 2026-07-13

- Usage details are added to the Translation complete notification

## [1.2.0] — 2026-06-24 

- The plugin interface is translated into 11 languages
- Added link to manage saved linguistic Instructions 

## [1.1.2] — 2026-06-16

- Added support json, yaml, other plain-text formats

## [1.1.1] — 2026-06-15

- Set correct min API version

## [1.1.0] — 2026-06-15

- Added AI glossary generation

## [1.0.4] — 2026-05-17

- Added artifact attestations to publish workflow. Deleted "Manual installation" instruction from README.

## [1.0.3] — 2026-05-12

- Changed ID in manifest to fix "Plugin ID must only contain lowercase ASCII letters and hyphens."

## [1.0.2] — 2026-05-12

- Changed ID in manifest to fix "An entry with this ID already exists."

## [1.0.1] — 2026-05-02

### Fixed

- Removed all `console.debug` and `console.error` calls that caused errors on mobile devices and were invisible to users in the Obsidian console

## [1.0.0] — 2026-04-28

### Added

- Translate the active note via the command palette ("Translate current note"), ribbon icon, and right-click context menus (file explorer and editor)
- Dynamic language picker using `SuggestModal` — searches [l10n.dev](https://l10n.dev) in real time with a 300 ms debounce; no hardcoded language list
- Three output modes configurable in settings:
  - **Create a new note** (default) — saves translation as `{filename} ({lang-code}).md` in the same folder
  - **Replace current note content** — overwrites the note in place
  - **Append to current note** — appends translation below a horizontal rule
- YAML frontmatter toggle — when disabled, frontmatter is preserved verbatim and only the note body is sent for translation
- Success notice shows characters used and remaining balance from the API response
- Secure API key input (password-masked) in settings
- Async balance display in settings tab — fetches current character balance when the tab is opened
- Typed error handling: 401 Unauthorized and 402 Payment Required surface actionable notices with direct links to [l10n.dev/ws/keys](https://l10n.dev/ws/keys) and [l10n.dev/#pricing](https://l10n.dev/#pricing)
- Mobile-compatible — all network calls use Obsidian's `requestUrl`; no Node.js or Electron APIs used
