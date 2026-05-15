# Bnlang (bnl) for VS Code

Syntax highlighting, snippets, completions, and formatting for the Bangla Programming Language [Bnlang](https://github.com/bnlang).

## Hello, world

A bnl file freely mixes English and Bangla keywords — both forms tokenize to the same thing in the lexer:

```bnl
import "io" as io;

function greet(name) {
    যদি (name == null) { ফেরত "hello, friend"; }
    return "hello, " + name;
}

লিখুন(greet("পৃথিবী"));   // → hello, পৃথিবী
```

## Features

- **Syntax highlighting** for `.bnl` files (English + Bangla keywords).
- **Snippets** for `if`, `while`, `for ... of`, `function`, `class`, `import`, `try` / `catch`, and the most-common idioms.
- **Phonetic typing** — type a roman spelling, get the Bangla token. For example, type `jodi` and accept `যদি`; type `likhun` and accept `লিখুন`. Covers all 28 keyword groups plus Bangla globals and built-in module aliases. No system IME required for any of the closed-set tokens the language defines.
- **Bangla `import` / `as` keywords** — write `আমদানি "io" যেমন ফাইল;` and every feature below works as if you wrote `import "io" as ফাইল;`. The two forms are fully interchangeable.
- **Import suggestions** inside `import "..."` — start typing the library name and the dropdown shows all 34 stdlib modules in both English (`io`) and Bangla (`ফাইল`), with phonetic spellings as filter pool. Type `fail`, `file`, `ফাইল`, or `i` and the same options surface; the form matching your input ranks first.
- **Receiver-aware completions through user-chosen aliases** — after `import "io" as foo;`, typing `foo.` surfaces io's member list. Works through any alias spelling (English, Bangla, or phonetic) for every supported module.
- **Member completion for the entire stdlib** — all 34 modules in `bn_aliases.h` have full member tables with signatures and docs (see below).
- **Hover** shows keyword aliases and global signatures.
- **Document formatter** — brace-based indentation, idempotent on already-formatted code.

## What's new in 2.2.0

- Phonetic typing layer for keywords, Bangla globals, and built-in module aliases (type `jodi` → `যদি`, `gonit` → `গণিত`, etc.).
- Library suggestions inside `import "..."` for all 33 stdlib modules; both English (`io`) and Bangla (`ফাইল`) forms surface from any matching input.
- Bangla `import` / `as` keyword recognition — `আমদানি "io" যেমন ফাইল;` is fully equivalent to the English form.
- Alias-aware receiver completion: after `import "io" as foo;`, typing `foo.` surfaces io's members. Works through any alias spelling and any of the wired modules.
- Member tables for **every** stdlib module (was 3 → now 33): `sys`, `io`, `timers`, `time`, `url`, `path`, `math`, `json`, `log`, `exec`, `web`, `request`, `pg`, `sqlite`, `mongo`, `random`, `uuid`, `crypto`, `csv`, `cookie`, `session`, `ws`, `test`, `net`, `http`, `tls`, `regex`, `zlib`, `dns`, `template`, `multipart`, `dotenv`, `cli`.
- Source split across `data.ts`, `completion.ts`, `hover.ts`, `formatter.ts`, `extension.ts` — internal only, no behavior change.

See [CHANGELOG.md](./CHANGELOG.md) for the full history.

## Standard-library coverage

All 34 modules surface in `import "..."` suggestions; the ones marked **(members)** also have full receiver-aware member completion.

| Module | Bangla alias | Members |
|---|---|---|
| `sys` | `সিস্টেম` | ✓ |
| `io` | `ফাইল` | ✓ |
| `timers` | `টাইমার` | ✓ |
| `time` | `সময়` | ✓ |
| `url` | `ইউআরএল` | ✓ |
| `path` | `পথ` | ✓ |
| `math` | `গণিত` | ✓ |
| `json` | `জেসন` | ✓ |
| `log` | `লগ` | ✓ |
| `exec` | `চালান` | ✓ |
| `web` | `ওয়েব` | ✓ |
| `request` | `অনুরোধ` | ✓ |
| `pg` | `পোস্টগ্রেস` | ✓ |
| `sqlite` | `এসকিউলাইট` | ✓ |
| `mongo` | `মঙ্গো` | ✓ |
| `random` | `এলোমেলো` | ✓ |
| `uuid` | `ইউইউআইডি` | ✓ |
| `crypto` | `ক্রিপ্টো` | ✓ |
| `csv` | `সিএসভি` | ✓ |
| `cookie` | `কুকি` | ✓ |
| `session` | `অধিবেশন` | ✓ |
| `ws` | `ওয়েবসকেট` | ✓ |
| `test` | `টেস্ট` | ✓ |
| `net` | `নেট` | ✓ |
| `http` | `এইচটিটিপি` | ✓ |
| `tls` | `টিএলএস` | ✓ |
| `regex` | `প্যাটার্ন` | ✓ |
| `zlib` | `সংকোচন` | ✓ |
| `dns` | `ডিএনএস` | ✓ |
| `template` | `টেমপ্লেট` | ✓ |
| `multipart` | `মাল্টিপার্ট` | ✓ |
| `dotenv` | `ডটএনভ` | ✓ |
| `cli` | `কমান্ড` | ✓ |

Aliases are mirrored from `src/runtime/bn_aliases.h` in the bnl repo.

## Keyword coverage

| Category | Tokens |
|---|---|
| Control flow      | `if`/`যদি`, `else`/`নাহলে`, `while`/`যতক্ষণ`, `for`/`প্রতি`, `of`/`এর` |
| Switch            | `switch`/`বিকল্প`, `case`/`অবস্থা`, `default`/`অন্যথায়` |
| Loop / switch flow| `break`/`থামুন`, `continue`/`চলুন` |
| Definitions       | `var`/`চলক`/`ধরি`, `function`/`ফাংশন`, `class`/`শ্রেণী`, `extends`/`প্রসারিত`, `super`/`উপরের` |
| Modules           | `import`/`আমদানি`, `as`/`যেমন` |
| Logical (word)    | `and`/`এবং`, `or`/`অথবা`, `not`/`না` |
| Constants         | `true`/`সত্য`, `false`/`মিথ্যা`, `null`/`নাই`/`নাল` |
| Errors            | `try`/`চেষ্টা`, `catch`/`ধরুন`, `throw`/`নিক্ষেপ`, `finally`/`অবশেষে` |
| Return            | `return`/`ফেরত` |
| Globals           | `print`/`লিখুন`, `str`, `type`/`ধরণ`, `to_number`, `chr`, `try_call` |

The grammar mirrors the actual lexer keyword table at `src/frontend/lexer.cpp` in the bnl repo.

## Phonetic typing — examples

Every Bangla keyword and module-name alias has a roman phonetic spelling that surfaces it in the completion list:

```
jodi       → যদি           nahole     → নাহলে        ferot      → ফেরত
fangshon   → ফাংশন         cholok     → চলক          jotokkhon  → যতক্ষণ
dhori      → ধরি            amdani     → আমদানি       jemon      → যেমন
ebong      → এবং            sotto      → সত্য          mittha     → মিথ্যা
nai        → নাই            nal        → নাল
likhun     → লিখুন          dhoron     → ধরণ

fail/file  → ফাইল           sistem     → সিস্টেম      taimar     → টাইমার
gonit      → গণিত           jeson      → জেসন        kripto     → ক্রিপ্টো
elomelo    → এলোমেলো        pattern    → প্যাটার্ন    onurodh    → অনুরোধ
```

…and the full list (see source for everything). Typing any of these outside an import or after `import "` shows the Bangla form to accept.

## Install

**Requires:** VS Code 1.85 or newer.

1. Open VS Code → Extensions panel.
2. Search for **bnl** and install.
3. Open any `.bnl` file.

Or build from source:

```sh
npm install
npm run compile
npm run package
code --install-extension bnl-vscode-2.2.1.vsix
```

## Known gaps

- **No chained / instance member completion.** Returned objects (e.g., `pg.connect(...)` → `db`, `web.app()` → app) have their own methods (`db.exec(...)`, `app.get(...)`, etc.) that completion does **not** surface — `detectReceiver` matches by identifier name, not by inferred type. The top-level module functions complete; what's chained off their return values does not.
- **No semantic indexer.** Completions are textual / receiver-pattern based, not driven by the bnl runtime's symbol table.
- **Brace-based formatter only** — indent + trailing-whitespace strip; no parenthesis-aligned wrapping.

## Links

- **Repository:** <https://github.com/bnlang/bnl-vscode>
- **Issues / feedback:** <https://github.com/bnlang/bnl-vscode/issues>
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Bnlang language:** <https://github.com/bnlang>

## License

MIT.
