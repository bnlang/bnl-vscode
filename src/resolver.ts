/**
 * @file src/resolver.ts
 * Minimal semantic layer between an identifier and the members it carries.
 *
 * Completion used to answer "is this name a module?" from the import table
 * alone. This module adds the one step that was missing: a flow-insensitive
 * symbol table of local bindings, plus an expression resolver that follows a
 * binding to the value shape its initialiser produces. It knows nothing about
 * types beyond what MODULES / VALUE_SHAPES already declare.
 *
 * Deliberately free of `vscode` imports so it can be unit-tested directly.
 */

import { IDENT, DECL_KEYWORDS, maskLiterals } from "./scanner";
import { MODULES, VALUE_SHAPES, IMPORT_NAME_TO_CANONICAL } from "./data";

export type ValueRef =
    | { kind: "module"; name: string }
    | { kind: "shape"; name: string }
    | { kind: "package"; name: string };

/** Guards against cycles such as `var a = b; var b = a;`. */
const MAX_HOPS = 8;

const DECL = `(?:${DECL_KEYWORDS.join("|")})`;
const ASSIGNMENT = new RegExp(`(?:${DECL}\\s+)?(${IDENT})\\s*=(?!=)\\s*([^;\\n]*)`, "g");
const CALL = new RegExp(`^(${IDENT})\\s*\\.\\s*(${IDENT})\\s*\\(`);
const BARE = new RegExp(`^(${IDENT})\\s*$`);

/**
 * Local bindings in `code`, as identifier → initialiser source.
 *
 * Flow-insensitive with last-write-wins: a later binding of the same name
 * replaces an earlier one. Callers pass only the text preceding the cursor, so
 * "last write" is the binding in effect at the cursor for straight-line code.
 */
export function buildSymbolTable(code: string, premasked?: string): Map<string, string> {
    const masked = premasked ?? maskLiterals(code);
    const table = new Map<string, string>();

    for (let m: RegExpExecArray | null; (m = ASSIGNMENT.exec(masked)) !== null; ) {
        // Read the initialiser from the original text so string literals survive.
        const rhs = code.slice(m.index + m[0].length - m[2].length, m.index + m[0].length);
        table.set(m[1], rhs.trim());
    }
    ASSIGNMENT.lastIndex = 0;

    return table;
}

/** Canonical stdlib module for a name used as a receiver, if any. */
function toModule(name: string, aliases: Map<string, string>): string | null {
    if (Object.prototype.hasOwnProperty.call(MODULES, name)) return name;
    const canonical = aliases.get(name);
    return canonical && Object.prototype.hasOwnProperty.call(MODULES, canonical) ? canonical : null;
}

/**
 * Resolve what `name` refers to at the cursor.
 *
 * Order: stdlib module (or an alias of one) → package alias → local binding
 * followed through its initialiser. Returns null when nothing is known, which
 * is the signal for callers to fall back to their existing behaviour.
 */
export function resolveIdentifier(
    name: string,
    symbols: Map<string, string>,
    aliases: Map<string, string>,
    packages: Map<string, string> = new Map(),
    hops = 0,
): ValueRef | null {
    if (hops > MAX_HOPS) return null;

    const mod = toModule(name, aliases);
    if (mod) return { kind: "module", name: mod };

    const pkg = packages.get(name);
    if (pkg) return { kind: "package", name: pkg };

    const rhs = symbols.get(name);
    if (rhs === undefined) return null;

    return resolveExpression(rhs, symbols, aliases, packages, hops + 1);
}

/** Resolve an initialiser expression to the shape of the value it produces. */
export function resolveExpression(
    expr: string,
    symbols: Map<string, string>,
    aliases: Map<string, string>,
    packages: Map<string, string> = new Map(),
    hops = 0,
): ValueRef | null {
    if (hops > MAX_HOPS) return null;

    const call = CALL.exec(expr.trim());
    if (call) {
        const receiver = resolveIdentifier(call[1], symbols, aliases, packages, hops + 1);
        const shape = receiver ? memberReturn(receiver, call[2]) : null;
        return shape ? { kind: "shape", name: shape } : null;
    }

    const bare = BARE.exec(expr.trim());
    if (bare) return resolveIdentifier(bare[1], symbols, aliases, packages, hops + 1);

    return null;
}

/** The shape named by `member` on `receiver`, if that member declares one. */
function memberReturn(receiver: ValueRef, member: string): string | null {
    const members =
        receiver.kind === "module" ? MODULES[receiver.name]
        : receiver.kind === "shape" ? VALUE_SHAPES[receiver.name]?.members
        : undefined;

    return members?.find(m => m.name === member)?.returns ?? null;
}

/**
 * Local alias → imported name for imports that are not stdlib modules; these
 * are candidate workspace packages. Mirrors collectImportAliases, which keeps
 * only the stdlib half of the same syntax.
 */
export function collectPackageImports(text: string): Map<string, string> {
    const re = new RegExp(
        `(?:import|আমদানি)\\s+"([^"]+)"\\s+(?:as|যেমন)\\s+(${IDENT})`,
        "g",
    );
    const out = new Map<string, string>();

    for (let m: RegExpExecArray | null; (m = re.exec(text)) !== null; ) {
        if (!IMPORT_NAME_TO_CANONICAL[m[1]]) out.set(m[2], m[1]);
    }

    return out;
}
