/**
 * @file src/test/format.test.ts
 * Formatter: existing indentation behaviour, parenthesis-aware wrapping,
 * literal preservation, and idempotence.
 */

import * as assert from "assert";
import { test } from "node:test";

import { formatBnl } from "../format";

const INDENT = "    ";

const fmt = (src: string) => formatBnl(src, INDENT);

/** format(format(x)) === format(x), checked on every sample below. */
function assertIdempotent(src: string) {
    const once = fmt(src);
    assert.strictEqual(fmt(once), once, `not idempotent:\n${once}`);
}

// --- existing behaviour must survive --------------------------------------

test("brace indentation is unchanged", () => {
    const src = `function greet(name) {\nফেরত name;\n}`;
    assert.strictEqual(fmt(src), `function greet(name) {\n${INDENT}ফেরত name;\n}`);
});

test("nested blocks and else-chains keep their shape", () => {
    const src = `if (a) {\nif (b) {\nprint(1);\n}\n} else {\nprint(2);\n}`;
    assert.strictEqual(fmt(src), [
        `if (a) {`,
        `${INDENT}if (b) {`,
        `${INDENT}${INDENT}print(1);`,
        `${INDENT}}`,
        `} else {`,
        `${INDENT}print(2);`,
        `}`,
    ].join("\n"));
    assertIdempotent(src);
});

test("a callback block indents one level, not one per delimiter", () => {
    const src = `app.get("/", function (req) {\nফেরত web.text("hi");\n});`;
    assert.strictEqual(fmt(src), [
        `app.get("/", function (req) {`,
        `${INDENT}ফেরত web.text("hi");`,
        `});`,
    ].join("\n"));
    assertIdempotent(src);
});

test("blank lines and trailing newline are preserved", () => {
    assert.strictEqual(fmt(`var a = 1;\n\nvar b = 2;\n`), `var a = 1;\n\nvar b = 2;\n`);
});

test("tab indentation is honoured", () => {
    assert.strictEqual(formatBnl(`function f() {\nreturn 1;\n}`, "\t"), `function f() {\n\treturn 1;\n}`);
});

// --- J: short calls are left alone ----------------------------------------

test("J — short calls stay on one line", () => {
    for (const src of [
        `লিখুন(greet("পৃথিবী"));`,
        `var x = add(1, 2);`,
        `print(a, b, c);`,
        `var app = web.app();`,
    ]) {
        assert.strictEqual(fmt(src), src, src);
        assertIdempotent(src);
    }
});

// --- I: long nested calls wrap --------------------------------------------

test("I — the documented baseline wraps readably", () => {
    const src = `লিখুন(greet("পৃথিবী", 25, "test@example.com", "Dhaka", "Bangladesh", "Student", "Computer Science", "Green University of Bangladesh"));`;

    assert.strictEqual(fmt(src), [
        `লিখুন(`,
        `${INDENT}greet(`,
        `${INDENT}${INDENT}"পৃথিবী",`,
        `${INDENT}${INDENT}25,`,
        `${INDENT}${INDENT}"test@example.com",`,
        `${INDENT}${INDENT}"Dhaka",`,
        `${INDENT}${INDENT}"Bangladesh",`,
        `${INDENT}${INDENT}"Student",`,
        `${INDENT}${INDENT}"Computer Science",`,
        `${INDENT}${INDENT}"Green University of Bangladesh"`,
        `${INDENT})`,
        `);`,
    ].join("\n"));
});

test("wrapping respects the enclosing indentation", () => {
    const src = `function f() {\nলিখুন(greet("পৃথিবী", 25, "test@example.com", "Dhaka", "Bangladesh", "Student", "Computer Science", "Green University"));\n}`;
    const lines = fmt(src).split("\n");
    assert.strictEqual(lines[1], `${INDENT}লিখুন(`);
    assert.strictEqual(lines[2], `${INDENT}${INDENT}greet(`);
    assert.strictEqual(lines[lines.length - 2], `${INDENT});`);
    assertIdempotent(src);
});

test("a long single-argument call is left alone when splitting gains nothing", () => {
    const src = `print("${"x".repeat(140)}");`;
    assert.strictEqual(fmt(src), src);
    assertIdempotent(src);
});

test("lines containing braces are left to the indent pass", () => {
    const src = `register({ name: "a very long value here", other: "another quite long value", third: "and more still" }, callback);`;
    assert.strictEqual(fmt(src), src);
    assertIdempotent(src);
});

test("already-wrapped code is not rejoined", () => {
    const src = [
        `try_call(`,
        `${INDENT}function () { return expr; },`,
        `${INDENT}function (err) { return fallback; }`,
        `)`,
    ].join("\n");
    assert.strictEqual(fmt(src), src);
});

// --- K / L: literals must survive untouched -------------------------------

test("K — string contents are preserved exactly", () => {
    const src = `print("a,b,c   (weird)  \\" { } // not a comment", "দ্বিতীয়");`;
    assert.strictEqual(fmt(src), src);
    assertIdempotent(src);
});

test("K — commas inside strings never become split points", () => {
    const long = `লিখুন(greet("one, two, three, four, five", "six, seven, eight, nine", "ten, eleven, twelve, thirteen", "x"));`;
    const out = fmt(long);
    assert.ok(out.includes(`"one, two, three, four, five",`), out);
    assert.ok(!out.includes(`"one,\n`), out);
    assertIdempotent(long);
});

test("L — comments are preserved", () => {
    const src = `// a comment with ( unbalanced parens and "quotes\nvar a = 1; // trailing\n// }`;
    assert.strictEqual(fmt(src), src);
    assertIdempotent(src);
});

test("L — a brace inside a comment does not change indentation", () => {
    const src = `function f() {\n// {\nreturn 1;\n}`;
    assert.strictEqual(fmt(src), `function f() {\n${INDENT}// {\n${INDENT}return 1;\n}`);
});

// --- M: idempotence -------------------------------------------------------

test("M — formatting twice is identical across a corpus", () => {
    for (const src of [
        `লিখুন(greet("পৃথিবী", 25, "test@example.com", "Dhaka", "Bangladesh", "Student", "Computer Science", "Green University of Bangladesh"));`,
        `function greet(name, age, email, city, country) {\nফেরত name;\n}`,
        `if (a) { print(1); } else { print(2); }`,
        `var m = {\na: 1,\nb: [1, 2, 3],\n};`,
        `app.get("/", function (req) { ফেরত web.text("hi"); });`,
        `deeply(nested(call(with_(many("arguments here", "and more here", "and even more here too", "yet more")))));`,
        ``,
        `\n\n`,
        `((((`,
        `"unterminated`,
    ]) {
        assertIdempotent(src);
    }
});

// --- H: malformed input ---------------------------------------------------

test("malformed source formats without throwing", () => {
    for (const src of [`}}}}`, `((((`, `"unterminated`, `var = ;`, `)))`]) {
        assert.doesNotThrow(() => fmt(src), src);
    }
});
