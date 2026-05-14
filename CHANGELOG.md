# Changelog

All notable changes to the **Bnlang for VS Code** extension are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/) and the version numbers follow [Semantic Versioning](https://semver.org/).

## [2.2.0] — 2026-05-14

### Added

- **Phonetic typing** — type roman spellings to insert Bangla tokens. Covers all 28 keyword groups (e.g. `jodi` → `যদি`, `nahole` → `নাহলে`, `fangshon` → `ফাংশন`), the Bangla globals (`likhun` → `লিখুন`, `dhoron` → `ধরণ`), and the Bangla aliases of all 34 built-in module names (`fail` / `file` → `ফাইল`, `gonit` → `গণিত`, `kripto` → `ক্রিপ্টো`, …).
- **Import-string suggestions** — typing inside `import "..."` surfaces every stdlib module with both its English (`io`) and Bangla (`ফাইল`) forms. The same suggestions match English names, Bangla aliases, and roman phonetics; the form matching the user's input ranks first.
- **Bangla `import` / `as` keyword support** — `আমদানি "io" যেমন ফাইল;` is fully interchangeable with `import "io" as ফাইল;`. Every feature that detects these keywords now matches either spelling.
- **Alias-aware receiver completion** — after `import "io" as foo;`, typing `foo.` shows io's member list. Works through any alias spelling (English, Bangla, phonetic) for every wired module.
- **Member tables for the entire stdlib** — receiver-aware completion now covers all 34 modules in `src/runtime/bn_aliases.h`: `sys`, `io`, `timers`, `time`, `url`, `path`, `math`, `json`, `log`, `exec`, `web`, `request`, `mysql`, `pg`, `sqlite`, `mongo`, `random`, `uuid`, `crypto`, `csv`, `cookie`, `session`, `ws`, `test`, `net`, `http`, `tls`, `regex`, `zlib`, `dns`, `template`, `multipart`, `dotenv`, `cli`. Each member has a signature, doc, and snippet placeholder.
- `editor.quickSuggestions.strings` is now enabled for the `bnl` language scope (required to power the `import "..."` completion).

### Changed

- Source split into focused modules — `data.ts` (all tables), `completion.ts` (completion provider + helpers), `hover.ts` (hover), `formatter.ts` (formatter), `extension.ts` (activation glue). Internal refactor only — no user-visible behavior changes.
- Receiver dispatch became table-driven via a single `RECEIVER_MODULES` constant; adding a future module is now one entry in that list plus its member table.

### Fixed

- Inside `import "..."`, completion no longer leaves a dangling `"` at the end of the line when VS Code's auto-closing-pair has already inserted one.
- Re-editing an existing `import "" as <alias>;` line no longer mangles the `as <alias>;` tail when picking a new library name.

## [2.1.0] — earlier

- Syntax highlighting, snippets, hover, and brace-based formatter.
- Receiver-aware completion for `sys`, `io`, and `timers` only.
- English-only `import` / `as` keyword recognition.
