/**
 * @file src/completion.ts
 * Completion provider for bnl. Surfaces keywords (English + Bangla),
 * phonetic aliases, globals, built-in module names inside `import "..."`,
 * receiver-aware member completion (string / list / module), and in-file
 * symbol echo.
 */

import * as vscode from "vscode";

import {
    ALL_KEYWORDS,
    BUILTIN_IMPORTS,
    BuiltinImport,
    GLOBALS,
    IMPORT_NAME_TO_CANONICAL,
    KEYWORD_GROUPS,
    LIST_INTRINSICS,
    MODULES,
    Member,
    PHONETIC_ALIASES,
    STRING_INTRINSICS,
} from "./data";

// helpers
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

function collectImportAliases(doc: vscode.TextDocument): Map<string, string> {
    const out = new Map<string, string>();
    const re  = /(?:import|আমদানি)\s+"([^"]+)"\s+(?:as|যেমন)\s+([A-Za-z_ঀ-৿][\wঀ-৿]*)/g;
    const text = doc.getText();
    for (let m: RegExpExecArray | null; (m = re.exec(text)) !== null; ) {
        const canonical = IMPORT_NAME_TO_CANONICAL[m[1]];
        if (canonical) out.set(m[2], canonical);
    }
    return out;
}

const RECEIVER_MODULES = [
    "sys", "io", "timers", "time", "url", "path", "math", "json", "log",
    "exec", "web", "pg", "sqlite", "mongo", "request",
    "random", "uuid", "crypto", "csv", "cookie", "session", "ws", "test",
    "net", "http", "tls", "regex", "zlib", "dns", "template", "multipart",
    "dotenv", "cli",
] as const;
type ReceiverModule = typeof RECEIVER_MODULES[number];

type Receiver =
    | "string"
    | "list"
    | "map"
    | `module:${ReceiverModule}`
    | null;

function detectReceiver(
    left: string,
    aliases: Map<string, string> = new Map(),
): Receiver {
    if (/(?:"[^"]*")\.\w*$/.test(left)) return "string";

    if (/\][^.]*\.\w*$/.test(left)) {
        return "list";
    }

    const id = /([A-Za-z_ঀ-৿][\wঀ-৿]*)\.\w*$/.exec(left)?.[1];
    if (id) {
        if ((RECEIVER_MODULES as readonly string[]).includes(id)) {
            return `module:${id as ReceiverModule}`;
        }
        // User-defined alias from an `import "<lib>" as <id>;`.
        const canonical = aliases.get(id);
        if (canonical && (RECEIVER_MODULES as readonly string[]).includes(canonical)) {
            return `module:${canonical as ReceiverModule}`;
        }
    }

    return null;
}

function isInsideString(left: string): boolean {
    let inside = false;
    for (let i = 0; i < left.length; i++) {
        if (left[i] === "\\" && i + 1 < left.length) { i++; continue; }
        if (left[i] === '"') inside = !inside;
    }
    return inside;
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

// provider
export function registerCompletion(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "bnl", scheme: "file" },
            {
                async provideCompletionItems(doc, position) {
                    const items: vscode.CompletionItem[] = [];

                    const left = doc.lineAt(position.line).text.slice(0, position.character);
                    const importMatch = /(?:import|আমদানি)\s+"([^"]*)$/.exec(left);
                    if (importMatch) {
                        const typedLen = importMatch[1].length;
                        const replaceRange = new vscode.Range(
                            new vscode.Position(position.line, position.character - typedLen),
                            position,
                        );

                        const makeItem = (
                            label: string,
                            description: string,
                            filterText: string,
                            insertText: string,
                            sortText: string,
                            name: string,
                            info: BuiltinImport,
                        ) => {
                            const item = new vscode.CompletionItem(
                                { label, description },
                                vscode.CompletionItemKind.Module,
                            );
                            item.filterText = filterText;
                            item.insertText = insertText;
                            item.range = replaceRange;
                            item.sortText = sortText;
                            item.detail = `import "${name}" as ${info.alias};`;
                            const md = new vscode.MarkdownString();
                            md.appendCodeblock(`import "${name}" as ${info.alias};`, "bnl");
                            md.appendMarkdown(`\n\n${info.doc}`);
                            item.documentation = md;
                            return item;
                        };

                        for (const [name, info] of Object.entries(BUILTIN_IMPORTS)) {
                            const englishFilter = name;
                            const banglaFilter  = [info.alias, ...info.phonetic].join(" ");

                            items.push(makeItem(
                                name, `built-in — Bangla: ${info.alias}`,
                                englishFilter, name, `A_${name}`,
                                name, info,
                            ));
                            items.push(makeItem(
                                name, `built-in — Bangla: ${info.alias}`,
                                banglaFilter, name, `B_${name}`,
                                name, info,
                            ));

                            items.push(makeItem(
                                info.alias, `built-in — English: ${name}`,
                                englishFilter, info.alias, `B_${info.alias}`,
                                name, info,
                            ));
                            items.push(makeItem(
                                info.alias, `built-in — English: ${name}`,
                                banglaFilter, info.alias, `A_${info.alias}`,
                                name, info,
                            ));
                        }
                        return items;
                    }

                    if (isInsideString(left)) return items;

                    const importAliases = collectImportAliases(doc);
                    const receiver = detectReceiver(left, importAliases);
                    if (receiver === "string") { pushMembers(items, STRING_INTRINSICS, "string"); return items; }
                    if (receiver === "list")   { pushMembers(items, LIST_INTRINSICS,   "list");   return items; }
                    if (receiver && receiver.startsWith("module:")) {
                        const mod = receiver.slice("module:".length);
                        pushMembers(items, MODULES[mod], `${mod}.`);
                        return items;
                    }

                    for (const [eng, variants] of Object.entries(KEYWORD_GROUPS)) {
                        for (const v of variants) {
                            items.push(makeCompletion(v, `bnl keyword (${eng})`));
                        }
                    }

                    for (const [bangla, romans] of Object.entries(PHONETIC_ALIASES)) {
                        for (const roman of romans) {
                            const item = new vscode.CompletionItem(
                                { label: bangla, description: `phonetic: ${roman}` },
                                vscode.CompletionItemKind.Keyword,
                            );
                            item.filterText = roman;
                            item.insertText = bangla;
                            item.detail = `bnl phonetic (${roman} → ${bangla})`;
                            items.push(item);
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
            "\"",
        ),
    );
}
