/**
 * @file src/hover.ts
 * Hover provider for bnl: shows keyword alias groups and global function
 * signatures when the cursor is on a known identifier.
 */

import * as vscode from "vscode";

import { GLOBALS, Global, KEYWORD_GROUPS } from "./data";

export function registerHover(context: vscode.ExtensionContext) {
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
}
