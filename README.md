# bnl for VS Code

Syntax highlighting, snippets, and completions for the [bnl](https://github.com/bnlang) programming language.

## Features

- Syntax highlighting for `.bnl` files (English + Bangla keywords).
- Snippets for `if`, `while`, `for ... of`, `function`, `class`, `import`, `try` / `catch`, and the most-common idioms.
- Completions for keywords, the global builtins (`print`, `str`, `type`, `to_number`, `chr`, `try_call`), and a curated set of standard-library modules (`sys`, `io`, `timers`, …).
- Receiver-aware completions: typing `sys.`, `io.`, `timers.`, or `"...".` / list / map followed by `.` suggests the relevant members.
- Hover shows keyword aliases and global signatures.
- Brace-based document formatter (indent + trailing-whitespace strip).

## What's covered

| Category | Tokens |
|---|---|
| Control flow      | `if`/`যদি`, `else`/`নাহলে`, `while`/`যতক্ষণ`, `for`/`প্রতি`, `of`/`এর` |
| Switch            | `switch`/`বিকল্প`, `case`/`অবস্থা`, `default`/`অন্যথায়` |
| Loop / switch flow| `break`/`থামুন`, `continue`/`চলুন` |
| Definitions       | `var`/`চলক`, `function`/`ফাংশন`, `class`/`শ্রেণী`, `extends`/`প্রসারিত`, `super`/`উপরের` |
| Modules           | `import`/`আমদানি`, `as`/`যেমন` |
| Logical (word)    | `and`/`এবং`, `or`/`অথবা`, `not`/`না` |
| Constants         | `true`/`সত্য`, `false`/`মিথ্যা`, `null`/`নাই` |
| Errors            | `try`/`চেষ্টা`, `catch`/`ধরুন`, `throw`/`নিক্ষেপ`, `finally`/`অবশেষে` |
| Return            | `return`/`ফেরত` |
| Globals           | `print`/`লিখুন`, `str`, `type`/`ধরণ`, `to_number`, `chr`, `try_call` |

The grammar mirrors the actual lexer keyword table at `src/frontend/lexer.cpp` in the bnl repo. Tokens that aren't part of the language (`let`, `const`, `do`, `async`/`await`, `yield`, `typeof`, `instanceof`, `in`, `delete`, `void`, `new`, `this`, `with`, `debugger`, `static`, regex literals, template literals, single-quoted strings, `===`/`!==`/`&&`/`||`/`!`, `++`/`--`, compound assignment, …) are intentionally not recognized.

`switch` in bnl is **no-fall-through**: each `case` block runs and then control exits the switch. Use stacked `case x: case y:` before a block for multi-value matching.

## Install

1. Open VS Code → Extensions panel.
2. Search for **bnl** and install.
3. Open any `.bnl` file.

Or build from source:

```sh
npm install
npm run compile
npx vsce package
code --install-extension bnl-vscode-1.0.0.vsix
```

## Known gaps

- No semantic indexer — completions are textual / receiver-pattern based, not driven by the bnl runtime's symbol table.
- Brace-based formatter only (indent + trailing-whitespace strip). No parenthesis-aligned wrapping yet.
- Receiver-aware completions cover `sys`, `io`, `timers`; other stdlib modules complete by name on `import` only.

## License

MIT.
