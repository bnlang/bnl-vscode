/**
 * @file src/format.ts
 * Formatting core for bnl — pure text in, pure text out, no editor types.
 * Two passes, no token rewriting and no spacing changes:
 *
 *   1. indentation — tracks `(` and `[` alongside `{`, so continuation lines
 *      inside an open call indent instead of collapsing to brace depth.
 *   2. wrapping — splits a call that sits on one physical line and exceeds
 *      MAX_WIDTH at its top-level commas.
 *
 * Idempotence is structural rather than merely tested: the wrapper only ever
 * considers a line whose delimiters balance, and the lines it emits are either
 * short or unbalanced. Re-running therefore has nothing left to wrap, and it
 * never rejoins what a user split by hand.
 */

import { maskLiterals, splitTopLevel } from "./scanner";

/** Column past which a single-line call becomes a candidate for wrapping. */
const MAX_WIDTH = 100;

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
        out.push(...wrapStatement(content, printDepth, indentUnit));
        depth = Math.max(0, depth + netOpen - netClose);
    }

    let result = out.join("\n");
    if (text.endsWith("\n") && !result.endsWith("\n")) result += "\n";
    return result;
}

const OPENERS = "{[(";
const CLOSERS = "}])";

function analyzeLine(line: string): { netOpen: number; netClose: number; leadingClose: number } {
    const masked = maskLiterals(line);

    let leadingClose = 0;
    for (let i = 0; i < masked.length; i++) {
        const c = masked[i];
        if (CLOSERS.includes(c)) { leadingClose++; continue; }
        if (/\s/.test(c)) continue;
        break;
    }

    // Openers still unclosed at end of line, plus closers with no opener here.
    const unclosed: string[] = [];
    let netClose = 0;

    for (const c of masked) {
        if (OPENERS.includes(c)) unclosed.push(c);
        else if (CLOSERS.includes(c)) {
            if (unclosed.length > 0) unclosed.pop();
            else netClose++;
        }
    }

    // A line that opens a block indents by that block alone: `f(function () {`
    // adds one level, not two. Parens only drive indentation on lines that end
    // mid-expression, which is where the old brace-only pass gave up.
    const braces = unclosed.filter(c => c === "{").length;
    const netOpen = braces > 0 ? braces : unclosed.length;

    return { netOpen, netClose, leadingClose };
}

/**
 * Wrap a single-line statement across several lines when it is too long.
 *
 * Returns the line unchanged unless every condition holds: it exceeds
 * MAX_WIDTH, its delimiters balance (so it really is one whole statement), it
 * carries no braces (block and map-literal layout stays with the indent pass),
 * and splitting actually yields more than one argument.
 */
function wrapStatement(content: string, depth: number, indentUnit: string): string[] {
    const indent = indentUnit.repeat(depth);
    const line = indent + content;

    if (line.length <= MAX_WIDTH) return [line];

    const masked = maskLiterals(content);
    if (masked.includes("{") || masked.includes("}")) return [line];
    if (!isBalanced(masked)) return [line];

    const wrapped = wrapCall(content, depth, indentUnit);
    return wrapped ?? [line];
}

function isBalanced(masked: string): boolean {
    let depth = 0;
    for (const c of masked) {
        if (OPENERS.includes(c)) depth++;
        else if (CLOSERS.includes(c)) {
            if (--depth < 0) return false;
        }
    }
    return depth === 0;
}

/**
 * Split `expr` at the outermost call's top-level commas, recursing into any
 * argument that is still too long. Returns null when there is nothing to gain.
 */
function wrapCall(expr: string, depth: number, indentUnit: string): string[] | null {
    const masked = maskLiterals(expr);

    const open = findOutermostOpen(masked);
    if (open < 0) return null;

    const close = matchingClose(masked, open);
    if (close < 0) return null;

    const head = expr.slice(0, open + 1);
    const tail = expr.slice(close);
    const args = splitTopLevel(expr.slice(open + 1, close), masked.slice(open + 1, close));
    if (args.length === 0) return null;

    const indent = indentUnit.repeat(depth);
    const inner = indentUnit.repeat(depth + 1);
    const out = [indent + head];
    let improved = args.length > 1;

    args.forEach((arg, i) => {
        const suffix = i < args.length - 1 ? "," : "";
        const candidate = inner + arg + suffix;

        if (candidate.length > MAX_WIDTH) {
            const nested = wrapCall(arg + suffix, depth + 1, indentUnit);
            if (nested) { out.push(...nested); improved = true; return; }
        }
        out.push(candidate);
    });

    // A lone argument that is still too long and cannot be split further has
    // only moved the overflow down a line — leave the original alone.
    if (!improved) return null;

    out.push(indent + tail);
    return out;
}

/** Index of the first `(` or `[` that opens the outermost group. */
function findOutermostOpen(masked: string): number {
    for (let i = 0; i < masked.length; i++) {
        if (masked[i] === "(" || masked[i] === "[") return i;
    }
    return -1;
}

function matchingClose(masked: string, open: number): number {
    let depth = 0;
    for (let i = open; i < masked.length; i++) {
        if (OPENERS.includes(masked[i])) depth++;
        else if (CLOSERS.includes(masked[i]) && --depth === 0) return i;
    }
    return -1;
}
