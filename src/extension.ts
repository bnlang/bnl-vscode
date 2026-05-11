/**
 * @file src/extension.ts
 * Bnlang VS Code extension.
 *
 * Provides syntax highlighting, snippets, and a small
 * completion / hover layer for the bnl language. Mirrors the actual lexer
 * keyword table at src/frontend/lexer.cpp and the runtime built-in modules
 * (sys, io, timers).
 */

import * as vscode from "vscode";

// ----- keyword groups (English ↔ Bangla, mirrored from lexer.cpp) -----------

const KEYWORD_GROUPS: Record<string, string[]> = {
    if:       ["if",        "যদি"],
    else:     ["else",      "নাহলে"],
    while:    ["while",     "যতক্ষণ"],
    for:      ["for",       "প্রতি"],
    of:       ["of",        "এর"],
    function: ["function",  "ফাংশন"],
    return:   ["return",    "ফেরত"],
    var:      ["var",       "চলক"],
    class:    ["class",     "শ্রেণী"],
    extends:  ["extends",   "প্রসারিত"],
    super:    ["super",     "উপরের"],
    import:   ["import",    "আমদানি"],
    as:       ["as",        "যেমন"],
    and:      ["and",       "এবং"],
    or:       ["or",        "অথবা"],
    not:      ["not",       "না"],
    true:     ["true",      "সত্য"],
    false:    ["false",     "মিথ্যা"],
    null:     ["null",      "নাই"],
    try:      ["try",       "চেষ্টা"],
    catch:    ["catch",     "ধরুন"],
    throw:    ["throw",     "নিক্ষেপ"],
    finally:  ["finally",   "অবশেষে"],
    switch:   ["switch",    "বিকল্প"],
    case:     ["case",      "অবস্থা"],
    default:  ["default",   "অন্যথায়"],
    break:    ["break",     "থামুন"],
    continue: ["continue",  "চলুন"],
};

const ALL_KEYWORDS = [...new Set(Object.values(KEYWORD_GROUPS).flat())];

// ----- global builtins (functions registered by the runtime) ----------------

type Global = { name: string; detail: string; doc: string; snippet?: string };

const GLOBALS: Global[] = [
    { name: "print",     detail: "print(...args) -> null",         doc: "Print values space-separated, then a newline.", snippet: "print(${0})" },
    { name: "লিখুন",     detail: "লিখুন(...) -> null",              doc: "Bangla alias of `print`.",                       snippet: "লিখুন(${0})" },
    { name: "str",       detail: "str(value) -> string",           doc: "Convert any value to its display string.",        snippet: "str(${1:value})" },
    { name: "type",      detail: "type(value) -> string",          doc: "Returns one of: null, bool, number, string, function, class, instance, module, list, map.", snippet: "type(${1:value})" },
    { name: "ধরণ",       detail: "ধরণ(value) -> string",            doc: "Bangla alias of `type`.",                         snippet: "ধরণ(${1:value})" },
    { name: "to_number", detail: "to_number(s) -> number | null",  doc: "Parse a string to a number; returns null on failure.", snippet: "to_number(${1:s})" },
    { name: "chr",       detail: "chr(n) -> string",               doc: "Single-byte string from a byte value (0..255).",  snippet: "chr(${1:n})" },
    { name: "try_call",  detail: "try_call(thunk, on_err) -> any", doc: "Call thunk(); on RuntimeError or throw, call on_err(message_or_value) instead.", snippet: "try_call(\n    function () { return ${1:expr}; },\n    function (${2:err}) { return ${0:fallback}; }\n)" },
];

// ----- module member tables (sys / io / timers) -----------------------------

type Member = { name: string; detail: string; doc?: string; snippet?: string };
const fn = (name: string, detail: string, doc?: string, snippet?: string): Member => ({ name, detail, doc, snippet });

const MODULES: Record<string, Member[]> = {
    sys: [
        fn("platform", "sys.platform: string", "OS identifier: 'windows' | 'linux' | 'darwin' | ..."),
        fn("argc",     "sys.argc() -> number",       "Number of script args."),
        fn("arg",      "sys.arg(i) -> string|null",  "i-th script arg, or null if out of range.", "arg(${1:i})"),
        fn("env",      "sys.env(name) -> string|null", "Env var, or null if unset.",              "env(${1:\"NAME\"})"),
        fn("exit",     "sys.exit(code) -> never",    "Terminate with the given exit code.",      "exit(${1:0})"),
    ],

    io: [
        // sync
        fn("read_file",   "io.read_file(path) -> string",          "Read entire file contents (bytes).",          "read_file(${1:path})"),
        fn("write_file",  "io.write_file(path, content) -> null",  "Overwrite the file at path.",                  "write_file(${1:path}, ${2:content})"),
        fn("append_file", "io.append_file(path, content) -> null", "Append; creates the file if missing.",         "append_file(${1:path}, ${2:content})"),
        fn("exists",      "io.exists(path) -> bool",               "Whether the path exists.",                     "exists(${1:path})"),
        fn("is_file",     "io.is_file(path) -> bool",              "Whether path exists and is a regular file.",   "is_file(${1:path})"),
        fn("is_dir",      "io.is_dir(path) -> bool",               "Whether path exists and is a directory.",      "is_dir(${1:path})"),
        fn("stat",        "io.stat(path) -> map",                  "Returns {bytes, mtime, is_file, is_dir}.",     "stat(${1:path})"),
        fn("mkdir",       "io.mkdir(path) -> null",                "Recursive mkdir (-p semantics).",              "mkdir(${1:path})"),
        fn("list_dir",    "io.list_dir(path) -> list",             "Entry names (no '.' / '..').",                 "list_dir(${1:path})"),
        fn("remove",      "io.remove(path) -> null",               "Recursive remove; idempotent.",                "remove(${1:path})"),
        fn("rename",      "io.rename(from, to) -> null",           "Rename / move.",                               "rename(${1:from}, ${2:to})"),
        fn("copy_file",   "io.copy_file(from, to) -> null",        "Copy a single regular file.",                  "copy_file(${1:from}, ${2:to})"),
        // async
        fn("read_file_async",  "io.read_file_async(path, cb) -> null",        "cb(err, data) on completion.",      "read_file_async(${1:path}, function (err, data) { ${0} })"),
        fn("write_file_async", "io.write_file_async(path, content, cb) -> null", "cb(err) on completion.",         "write_file_async(${1:path}, ${2:content}, function (err) { ${0} })"),
        fn("open_read",        "io.open_read(path) -> stream",                "Pull-based read stream {read(n,cb), close()}.", "open_read(${1:path})"),
        fn("open_write",       "io.open_write(path) -> stream",               "Pull-based write stream {write(d,cb), close()}.", "open_write(${1:path})"),
    ],

    timers: [
        fn("set",      "timers.set(ms, fn) -> cancel",      "One-shot timer. Returns a 0-arg cancel callable.", "set(${1:ms}, function () { ${0} })"),
        fn("interval", "timers.interval(ms, fn) -> cancel", "Repeating timer.",                                  "interval(${1:ms}, function () { ${0} })"),
    ],
};

// ----- intrinsics on string / list / map values -----------------------------

const STRING_INTRINSICS: Member[] = [
    fn("length",       ".length: number",                       "Codepoint count."),
    fn("byte_length",  ".byte_length: number",                  "Byte count (UTF-8)."),
    fn("byte_at",      ".byte_at(i) -> number",                 "Byte at index i.",                                 "byte_at(${1:i})"),
    fn("byte_slice",   ".byte_slice(start, end?) -> string",    "Byte-level substring.",                            "byte_slice(${1:start}, ${2:end})"),
    fn("slice",        ".slice(start, end?) -> string",         "Codepoint-aware substring.",                       "slice(${1:start}, ${2:end})"),
    fn("char_at",      ".char_at(i) -> string",                 "i-th codepoint as a 1-char string.",               "char_at(${1:i})"),
    fn("index_of",     ".index_of(needle, start?) -> number",   "First index of needle, or -1.",                    "index_of(${1:needle})"),
    fn("starts_with",  ".starts_with(s) -> bool",               "",                                                 "starts_with(${1:prefix})"),
    fn("ends_with",    ".ends_with(s) -> bool",                 "",                                                 "ends_with(${1:suffix})"),
    fn("split",        ".split(sep) -> list",                   "Empty sep splits to codepoints.",                  "split(${1:sep})"),
    fn("trim",         ".trim() -> string",                     "Strip ASCII whitespace.",                          "trim()"),
    fn("to_lower",     ".to_lower() -> string",                 "ASCII only.",                                      "to_lower()"),
    fn("to_upper",     ".to_upper() -> string",                 "ASCII only.",                                      "to_upper()"),
    fn("replace",      ".replace(needle, with) -> string",      "Replaces all occurrences.",                        "replace(${1:needle}, ${2:replacement})"),
];

const LIST_INTRINSICS: Member[] = [
    fn("length", ".length: number"),
    fn("push",   ".push(v) -> null",       "Append; mutates in place.", "push(${1:value})"),
    fn("pop",    ".pop() -> any",          "Remove and return last; null if empty.", "pop()"),
];

const MAP_INTRINSICS: Member[] = [
    fn("size",  ".size: number",       "Entry count (shadows any literal `size` key)."),
    fn("has",   ".has(k) -> bool",     "",                "has(${1:key})"),
    fn("keys",  ".keys() -> list",     "Returns the list of keys.", "keys()"),
];

// ----- helpers -------------------------------------------------------------

function makeCompletion(
    label: string,
    detail: string,
    kind: vscode.CompletionItemKind = vscode.CompletionItemKind.Keyword,
    insertText?: string,
    doc?: string,
) {
    const item = new vscode.CompletionItem(label, kind);
    item.detail = detail;
    item.insertText = insertText
        ? new vscode.SnippetString(insertText)
        : label;
    if (doc) {
        const md = new vscode.MarkdownString(doc);
        md.isTrusted = true;
        item.documentation = md;
    }
    return item;
}

function pushMembers(items: vscode.CompletionItem[], members: Member[], prefix: string) {
    for (const m of members) {
        items.push(makeCompletion(
            m.name,
            `${prefix}${m.detail}`,
            vscode.CompletionItemKind.Method,
            m.snippet ?? m.name,
            m.doc,
        ));
    }
}

function detectReceiver(left: string): "string" | "list" | "map" | "module:sys" | "module:io" | "module:timers" | null {
    if (/(?:"[^"]*")\.\w*$/.test(left)) return "string";

    if (/\][^.]*\.\w*$/.test(left)) {
        return "list";
    }

    const id = /([A-Za-z_ঀ-৿][\wঀ-৿]*)\.\w*$/.exec(left)?.[1];
    if (id) {
        if (id === "sys")    return "module:sys";
        if (id === "io")     return "module:io";
        if (id === "timers") return "module:timers";
    }

    return null;
}

async function collectInFileWords(doc: vscode.TextDocument): Promise<Set<string>> {
    const re = /[A-Za-z_][\w]*|[ঀ-৿_][ঀ-৿\w]*/g;
    const set = new Set<string>();
    for (let i = 0; i < doc.lineCount; i++) {
        for (const m of doc.lineAt(i).text.matchAll(re)) {
            if (m[0].length > 1) set.add(m[0]);
        }
    }
    return set;
}

// ----- activation ----------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "bnl", scheme: "file" },
            {
                async provideCompletionItems(doc, position) {
                    const items: vscode.CompletionItem[] = [];

                    // Receiver-specific completions take priority.
                    const left = doc.lineAt(position.line).text.slice(0, position.character);
                    const receiver = detectReceiver(left);
                    if (receiver === "string")        { pushMembers(items, STRING_INTRINSICS, "string"); return items; }
                    if (receiver === "list")          { pushMembers(items, LIST_INTRINSICS,   "list");   return items; }
                    if (receiver === "module:sys")    { pushMembers(items, MODULES.sys,       "sys.");   return items; }
                    if (receiver === "module:io")     { pushMembers(items, MODULES.io,        "io.");    return items; }
                    if (receiver === "module:timers") { pushMembers(items, MODULES.timers,    "timers."); return items; }

                    // Keywords (English + Bangla).
                    for (const [eng, variants] of Object.entries(KEYWORD_GROUPS)) {
                        for (const v of variants) {
                            items.push(makeCompletion(v, `bnl keyword (${eng})`));
                        }
                    }

                    // Globals.
                    for (const g of GLOBALS) {
                        items.push(makeCompletion(g.name, g.detail, vscode.CompletionItemKind.Function, g.snippet, g.doc));
                    }

                    // Built-in module names (for `import "name" as ...`).
                    for (const name of Object.keys(MODULES)) {
                        items.push(makeCompletion(
                            name,
                            `built-in module (\`import "${name}" as ${name};\`)`,
                            vscode.CompletionItemKind.Module,
                        ));
                    }

                    // In-file symbols.
                    const words = await collectInFileWords(doc);
                    for (const w of words) {
                        if (!ALL_KEYWORDS.includes(w) && !GLOBALS.some(g => g.name === w)) {
                            items.push(makeCompletion(w, "in-file symbol", vscode.CompletionItemKind.Text));
                        }
                    }

                    return items;
                },
            },
            ".",
            "_",
        ),
    );

    const HOVER_KEYWORDS: Record<string, string[]> = {};
    for (const variants of Object.values(KEYWORD_GROUPS)) {
        for (const v of variants) HOVER_KEYWORDS[v] = variants;
    }
    const HOVER_GLOBALS: Record<string, Global> = {};
    for (const g of GLOBALS) HOVER_GLOBALS[g.name] = g;

    context.subscriptions.push(
        vscode.languages.registerHoverProvider("bnl", {
            provideHover(doc, pos) {
                const range = doc.getWordRangeAtPosition(
                    pos,
                    /[A-Za-z_][\w]*|[ঀ-৿_][ঀ-৿\w]*/,
                );
                if (!range) return;
                const word = doc.getText(range);

                if (HOVER_KEYWORDS[word]) {
                    const md = new vscode.MarkdownString();
                    md.appendMarkdown(`**${word}** — bnl keyword (aliases: \`${HOVER_KEYWORDS[word].join("`, `")}\`)`);
                    return new vscode.Hover(md, range);
                }

                if (HOVER_GLOBALS[word]) {
                    const g = HOVER_GLOBALS[word];
                    const md = new vscode.MarkdownString();
                    md.appendCodeblock(g.detail, "bnl");
                    if (g.doc) md.appendMarkdown(`\n\n${g.doc}`);
                    return new vscode.Hover(md, range);
                }

                return;
            },
        }),
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider("bnl", {
            provideDocumentFormattingEdits(doc, options) {
                const indentUnit = options.insertSpaces
                    ? " ".repeat(Math.max(1, options.tabSize ?? 4))
                    : "\t";

                const formatted = formatBnl(doc.getText(), indentUnit);

                const start = new vscode.Position(0, 0);
                const end   = doc.lineAt(doc.lineCount - 1).rangeIncludingLineBreak.end;
                return [vscode.TextEdit.replace(new vscode.Range(start, end), formatted)];
            },
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("bnl.formatDocument", async () => {
            const ed = vscode.window.activeTextEditor;
            if (!ed || ed.document.languageId !== "bnl") return;
            await vscode.commands.executeCommand("editor.action.formatDocument");
        }),
    );
}

export function deactivate() { /* nothing to clean up */ }

// ----- formatter ------------------------------------------------------------

export function formatBnl(text: string, indentUnit: string): string {
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    let depth = 0;

    for (const raw of lines) {
        const content = raw.trim();
        if (content === "") {
            out.push("");
            continue;
        }
        const { netOpen, netClose, leadingClose } = analyzeLine(content);
        const printDepth = Math.max(0, depth - leadingClose);
        out.push(indentUnit.repeat(printDepth) + content);
        depth = Math.max(0, depth + netOpen - netClose);
    }

    let result = out.join("\n");
    if (text.endsWith("\n") && !result.endsWith("\n")) result += "\n";
    return result;
}

function analyzeLine(line: string): { netOpen: number; netClose: number; leadingClose: number } {
    let i = 0;
    let leadingClose = 0;

    while (i < line.length) {
        const c = line[i];
        if (c === "}")        { leadingClose++; i++; continue; }
        if (/\s/.test(c))     { i++; continue; }
        break;
    }

    let netOpen = 0;
    let netClose = 0;

    for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === "/" && line[j + 1] === "/") break;
        if (c === '"') {
            j++;
            while (j < line.length) {
                if (line[j] === "\\")      { j += 2; continue; }
                if (line[j] === '"')       break;
                j++;
            }
            continue;
        }

        if (c === "{") netOpen++;
        else if (c === "}") netClose++;
    }

    return { netOpen, netClose, leadingClose };
}
