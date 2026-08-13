/**
 * @file src/test/packageIndex.test.ts
 * Declaration extraction plus dependency resolution and cache invalidation,
 * exercised against real directories laid out like a bnl package.
 */

import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";

import { PackageIndex, extractDeclarations, resolveEntry } from "../packageIndex";

const MYUTILS = `function greet(name) {
    ফেরত "হ্যালো, " + name;
}

function add(a, b) {
    ফেরত a + b;
}
`;

function tempRoot(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "bnl-index-"));
}

/** Build `<root>/deps/<name>/` with a manifest and entry file. */
function writePackage(root: string, name: string, source: string, opts: {
    main?: string;
    manifest?: Record<string, unknown> | null;
} = {}): string {
    const main = opts.main ?? "src/index.bnl";
    const pkgDir = path.join(root, "deps", name);
    const entry = path.join(pkgDir, main);

    fs.mkdirSync(path.dirname(entry), { recursive: true });
    fs.writeFileSync(entry, source);

    const manifest = opts.manifest === undefined ? { name, version: "1.0.0", main } : opts.manifest;
    if (manifest !== null) {
        fs.writeFileSync(path.join(pkgDir, "bnl.json"), JSON.stringify(manifest));
    }
    return entry;
}

function names(symbols: { name: string }[] | null): string[] {
    return (symbols ?? []).map(s => s.name).sort();
}

// --- extractor ------------------------------------------------------------

test("top-level functions are extracted with their parameters", () => {
    const syms = extractDeclarations(MYUTILS);
    assert.deepStrictEqual(names(syms), ["add", "greet"]);
    assert.strictEqual(syms.find(s => s.name === "greet")?.params, "name");
    assert.strictEqual(syms.find(s => s.name === "add")?.params, "a, b");
    assert.strictEqual(syms.find(s => s.name === "add")?.line, 4);
});

test("classes, vars, and Bangla keywords are extracted", () => {
    const syms = extractDeclarations(`ফাংশন banglaFn(x) { ফেরত x; }
class Widget { }
শ্রেণী উইজেট { }
var count = 1;
ধরি নাম = "x";`);
    assert.deepStrictEqual(names(syms), ["Widget", "banglaFn", "count", "উইজেট", "নাম"]);
    assert.strictEqual(syms.find(s => s.name === "Widget")?.kind, "class");
    assert.strictEqual(syms.find(s => s.name === "count")?.kind, "var");
});

test("nested declarations are not exported", () => {
    const syms = extractDeclarations(`function outer() {
    function inner() { }
    var hidden = 1;
}
var visible = 2;`);
    assert.deepStrictEqual(names(syms), ["outer", "visible"]);
});

test("declarations in strings and comments are ignored", () => {
    const syms = extractDeclarations(`// function commented() { }
var s = "function inString() { }";
function real() { }`);
    assert.deepStrictEqual(names(syms), ["real", "s"]);
});

// H — malformed source must not throw.
test("malformed source extracts without throwing", () => {
    for (const src of [`function (`, `"unterminated`, `}}}}`, `function`, `class {`, ``]) {
        assert.doesNotThrow(() => extractDeclarations(src), JSON.stringify(src));
    }
});

// --- entry resolution (mirrors the runtime) -------------------------------

test("bnl.json main is honoured", async () => {
    const root = tempRoot();
    const entry = writePackage(root, "myutils", MYUTILS, { main: "src/index.bnl" });
    assert.strictEqual(await resolveEntry(root, "myutils"), entry);
});

test("a custom main path is honoured", async () => {
    const root = tempRoot();
    const entry = writePackage(root, "alpha", MYUTILS, { main: "lib/entry.bnl" });
    assert.strictEqual(await resolveEntry(root, "alpha"), entry);
});

test("index.bnl and <name>.bnl are the manifest-less fallbacks", async () => {
    const withIndex = tempRoot();
    const a = writePackage(withIndex, "beta", MYUTILS, { main: "index.bnl", manifest: null });
    assert.strictEqual(await resolveEntry(withIndex, "beta"), a);

    const withNamed = tempRoot();
    const b = writePackage(withNamed, "beta", MYUTILS, { main: "beta.bnl", manifest: null });
    assert.strictEqual(await resolveEntry(withNamed, "beta"), b);
});

test("native packages are skipped — they have no bnl source", async () => {
    const root = tempRoot();
    const pkgDir = path.join(root, "deps", "nativelib");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "bnl.json"), JSON.stringify({ name: "nativelib", native: "nativelib.so" }));
    assert.strictEqual(await resolveEntry(root, "nativelib"), null);
});

test("deps are found by walking up from the importing file", async () => {
    const root = tempRoot();
    writePackage(root, "myutils", MYUTILS);
    const nested = path.join(root, "a", "b", "c");
    fs.mkdirSync(nested, { recursive: true });
    assert.ok(await resolveEntry(nested, "myutils"));
});

test("unresolvable and unsafe names return null", async () => {
    const root = tempRoot();
    assert.strictEqual(await resolveEntry(root, "nope"), null);
    assert.strictEqual(await resolveEntry(root, "../escape"), null);
    assert.strictEqual(await resolveEntry(root, "a/b"), null);
});

test("a malformed manifest falls back instead of failing", async () => {
    const root = tempRoot();
    const pkgDir = path.join(root, "deps", "broken");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "bnl.json"), "{ not json");
    fs.writeFileSync(path.join(pkgDir, "index.bnl"), MYUTILS);
    assert.strictEqual(await resolveEntry(root, "broken"), path.join(pkgDir, "index.bnl"));
});

// --- C / D / E: index behaviour over time ---------------------------------

test("C — package symbols are indexed", async () => {
    const root = tempRoot();
    writePackage(root, "myutils", MYUTILS);
    const index = new PackageIndex();
    assert.deepStrictEqual(names(await index.getSymbols(root, "myutils")), ["add", "greet"]);
});

test("D — a new symbol appears after invalidation", async () => {
    const root = tempRoot();
    const entry = writePackage(root, "myutils", MYUTILS);
    const index = new PackageIndex();
    assert.deepStrictEqual(names(await index.getSymbols(root, "myutils")), ["add", "greet"]);

    fs.writeFileSync(entry, MYUTILS + `\nfunction multiply(a, b) {\n    ফেরত a * b;\n}\n`);
    index.invalidate(entry);

    assert.deepStrictEqual(names(await index.getSymbols(root, "myutils")), ["add", "greet", "multiply"]);
});

test("E — removed symbols and removed files go stale correctly", async () => {
    const root = tempRoot();
    const entry = writePackage(root, "myutils", MYUTILS);
    const index = new PackageIndex();
    assert.ok(names(await index.getSymbols(root, "myutils")).includes("add"));

    fs.writeFileSync(entry, `function greet(name) { ফেরত name; }`);
    index.invalidate(entry);
    assert.deepStrictEqual(names(await index.getSymbols(root, "myutils")), ["greet"]);

    fs.rmSync(path.join(root, "deps", "myutils"), { recursive: true });
    index.invalidate(entry);
    assert.strictEqual(await index.getSymbols(root, "myutils"), null);
});

test("results are cached, so repeat lookups do not re-read the file", async () => {
    const root = tempRoot();
    const entry = writePackage(root, "myutils", MYUTILS);
    const index = new PackageIndex();
    await index.getSymbols(root, "myutils");

    // Change on disk without notifying the index: the cache must still answer.
    fs.writeFileSync(entry, `function changed() { }`);
    assert.deepStrictEqual(names(await index.getSymbols(root, "myutils")), ["add", "greet"]);

    index.invalidate(entry);
    assert.deepStrictEqual(names(await index.getSymbols(root, "myutils")), ["changed"]);
});

test("an unresolvable package stays null without throwing", async () => {
    const index = new PackageIndex();
    assert.strictEqual(await index.getSymbols(tempRoot(), "absent"), null);
});
