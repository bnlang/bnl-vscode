/**
 * @file src/scanner.ts
 * Lexical pre-pass shared by the resolver, the package index, and the
 * formatter. `maskLiterals` blanks the body of every string and comment while
 * preserving offsets, lengths, and newlines, so later passes can scan for
 * structure with plain regexes without re-implementing bnl's literal rules.
 *
 * bnl has double-quoted strings (backslash escapes) and `//` line comments
 * only — see language-configuration.json.
 */

/** Identifier pattern: ASCII or Bangla, matching the rest of the extension. */
export const IDENT = "[A-Za-z_ঀ-৿][\\wঀ-৿]*";

/** Keywords that introduce a binding (`var` / `চলক` / `ধরি`). */
export const DECL_KEYWORDS = ["var", "চলক", "ধরি"];

export function maskLiterals(text: string): string {
    const out = text.split("");
    let i = 0;

    while (i < text.length) {
        if (text[i] === "/" && text[i + 1] === "/") {
            while (i < text.length && text[i] !== "\n") out[i++] = " ";
            continue;
        }

        if (text[i] === '"') {
            i++;
            while (i < text.length && text[i] !== '"' && text[i] !== "\n") {
                if (text[i] === "\\" && text[i + 1] !== undefined && text[i + 1] !== "\n") {
                    out[i++] = " ";
                }
                out[i++] = " ";
            }
            if (text[i] === '"') i++;
            continue;
        }

        i++;
    }

    return out.join("");
}

/** Brace/bracket/paren depth immediately before each offset of `masked`. */
export function depthMap(masked: string): Uint32Array {
    const depths = new Uint32Array(masked.length + 1);
    let depth = 0;
    for (let i = 0; i < masked.length; i++) {
        depths[i] = depth;
        const c = masked[i];
        if (c === "{" || c === "[" || c === "(") depth++;
        else if ((c === "}" || c === "]" || c === ")") && depth > 0) depth--;
    }
    depths[masked.length] = depth;
    return depths;
}

/** Split `inner` on commas that sit at nesting depth 0. */
export function splitTopLevel(inner: string, maskedInner: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < maskedInner.length; i++) {
        const c = maskedInner[i];
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (c === "," && depth === 0) {
            parts.push(inner.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(inner.slice(start));

    return parts.map(p => p.trim()).filter(p => p !== "");
}
