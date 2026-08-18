/**
 * @file src/completion.ts
 * Completion provider for bnl. Surfaces keywords (English + Bangla),
 * phonetic aliases, globals, built-in module names inside `import "..."`,
 * receiver-aware member completion (string / list / module), and in-file
 * symbol echo.
 */

import * as path from "path";

import * as vscode from "vscode";

import {
    ALL_KEYWORDS,
    BUILTIN_IMPORTS,
    BuiltinImport,
    GLOBALS,
    IMPORT_NAME_TO_CANONICAL,
    KEYWORD_GROUPS,
    LIST_INTRINSICS,
    MAP_INTRINSICS,
    MODULES,
    Member,
    PHONETIC_ALIASES,
    STRING_INTRINSICS,
    VALUE_SHAPES,
} from "./data";
import { IDENT, maskLiterals } from "./scanner";
import { buildSymbolTable, collectPackageImports, resolveIdentifier } from "./resolver";
import { PackageIndex, PackageSymbol } from "./packageIndex";

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

/**
 * Masked document text, memoised per document version. Masking is the only
 * whole-document work on the completion path, and the document rarely changes
 * between the keystrokes that trigger member completion.
 */
const maskedCache = new WeakMap<vscode.TextDocument, { version: number; masked: string }>();

function maskedTextOf(doc: vscode.TextDocument, text: string): string {
    const hit = maskedCache.get(doc);
    if (hit && hit.version === doc.version) return hit.masked;

    const masked = maskLiterals(text);
    maskedCache.set(doc, { version: doc.version, masked });
    return masked;
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

/**
 * Receivers recognised from the literal syntax alone. Identifier receivers are
 * resolved semantically instead — see resolver.ts.
 */
type LiteralReceiver = "string" | "list" | null;

function detectLiteralReceiver(left: string): LiteralReceiver {
    if (/(?:"[^"]*")\.\w*$/.test(left)) return "string";
    if (/\][^.]*\.\w*$/.test(left)) return "list";
    return null;
}

const RECEIVER_IDENT = new RegExp(`(${IDENT})\\s*\\.\\w*$`);

function detectReceiverIdentifier(left: string): string | null {
    return RECEIVER_IDENT.exec(left)?.[1] ?? null;
}

function pushPackageSymbols(items: vscode.CompletionItem[], symbols: PackageSymbol[], alias: string) {
    for (const s of symbols) {
        const signature = s.kind === "function" ? `${s.name}(${s.params ?? ""})` : s.name;
        items.push(makeCompletion(
            s.name,
            `${alias}.${signature}`,
            s.kind === "function" ? vscode.CompletionItemKind.Function
                : s.kind === "class" ? vscode.CompletionItemKind.Class
                : vscode.CompletionItemKind.Variable,
            s.kind === "function" ? `${s.name}(${s.params ? "${0}" : ""})` : s.name,
            `Declared in \`${s.file}\` at line ${s.line + 1}.`,
        ));
    }
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
    const index = new PackageIndex();

    // Package sources and manifests change rarely, so watching them is far
    // cheaper than revalidating anything on the completion path.
    const watcher = vscode.workspace.createFileSystemWatcher("**/{*.bnl,bnl.json}");
    watcher.onDidChange(uri => index.invalidate(uri.fsPath));
    watcher.onDidCreate(uri => index.invalidate(uri.fsPath));
    watcher.onDidDelete(uri => index.invalidate(uri.fsPath));
    context.subscriptions.push(watcher);

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

                    const literal = detectLiteralReceiver(left);
                    if (literal === "string") { pushMembers(items, STRING_INTRINSICS, "string"); return items; }
                    if (literal === "list")   { pushMembers(items, LIST_INTRINSICS,   "list");   return items; }

                    // Semantic receiver resolution. Every failure path below
                    // falls through to the generic completion that follows.
                    const receiver = detectReceiverIdentifier(left);
                    if (receiver) {
                        const text   = doc.getText();
                        const offset = doc.offsetAt(position);
                        const masked = maskedTextOf(doc, text);

                        const aliases  = collectImportAliases(doc);
                        const packages = collectPackageImports(text);
                        const symbols  = buildSymbolTable(
                            text.slice(0, offset),
                            masked.slice(0, offset),
                        );

                        const ref = resolveIdentifier(receiver, symbols, aliases, packages);

                        if (ref?.kind === "module") {
                            pushMembers(items, MODULES[ref.name], "");
                            return items;
                        }

                        if (ref?.kind === "shape") {
                            const shape = VALUE_SHAPES[ref.name];
                            if (shape) {
                                pushMembers(items, shape.members, receiver);
                                if (shape.mapBacked) pushMembers(items, MAP_INTRINSICS, receiver);
                                return items;
                            }
                        }

                        if (ref?.kind === "package") {
                            const found = await index.getSymbols(
                                path.dirname(doc.uri.fsPath),
                                ref.name,
                            );
                            if (found && found.length > 0) {
                                pushPackageSymbols(items, found, receiver);
                                return items;
                            }
                        }
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
