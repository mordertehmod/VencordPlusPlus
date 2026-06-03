/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([".git", "dist", "node_modules", "browser", "packages/vencord-types", "userplugins"]);
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

function propertyNameText(name) {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    return undefined;
}

function findProperty(object, name) {
    return object.properties.find(property =>
        ts.isPropertyAssignment(property) && propertyNameText(property.name) === name
    );
}

function report(sourceFile, node, message) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    errors.push(`${sourceFile.fileName}:${line + 1}:${character + 1} - ${message}`);
}

function lintReplacement(sourceFile, replacement) {
    if (ts.isArrayLiteralExpression(replacement)) {
        for (const element of replacement.elements) {
            if (ts.isObjectLiteralExpression(element)) lintReplacementObject(sourceFile, element);
        }
        return;
    }

    if (ts.isObjectLiteralExpression(replacement)) lintReplacementObject(sourceFile, replacement);
}

function lintReplacementObject(sourceFile, replacement) {
    const hasMatch = Boolean(findProperty(replacement, "match"));
    const hasReplace = Boolean(findProperty(replacement, "replace"));

    if (hasMatch !== hasReplace) {
        report(sourceFile, replacement, "Patch replacement objects must define both match and replace");
    }
}

function lintPatchObject(sourceFile, patch) {
    const find = findProperty(patch, "find");
    const replacement = findProperty(patch, "replacement");

    if (!find && !replacement) return;

    if (!find) report(sourceFile, patch, "Patch objects must define find");
    if (!replacement) report(sourceFile, patch, "Patch objects must define replacement");
    if (replacement) lintReplacement(sourceFile, replacement.initializer);
}

function visit(sourceFile, node) {
    if (
        ts.isPropertyAssignment(node) &&
        propertyNameText(node.name) === "patches" &&
        ts.isArrayLiteralExpression(node.initializer)
    ) {
        for (const element of node.initializer.elements) {
            if (ts.isObjectLiteralExpression(element)) lintPatchObject(sourceFile, element);
        }
    }

    ts.forEachChild(node, child => visit(sourceFile, child));
}

for await (const filePath of walk("src")) {
    const source = await readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    visit(sourceFile, sourceFile);
}

if (errors.length) {
    console.error(`Found ${errors.length} patch lint error${errors.length === 1 ? "" : "s"}:`);
    for (const error of errors) console.error(error);
    process.exitCode = 1;
}
