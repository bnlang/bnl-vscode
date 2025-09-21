/**
 * @file src/extension.ts
 * Bnlang VS Code Extension
 * Author: Mamun
 * Organization: Bnlang
 * License: MIT
 * Year: 2025
 * Description: Provides syntax highlighting, suggestions, and formatting for the Bnlang language.
 * 
 */

import * as vscode from "vscode";

const KEYWORD_GROUPS: Record<string, string[]> = {
  if: ["if", "যদি", "jodi"],
  else: ["else", "নাহলে", "nahole"],

  let: ["let", "ধরি", "dhori"],
  const: ["const", "ধ্রুবক", "dhrubok"],
  var: ["var", "চলক", "cholok"],
  function: ["function", "ফাংশন"],
  class: ["class", "শ্রেণী", "shreni"],
  extends: ["extends", "প্রসারিত", "prosarito"],
  super: ["super", "অভিভাবক", "obhibhabok"],
  static: ["static", "স্থির", "sthir"],

  for: ["for", "প্রতি", "proti"],
  while: ["while", "যতক্ষণ", "jotokkhon"],
  do: ["do", "করুন", "korun"],
  switch: ["switch", "বিকল্প", "bikolpo"],
  case: ["case", "অবস্থা", "obostha"],
  default: ["default", "অন্যথায়", "onnothay"],
  break: ["break", "থামুন", "thamun"],
  continue: ["continue", "চলুন", "colun"],
  return: ["return", "ফেরত", "ferot"],

  try: ["try", "চেষ্টা", "ceshta"],
  catch: ["catch", "ধরুন", "dhorun"],
  finally: ["finally", "অবশেষে", "obosheshe"],
  throw: ["throw", "নিক্ষেপ", "nikkhep"],

  async: ["async", "অসমলয়", "osomoloy"],
  await: ["await", "অপেক্ষা", "opekkha"],
  yield: ["yield", "উৎপন্ন_করুন", "utponno_korun"],

  new: ["new", "নতুন", "notun"],
  typeof: ["typeof", "ধরন", "dhoron"],
  instanceof: ["instanceof", "উদাহরণ_হিসেবে", "udahoron_hisebe"],
  in: ["in", "মধ্যে", "modhye"],
  of: ["of", "এর", "er"],
  void: ["void", "ফাঁকা", "faka"],
  delete: ["delete", "মুছুন", "muchun"],
  this: ["this", "এটি", "eti"],
  with: ["with", "সাথে", "sathe"],
  debugger: ["debugger", "ডিবাগার", "dibagar"],
};

const ALL_KEYWORDS = [...new Set(Object.values(KEYWORD_GROUPS).flat())];

type Member = {
  name: string;
  kind?: vscode.CompletionItemKind;
  snippet?: string;
  detail?: string;
  doc?: string;
};

type BuiltinReceiver = {
  kind: "static" | "instance";
  members: Member[];
};

function m(
  name: string,
  detail?: string,
  doc?: string,
  snippet?: string
): Member {
  return { name, detail, doc, snippet, kind: vscode.CompletionItemKind.Method };
}

const BUILTIN_MAP: Record<string, BuiltinReceiver> = {
  Math: {
    kind: "static",
    members: [
      m("abs", "abs(x: number): number", "Absolute value."),
      m("ceil", "ceil(x: number): number", "Ceiling (round up)."),
      m("floor", "floor(x: number): number", "Floor (round down)."),
      m("round", "round(x: number): number", "Round to nearest integer."),
      m("max", "max(...values: number[]): number", "Largest of values."),
      m("min", "min(...values: number[]): number", "Smallest of values."),
      m("pow", "pow(x: number, y: number): number", "x ** y."),
      m("sqrt", "sqrt(x: number): number", "Square root."),
      m("cbrt", "cbrt(x: number): number", "Cube root."),
      m("trunc", "trunc(x: number): number", "Truncate fractional part."),
      m("sign", "sign(x: number): number", "Sign of x."),
      m("random", "random(): number", "Pseudo-random in [0,1).", "random()"),
      m("sin", "sin(x: number): number"),
      m("cos", "cos(x: number): number"),
      m("tan", "tan(x: number): number"),
      m("asin", "asin(x: number): number"),
      m("acos", "acos(x: number): number"),
      m("atan", "atan(x: number): number"),
      m("atan2", "atan2(y: number, x: number): number"),
      m("sinh", "sinh(x: number): number"),
      m("cosh", "cosh(x: number): number"),
      m("tanh", "tanh(x: number): number"),
      m("asinh", "asinh(x: number): number"),
      m("acosh", "acosh(x: number): number"),
      m("atanh", "atanh(x: number): number"),
      m("exp", "exp(x: number): number"),
      m("expm1", "expm1(x: number): number"),
      m("log", "log(x: number): number"),
      m("log10", "log10(x: number): number"),
      m("log2", "log2(x: number): number"),
      m("log1p", "log1p(x: number): number"),
      m("hypot", "hypot(...values: number[]): number"),
    ],
  },
  JSON: {
    kind: "static",
    members: [
      m(
        "parse",
        "parse(text: string): any",
        "Parse JSON text.",
        "parse(${1:text})"
      ),
      m(
        "stringify",
        "stringify(value: any, replacer?, space?): string",
        "Serialize to JSON.",
        "stringify(${1:value})"
      ),
    ],
  },
  console: {
    kind: "static",
    members: [
      m("log", "log(...data: any[]): void", "Print to console.", "log(${1})"),
      m("error", "error(...data: any[]): void", "Print error.", "error(${1})"),
      m("warn", "warn(...data: any[]): void", "Print warning.", "warn(${1})"),
      m("info", "info(...data: any[]): void", "Print info.", "info(${1})"),
      m("debug", "debug(...data: any[]): void", "Print debug.", "debug(${1})"),
      m(
        "table",
        "table(tabularData: any, properties?): void",
        "Pretty table.",
        "table(${1:obj})"
      ),
      m(
        "time",
        "time(label?: string): void",
        "Start timer.",
        "time(${1:label})"
      ),
      m(
        "timeEnd",
        "timeEnd(label?: string): void",
        "End timer.",
        "timeEnd(${1:label})"
      ),
    ],
  },
  String: {
    kind: "instance",
    members: [
      m(
        "toLowerCase",
        "toLowerCase(): string",
        "Lowercase copy.",
        "toLowerCase()"
      ),
      m(
        "toUpperCase",
        "toUpperCase(): string",
        "Uppercase copy.",
        "toUpperCase()"
      ),
      m("charAt", "charAt(index: number): string", "", "charAt(${1:index})"),
      m(
        "charCodeAt",
        "charCodeAt(index: number): number",
        "",
        "charCodeAt(${1:index})"
      ),
      m(
        "includes",
        "includes(substr: string): boolean",
        "",
        "includes(${1:substr})"
      ),
      m(
        "indexOf",
        "indexOf(substr: string, fromIndex?): number",
        "",
        "indexOf(${1:substr})"
      ),
      m(
        "lastIndexOf",
        "lastIndexOf(substr: string, fromIndex?): number",
        "",
        "lastIndexOf(${1:substr})"
      ),
      m(
        "startsWith",
        "startsWith(substr: string): boolean",
        "",
        "startsWith(${1:substr})"
      ),
      m(
        "endsWith",
        "endsWith(substr: string): boolean",
        "",
        "endsWith(${1:substr})"
      ),
      m(
        "slice",
        "slice(start: number, end?): string",
        "",
        "slice(${1:start}, ${2:end})"
      ),
      m(
        "substring",
        "substring(start: number, end?): string",
        "",
        "substring(${1:start}, ${2:end})"
      ),
      m(
        "replace",
        "replace(searchValue, replaceValue): string",
        "",
        "replace(${1:search}, ${2:replacement})"
      ),
      m(
        "replaceAll",
        "replaceAll(searchValue, replaceValue): string",
        "",
        "replaceAll(${1:search}, ${2:replacement})"
      ),
      m("split", "split(separator, limit?): string[]", "", "split(${1:sep})"),
      m("trim", "trim(): string"),
      m("trimStart", "trimStart(): string"),
      m("trimEnd", "trimEnd(): string"),
      m(
        "padStart",
        "padStart(targetLength, padString?): string",
        "",
        "padStart(${1:n})"
      ),
      m(
        "padEnd",
        "padEnd(targetLength, padString?): string",
        "",
        "padEnd(${1:n})"
      ),
      m("repeat", "repeat(count: number): string", "", "repeat(${1:n})"),
      m(
        "match",
        "match(re: RegExp | string): RegExpMatchArray | null",
        "",
        "match(${1:/re/})"
      ),
      m(
        "matchAll",
        "matchAll(re: RegExp): IterableIterator<RegExpMatchArray>",
        "",
        "matchAll(${1:/re/})"
      ),
      m(
        "search",
        "search(re: RegExp | string): number",
        "",
        "search(${1:/re/})"
      ),
    ],
  },
  Array: {
    kind: "instance",
    members: [
      m("push", "push(...items: T[]): number", "", "push(${1:item})"),
      m("pop", "pop(): T | undefined"),
      m("shift", "shift(): T | undefined"),
      m("unshift", "unshift(...items: T[]): number", "", "unshift(${1:item})"),
      m(
        "slice",
        "slice(start?: number, end?: number): T[]",
        "",
        "slice(${1:start}, ${2:end})"
      ),
      m(
        "splice",
        "splice(start: number, deleteCount?: number, ...items: T[]): T[]",
        "",
        "splice(${1:start}, ${2:del})"
      ),
      m(
        "concat",
        "concat(...items: (T | T[])[]): T[]",
        "",
        "concat(${1:items})"
      ),
      m(
        "includes",
        "includes(searchElement: T, fromIndex?): boolean",
        "",
        "includes(${1:val})"
      ),
      m(
        "indexOf",
        "indexOf(searchElement: T, fromIndex?): number",
        "",
        "indexOf(${1:val})"
      ),
      m(
        "lastIndexOf",
        "lastIndexOf(searchElement: T, fromIndex?): number",
        "",
        "lastIndexOf(${1:val})"
      ),
      m("join", "join(separator?: string): string", "", "join(${1:', '})"),
      m(
        "forEach",
        "forEach(cb:(v,i,a)=>void, thisArg?): void",
        "",
        "forEach(${1:v => {}})"
      ),
      m("map", "map<U>(cb:(v,i,a)=>U, thisArg?): U[]", "", "map(${1:v => v})"),
      m(
        "filter",
        "filter(cb:(v,i,a)=>boolean, thisArg?): T[]",
        "",
        "filter(${1:v => true})"
      ),
      m(
        "reduce",
        "reduce(cb, init?): any",
        "",
        "reduce(${1:(a,v) => a}, ${2:init})"
      ),
      m(
        "reduceRight",
        "reduceRight(cb, init?): any",
        "",
        "reduceRight(${1:(a,v) => a}, ${2:init})"
      ),
      m(
        "find",
        "find(cb:(v,i,a)=>boolean, thisArg?): T | undefined",
        "",
        "find(${1:v => true})"
      ),
      m(
        "findIndex",
        "findIndex(cb:(v,i,a)=>boolean, thisArg?): number",
        "",
        "findIndex(${1:v => true})"
      ),
      m(
        "every",
        "every(cb:(v,i,a)=>boolean, thisArg?): boolean",
        "",
        "every(${1:v => true})"
      ),
      m(
        "some",
        "some(cb:(v,i,a)=>boolean, thisArg?): boolean",
        "",
        "some(${1:v => true})"
      ),
      m("flat", "flat(depth = 1): any[]", "", "flat(${1:1})"),
      m(
        "flatMap",
        "flatMap(cb:(v,i,a)=>any, thisArg?): any[]",
        "",
        "flatMap(${1:v => v})"
      ),
      m("fill", "fill(value: T, start?, end?): this", "", "fill(${1:val})"),
      m(
        "copyWithin",
        "copyWithin(target: number, start: number, end?): this",
        "",
        "copyWithin(${1:target}, ${2:start})"
      ),
      m("at", "at(index: number): T | undefined", "", "at(${1:index})"),
      m("toReversed", "toReversed(): T[]"),
      m("toSorted", "toSorted(compareFn?): T[]", "", "toSorted(${1:(a,b)=>0})"),
      m(
        "toSpliced",
        "toSpliced(start, deleteCount, ...items): T[]",
        "",
        "toSpliced(${1:start}, ${2:del})"
      ),
      m("with", "with(index, value): T[]", "", "with(${1:index}, ${2:value})"),
    ],
  },
  Number: {
    kind: "instance",
    members: [
      m("toFixed", "toFixed(digits?: number): string", "", "toFixed(${1:2})"),
      m(
        "toPrecision",
        "toPrecision(precision?: number): string",
        "",
        "toPrecision(${1:3})"
      ),
      m(
        "toExponential",
        "toExponential(fractionDigits?): string",
        "",
        "toExponential(${1:2})"
      ),
      m(
        "toString",
        "toString(radix?: number): string",
        "",
        "toString(${1:10})"
      ),
      m("valueOf", "valueOf(): number"),
      m("toLocaleString", "toLocaleString(locales?, options?): string"),
    ],
  },
};

const RECEIVER_ALIASES: Record<string, string[]> = {
  Math: ["গণিত", "gonit"],
};

const MEMBER_ALIASES: Record<string, Record<string, string[]>> = {
  Math: {
    abs: ["এবস", "poromMan"],
  },
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type ReceiverType = keyof typeof BUILTIN_MAP;

const RECEIVER_ALIAS_TO_CANON: Record<string, ReceiverType> = {};
for (const canon of Object.keys(BUILTIN_MAP)) {
  RECEIVER_ALIAS_TO_CANON[canon] = canon as ReceiverType;
}
for (const [canon, arr] of Object.entries(RECEIVER_ALIASES)) {
  for (const alias of arr)
    RECEIVER_ALIAS_TO_CANON[alias] = canon as ReceiverType;
}

const ALL_RECEIVER_WORDS = Object.keys(RECEIVER_ALIAS_TO_CANON);
const RECEIVER_BEFORE_DOT = new RegExp(
  `\\b(${ALL_RECEIVER_WORDS.map(escapeRe).join("|")})\\.\\w*$`
);

function detectReceiver(lineLeft: string): ReceiverType | null {
  const m = lineLeft.match(RECEIVER_BEFORE_DOT);
  if (m) {
    const raw = m[1];
    return RECEIVER_ALIAS_TO_CANON[raw] ?? null;
  }
  if (/(?:'[^']*'|"[^"]*"|`[^`]*`)\.\w*$/.test(lineLeft)) return "String";

  if (/\[[^\]]*\]\.\w*$/.test(lineLeft) || /\[\]\.\w*$/.test(lineLeft))
    return "Array";

  if (/\b\d+(?:\.\d+)?\.\w*$/.test(lineLeft)) return "Number";

  const idBeforeDot =
    /([A-Za-z_\$\u0980-\u09FF][\w\$\u0980-\u09FF]*)\.\w*$/.exec(lineLeft)?.[1];
  if (idBeforeDot) return RECEIVER_ALIAS_TO_CANON[idBeforeDot] ?? null;

  return null;
}

function basicFormat(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    out.push(raw);
  }
  return out;
}

function makeCompletion(
  label: string,
  detail: string,
  kind: vscode.CompletionItemKind = vscode.CompletionItemKind.Keyword,
  insertText?: string,
  doc?: string
) {
  const item = new vscode.CompletionItem(label, kind);
  item.detail = detail;
  if (insertText) item.insertText = new vscode.SnippetString(insertText);
  else item.insertText = label;
  if (doc) {
    const md = new vscode.MarkdownString(doc);
    md.supportHtml = true;
    md.isTrusted = true;
    item.documentation = md;
  }
  return item;
}

async function collectInFileWords(
  doc: vscode.TextDocument
): Promise<Set<string>> {
  const re = /[A-Za-z_$][A-Za-z0-9_$]*|[\u0980-\u09FF_][\u0980-\u09FF0-9_$]*/g;
  const set = new Set<string>();
  for (let i = 0; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;
    for (const m of text.matchAll(re)) {
      const w = m[0];
      if (w.length > 1) set.add(w);
    }
  }
  return set;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: "bnl", scheme: "file" },
      {
        async provideCompletionItems(doc, position) {
          const items: vscode.CompletionItem[] = [];

          for (const [eng, variants] of Object.entries(KEYWORD_GROUPS)) {
            for (const v of variants)
              items.push(makeCompletion(v, `BNL keyword (${eng})`));
          }

          for (const [canon, rec] of Object.entries(BUILTIN_MAP)) {
            if (rec.kind === "static") {
              items.push(
                makeCompletion(
                  canon,
                  "Built-in global",
                  vscode.CompletionItemKind.Variable
                )
              );
              const aliases = RECEIVER_ALIASES[canon] || [];
              for (const a of aliases) {
                items.push(
                  makeCompletion(
                    a,
                    `Alias of ${canon}`,
                    vscode.CompletionItemKind.Variable
                  )
                );
              }
            }
          }
          items.push(
            makeCompletion(
              "setTimeout",
              "Built-in global",
              vscode.CompletionItemKind.Function,
              "setTimeout(${1:cb}, ${2:ms})"
            )
          );
          items.push(
            makeCompletion(
              "setInterval",
              "Built-in global",
              vscode.CompletionItemKind.Function,
              "setInterval(${1:cb}, ${2:ms})"
            )
          );
          items.push(
            makeCompletion(
              "clearTimeout",
              "Built-in global",
              vscode.CompletionItemKind.Function,
              "clearTimeout(${1:id})"
            )
          );
          items.push(
            makeCompletion(
              "clearInterval",
              "Built-in global",
              vscode.CompletionItemKind.Function,
              "clearInterval(${1:id})"
            )
          );

          const words = await collectInFileWords(doc);
          for (const w of words) {
            if (!ALL_KEYWORDS.includes(w)) {
              items.push(
                makeCompletion(
                  w,
                  "In-file symbol",
                  vscode.CompletionItemKind.Text
                )
              );
            }
          }

          const lineText = doc.lineAt(position.line).text;
          const left = lineText.slice(0, position.character);
          const receiverCanon = detectReceiver(left);

          if (receiverCanon && BUILTIN_MAP[receiverCanon]) {
            const rec = BUILTIN_MAP[receiverCanon];
            const aliasMap = MEMBER_ALIASES[receiverCanon] || {};
            for (const mem of rec.members) {
              const canonicalLabel = mem.name;
              const canonicalInsert = mem.snippet ?? `${mem.name}($0)`;
              const canonicalDetail = `${receiverCanon}.${mem.detail ?? mem.name + "()"
                }`;

              items.push(
                makeCompletion(
                  canonicalLabel,
                  canonicalDetail,
                  mem.kind ?? vscode.CompletionItemKind.Method,
                  canonicalInsert,
                  mem.doc
                )
              );

              const aliases = aliasMap[mem.name] || [];
              for (const aliasName of aliases) {
                const aliasDetail = `${aliasName} → ${receiverCanon}.${mem.name}`;
                const aliasInsert = `${aliasName}($0)`;
                items.push(
                  makeCompletion(
                    aliasName,
                    aliasDetail,
                    mem.kind ?? vscode.CompletionItemKind.Method,
                    aliasInsert,
                    mem.doc
                  )
                );
              }
            }
          }

          return items;
        },
      },
      ".",
      "_"
    )
  );

  const HOVER_MAP: Record<string, string[]> = {};
  for (const [, variants] of Object.entries(KEYWORD_GROUPS)) {
    for (const v of variants) HOVER_MAP[v] = variants;
  }
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("bnl", {
      provideHover(doc, pos) {
        const range = doc.getWordRangeAtPosition(
          pos,
          /[A-Za-z_$][A-Za-z0-9_$]*|[\u0980-\u09FF_][\u0980-\u09FF0-9_$]*/
        );
        if (!range) return;
        const word = doc.getText(range);
        const variants = HOVER_MAP[word];
        if (variants) {
          const md = new vscode.MarkdownString();
          md.appendMarkdown(
            `**${word}** — aliases: \`${variants.join("`, `")}\``
          );
          return new vscode.Hover(md, range);
        }
        return;
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("bnl", {
      provideDocumentFormattingEdits(doc) {
        const start = new vscode.Position(0, 0);
        const end = doc.lineAt(doc.lineCount - 1).rangeIncludingLineBreak.end;
        const fullRange = new vscode.Range(start, end);

        const lines = Array.from(
          { length: doc.lineCount },
          (_, i) => doc.lineAt(i).text
        );

        const EOL = doc.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
        const hadFinalNewline = doc.getText().endsWith(EOL);

        const formatted =
          basicFormat(lines).join(EOL) + (hadFinalNewline ? EOL : "");

        return [vscode.TextEdit.replace(fullRange, formatted)];
      },
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bnl.formatDocument", async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed || ed.document.languageId !== "bnl") return;

      const doc = ed.document;
      const lines = Array.from(
        { length: doc.lineCount },
        (_, i) => doc.lineAt(i).text
      );

      const EOL = doc.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
      const hadFinalNewline = doc.getText().endsWith(EOL);
      const formatted =
        basicFormat(lines).join(EOL) + (hadFinalNewline ? EOL : "");

      await ed.edit((builder) => {
        const start = new vscode.Position(0, 0);
        const end = doc.lineAt(doc.lineCount - 1).rangeIncludingLineBreak.end;
        builder.replace(new vscode.Range(start, end), formatted);
      });
    })
  );
}

export function deactivate() { }
