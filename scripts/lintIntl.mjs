/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([".git", "dist", "node_modules", "browser", "packages/vencord-types", "userplugins"]);
const INTL_TOKEN_START = "#{intl::";
const INTL_KEY_RE = /^[\w$+/]+$/;
const VALID_MODIFIERS = new Set(["hash", "raw"]);

const errors = [];

async function* walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const filePath = path.join(directory, entry.name);
        const normalized = filePath.split(path.sep).join(path.posix.sep);

        if (normalized.includes("src/depreciated plugins/")) continue;

        if (entry.isDirectory()) {
            if (IGNORED_DIRECTORIES.has(entry.name)) continue;
            yield* walk(filePath);
            continue;
        }

        if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) yield filePath;
    }
}

function getLocation(source, index) {
    const prefix = source.slice(0, index);
    const lines = prefix.split("\n");
    return {
        line: lines.length,
        column: lines.at(-1).length + 1
    };
}

function report(filePath, source, index, message) {
    const { line, column } = getLocation(source, index);
    errors.push(`${filePath}:${line}:${column} - ${message}`);
}

function lintIntlTokens(filePath, source, text, offset) {
    let searchIndex = 0;

    while (true) {
        const start = text.indexOf(INTL_TOKEN_START, searchIndex);
        if (start === -1) break;

        const end = text.indexOf("}", start + INTL_TOKEN_START.length);
        if (end === -1) {
            break;
        }

        const body = text.slice(start + INTL_TOKEN_START.length, end);
        const parts = body.split("::");

        if (parts.length > 2) {
            report(filePath, source, offset + start, `Invalid intl token "${text.slice(start, end + 1)}"`);
        } else {
            const [key, modifier] = parts;

            if (!INTL_KEY_RE.test(key)) {
                report(filePath, source, offset + start, `Invalid intl key "${key}"`);
            }

            if (modifier != null && !VALID_MODIFIERS.has(modifier)) {
                report(filePath, source, offset + start, `Invalid intl modifier "${modifier}"`);
            }
        }

        searchIndex = end + 1;
    }
}

function visit(filePath, source, node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        lintIntlTokens(filePath, source, node.text, node.getStart() + 1);
    } else if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
        lintIntlTokens(filePath, source, node.getText(), node.getStart());
    }

    ts.forEachChild(node, child => visit(filePath, source, child));
}

for await (const filePath of walk("src")) {
    const normalized = filePath.split(path.sep).join(path.posix.sep);
    if (normalized === "src/utils/patches.ts") continue;

    const source = await readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    visit(filePath, source, sourceFile);
}

if (errors.length) {
    console.error(`Found ${errors.length} intl lint error${errors.length === 1 ? "" : "s"}:`);
    for (const error of errors) console.error(error);
    process.exitCode = 1;
}
