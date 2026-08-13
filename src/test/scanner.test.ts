/**
 * @file src/test/scanner.test.ts
 * The lexical pre-pass every other feature is built on: literals must be
 * neutralised without moving a single offset.
 */

import * as assert from "assert";
import { test } from "node:test";

import { depthMap, maskLiterals, splitTopLevel } from "../scanner";

test("offsets, length, and newlines survive masking", () => {
    const src = `var a = "hello";\n// comment\nvar b = 2;`;
    const masked = maskLiterals(src);
    assert.strictEqual(masked.length, src.length);
    assert.strictEqual(masked.split("\n").length, src.split("\n").length);
    assert.strictEqual(masked.indexOf("var b"), src.indexOf("var b"));
});

test("string bodies are blanked but the quotes remain", () => {
    assert.strictEqual(maskLiterals(`x = "abc";`), `x = "   ";`);
});

test("delimiters and comment markers inside strings are neutralised", () => {
    assert.strictEqual(maskLiterals(`f("( { // ");`), `f("       ");`);
});

test("escaped quotes do not end a string", () => {
    // The `"` after the backslash is escaped, so the literal runs to the
    // second-to-last quote and the `(` it contains never counts as a delimiter.
    assert.strictEqual(maskLiterals(`f("a\\"b(", c);`), `f("     ", c);`);
});

test("comments are blanked to end of line only", () => {
    assert.strictEqual(maskLiterals(`a(); // x(\nb();`), `a();      \nb();`);
});

test("an unterminated string stops at the newline", () => {
    const masked = maskLiterals(`var a = "oops\nvar b = 2;`);
    assert.ok(masked.includes("var b = 2;"));
});

test("depth is reported for the position before each character", () => {
    const depths = depthMap("a(b)c");
    assert.strictEqual(depths[0], 0);   // a
    assert.strictEqual(depths[2], 1);   // b
    assert.strictEqual(depths[4], 0);   // c
});

test("unbalanced closers never drive depth negative", () => {
    const depths = depthMap(")))");
    assert.ok(Array.from(depths).every(d => d === 0));
});

test("top-level commas split, nested ones do not", () => {
    const inner = `a, f(b, c), [d, e]`;
    assert.deepStrictEqual(splitTopLevel(inner, inner), ["a", "f(b, c)", "[d, e]"]);
});

test("commas inside strings are not split points", () => {
    const inner = `"a, b", c`;
    assert.deepStrictEqual(splitTopLevel(inner, maskLiterals(inner)), [`"a, b"`, "c"]);
});

test("empty and trailing-comma argument lists are handled", () => {
    assert.deepStrictEqual(splitTopLevel("", ""), []);
    assert.deepStrictEqual(splitTopLevel("a, ", "a, "), ["a"]);
});
