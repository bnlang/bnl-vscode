/**
 * @file src/extension.ts
 * Bnlang VS Code extension entry point.
 *
 * Wires up syntax highlighting, snippets, completion, hover, and formatting
 * for the bnl language. Each feature lives in its own file; this module
 * orchestrates activation only.
 */

import * as vscode from "vscode";

import { registerCompletion } from "./completion";
import { registerHover } from "./hover";
import { registerFormatter } from "./formatter";

export { formatBnl } from "./formatter";

export function activate(context: vscode.ExtensionContext) {
    registerCompletion(context);
    registerHover(context);
    registerFormatter(context);
}

export function deactivate() { /* nothing to clean up */ }
