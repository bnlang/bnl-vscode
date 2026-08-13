/**
 * @file src/test/resolver.test.ts
 * Return-value member resolution: assignments, aliases, chains, fallback.
 */

import * as assert from "assert";
import { test } from "node:test";

import { buildSymbolTable, collectPackageImports, resolveExpression, resolveIdentifier } from "../resolver";
import { MODULES, VALUE_SHAPES } from "../data";

const NO_ALIAS = new Map<string, string>();

function aliasesOf(source: string): Map<string, string> {
    const re = /(?:import|আমদানি)\s+"([^"]+)"\s+(?:as|যেমন)\s+([A-Za-z_ঀ-৿][\wঀ-৿]*)/g;
    const { IMPORT_NAME_TO_CANONICAL } = require("../data");
    const out = new Map<string, string>();
    for (let m: RegExpExecArray | null; (m = re.exec(source)) !== null; ) {
        const canonical = IMPORT_NAME_TO_CANONICAL[m[1]];
        if (canonical) out.set(m[2], canonical);
    }
    return out;
}

function resolve(source: string, name: string) {
    return resolveIdentifier(name, buildSymbolTable(source), aliasesOf(source), collectPackageImports(source));
}

function membersOf(shape: string): string[] {
    return VALUE_SHAPES[shape].members.map(m => m.name);
}

// A — existing module receiver completion still resolves.
test("stdlib module receiver still resolves", () => {
    const src = `import "web" as web;\n`;
    assert.deepStrictEqual(resolve(src, "web"), { kind: "module", name: "web" });
    const names = MODULES.web.map(m => m.name);
    for (const expected of ["text", "html", "json", "serve", "app"]) {
        assert.ok(names.includes(expected), `web.${expected} missing`);
    }
});

// B — the documented baseline: ধরি app = web.app();
test("web.app() resolves to the app shape with its real members", () => {
    const src = `import "web" as web;\nধরি app = web.app();\napp.`;
    assert.deepStrictEqual(resolve(src, "app"), { kind: "shape", name: "app" });

    const names = membersOf("app");
    for (const expected of ["get", "post", "put", "delete", "patch", "listen", "route", "before", "after", "head", "any", "static", "on_404", "on_error"]) {
        assert.ok(names.includes(expected), `app.${expected} missing`);
    }
});

test("app shape is map-backed, so map intrinsics apply", () => {
    assert.strictEqual(VALUE_SHAPES.app.mapBacked, true);
});

test("request.create() resolves to the instance shape", () => {
    const src = `import "request" as request;\nvar client = request.create({});`;
    assert.deepStrictEqual(resolve(src, "client"), { kind: "shape", name: "request_instance" });
    assert.ok(membersOf("request_instance").includes("post_form"));
});

// F — alias behaviour.
test("resolution works through English, Bangla, and custom aliases", () => {
    for (const src of [
        `import "web" as w;\nvar app = w.app();`,
        `আমদানি "ওয়েব" যেমন ওয়েব;\nধরি app = ওয়েব.app();`,
        `import "ওয়েব" as srv;\nচলক app = srv.app();`,
    ]) {
        assert.deepStrictEqual(resolve(src, "app"), { kind: "shape", name: "app" }, src);
    }
});

test("every var keyword introduces a binding", () => {
    for (const kw of ["var", "চলক", "ধরি"]) {
        const src = `import "web" as web;\n${kw} a = web.app();`;
        assert.deepStrictEqual(resolve(src, "a"), { kind: "shape", name: "app" }, kw);
    }
});

// Chained members: app.get(...) returns the app again.
test("chained call results keep resolving", () => {
    const src = `import "web" as web;\nvar app = web.app();\nvar same = app.get("/", h);`;
    assert.deepStrictEqual(resolve(src, "same"), { kind: "shape", name: "app" });
});

test("variable aliases follow through to the shape", () => {
    const src = `import "web" as web;\nvar app = web.app();\nvar alias = app;`;
    assert.deepStrictEqual(resolve(src, "alias"), { kind: "shape", name: "app" });
});

test("cyclic bindings terminate instead of hanging", () => {
    const src = `var a = b;\nvar b = a;`;
    assert.strictEqual(resolve(src, "a"), null);
});

// G — unresolved expressions fall back.
test("unknown receivers resolve to null so completion falls back", () => {
    assert.strictEqual(resolve(`var x = mystery();`, "x"), null);
    assert.strictEqual(resolve(`var x = 42;`, "x"), null);
    assert.strictEqual(resolve(``, "nothing"), null);
    assert.strictEqual(resolve(`import "web" as web;\nvar x = web.no_such_member();`, "x"), null);
});

test("a call with no declared return shape resolves to null", () => {
    const src = `import "web" as web;\nvar r = web.text("hi");`;
    assert.strictEqual(resolve(src, "r"), null);
});

// Symbol table semantics.
test("later bindings shadow earlier ones", () => {
    const table = buildSymbolTable(`var a = first();\nvar a = second();`);
    assert.strictEqual(table.get("a"), "second()");
});

test("assignments inside strings and comments are ignored", () => {
    const table = buildSymbolTable(`var real = web.app();\n// var fake = web.app();\nvar s = "var alsofake = x";`);
    assert.ok(table.has("real"));
    assert.ok(!table.has("fake"));
    assert.ok(!table.has("alsofake"));
});

test("equality operators are not treated as assignments", () => {
    const table = buildSymbolTable(`if (a == b) { }\nif (c != d) { }\nif (e >= f) { }`);
    assert.strictEqual(table.size, 0);
});

// H — malformed source must not throw.
test("malformed source resolves without throwing", () => {
    for (const src of [
        `var a = web.app(`,
        `import "web as web;\nvar a = web.app();`,
        `var = = =;`,
        `"unterminated`,
        `((((`,
        `var a = ;`,
    ]) {
        assert.doesNotThrow(() => resolve(src, "a"), src);
    }
});

// Package import collection keeps stdlib and packages apart.
test("package imports exclude stdlib modules", () => {
    const src = `import "web" as web;\nimport "myutils" as utils;\nআমদানি "other" যেমন o;`;
    const pkgs = collectPackageImports(src);
    assert.strictEqual(pkgs.get("utils"), "myutils");
    assert.strictEqual(pkgs.get("o"), "other");
    assert.ok(!pkgs.has("web"));
});

test("a package alias resolves to a package ref", () => {
    const src = `import "myutils" as utils;`;
    assert.deepStrictEqual(resolve(src, "utils"), { kind: "package", name: "myutils" });
});

test("expressions resolve directly too", () => {
    const aliases = new Map([["web", "web"]]);
    assert.deepStrictEqual(
        resolveExpression("web.app()", new Map(), aliases, NO_ALIAS),
        { kind: "shape", name: "app" },
    );
});
