/**
 * @file src/formatter.ts
 * Document formatter for bnl: brace-aware indentation only — no token
 * rewriting, no spacing changes. Idempotent on already-formatted code.
 */

import * as vscode from "vscode";

export function registerFormatter(context: vscode.ExtensionContext) {
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
