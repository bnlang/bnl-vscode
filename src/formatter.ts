/**
 * @file src/formatter.ts
 * VS Code glue for the bnl formatter. The formatting itself lives in
 * format.ts so it can be exercised without an editor.
 */

import * as vscode from "vscode";

import { formatBnl } from "./format";

export { formatBnl } from "./format";

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
