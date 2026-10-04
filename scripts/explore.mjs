import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const require = createRequire(import.meta.url);
const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");
const TypeScript = require("tree-sitter-typescript");
const root = resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());
process.chdir(root);

const extensions = new Map([
  [".js", ["javascript", JavaScript]],
  [".jsx", ["javascript", JavaScript]],
  [".mjs", ["javascript", JavaScript]],
  [".cjs", ["javascript", JavaScript]],
  [".ts", ["typescript", TypeScript.typescript]],
  [".tsx", ["tsx", TypeScript.tsx]],
  [".mts", ["typescript", TypeScript.typescript]],
  [".cts", ["typescript", TypeScript.typescript]],
]);
const ignoredDirectories = new Set([
  ".git", ".codex", ".agents", "node_modules", "dist", "build", "coverage", ".next",
  ".cache", ".vite", ".firebase", "playwright-report", "test-results", "generated",
]);
const isPrivatePath = (candidate) => candidate.replaceAll("\\", "/").split("/").some((part) =>
  (part.startsWith(".env") && part !== ".env.example") || /^CREDENTIALS(?:\.|$)/i.test(part),
);
const relativePath = (absolute) => relative(root, absolute).replaceAll("\\", "/");
const ensureInside = (absolute, label, allowRoot = false) => {
  const rel = relativePath(absolute);
  if ((!allowRoot && !rel) || rel.startsWith("..") || resolve(root, rel) !== absolute) throw new Error(label + " must stay inside the repository");
  if (isPrivatePath(rel)) throw new Error(label + " may not reference a private path");
  return rel;
};
const ensureNoSymlink = (absolute, label) => {
  let current = absolute;
  while (current !== dirname(current)) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(label + " may not be a symlink or symlink ancestor");
    current = dirname(current);
  }
  const real = realpathSync(absolute);
  const rel = relative(root, real);
  if (rel.startsWith("..")) throw new Error(label + " may not escape the repository through a symlink");
};
const shouldSkipDirectory = (absolute) => {
  const rel = relativePath(absolute);
  const pieces = rel.split("/");
  return pieces.some((piece) => ignoredDirectories.has(piece) || piece.startsWith(".env") || /^CREDENTIALS(?:\.|$)/i.test(piece)) ||
    rel === "docs/agents/build-logs" || rel.startsWith("docs/agents/build-logs/") ||
    rel === "docs/agents/verification" || rel.startsWith("docs/agents/verification/");
};
const collect = (input) => {
  const absolute = resolve(process.cwd(), input);
  ensureInside(absolute, "input path", true);
  if (!existsSync(absolute)) throw new Error("input path does not exist: " + input);
  ensureNoSymlink(absolute, "input path");
  const info = lstatSync(absolute);
  if (info.isFile()) {
    if (shouldSkipDirectory(dirname(absolute))) throw new Error("input path is inside an ignored directory: " + input);
    if (!extensions.has(extname(absolute).toLowerCase())) throw new Error("unsupported source extension: " + input);
    return [absolute];
  }
  if (!info.isDirectory()) throw new Error("input path must be a file or directory: " + input);
  if (shouldSkipDirectory(absolute)) return [];
  const found = [];
  const visit = (directory) => {
    if (shouldSkipDirectory(directory) && directory !== absolute) return;
    const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const child = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("symlink escape or symlink input encountered: " + relativePath(child));
      if (entry.isDirectory()) {
        if (!shouldSkipDirectory(child)) visit(child);
      } else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase()) && !isPrivatePath(relativePath(child))) {
        found.push(child);
      }
    }
  };
  visit(absolute);
  return found;
};

const args = process.argv.slice(2);
const inputs = [];
let queryPath;
let json = false;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--json") {
    json = true;
  } else if (arg === "--query") {
    if (queryPath !== undefined || index === args.length - 1 || args[index + 1].startsWith("--")) throw new Error("--query requires one path");
    queryPath = resolve(process.cwd(), args[++index]);
  } else if (arg.startsWith("--")) {
    throw new Error("unknown option: " + arg);
  } else {
    inputs.push(arg);
  }
}
if (inputs.length === 0) throw new Error("Usage: npm run explore -- <file-or-directory>... [--query query.scm] [--json]");
let querySource;
if (queryPath !== undefined) {
  ensureInside(queryPath, "query path");
  if (!existsSync(queryPath)) throw new Error("query path does not exist");
  ensureNoSymlink(queryPath, "query path");
  if (shouldSkipDirectory(dirname(queryPath))) throw new Error("query path is inside an ignored directory");
  if (!lstatSync(queryPath).isFile() || extname(queryPath).toLowerCase() !== ".scm") throw new Error("query path must be a .scm file");
  querySource = readFileSync(queryPath, "utf8");
  if (querySource.length > 200_000) throw new Error("query file exceeds 200000 characters");
}

const position = (node) => ({
  line: node.startPosition.row + 1,
  column: node.startPosition.column + 1,
});
const endPosition = (node) => ({
  line: node.endPosition.row + 1,
  column: node.endPosition.column + 1,
});
const location = (node) => ({ start: position(node), end: endPosition(node) });
const item = (name, kind, node, extra = {}) => ({
  name,
  kind,
  location: location(node),
  ...extra,
});
const namedChildren = (node) => Array.from({ length: node.namedChildCount }, (_, index) => node.namedChild(index));
const stringValue = (node) => {
  if (!node) return undefined;
  const text = node.text;
  return text.length > 1 && ["\"", "'", String.fromCharCode(96)].includes(text[0]) ? text.slice(1, -1) : text;
};

const importsFor = (node) => {
  const clause = node.namedChildren.find((child) => child.type === "import_clause");
  const source = stringValue(node.childForFieldName("source"));
  if (!clause) return [];
  const result = [];
  for (const child of namedChildren(clause)) {
    if (child.type === "identifier" || child.type === "type_identifier") {
      result.push(item(child.text, "default", child, { source }));
    } else if (child.type === "namespace_import") {
      const name = child.namedChildren.at(-1);
      if (name) result.push(item(name.text, "namespace", name, { source }));
    } else if (child.type === "named_imports") {
      for (const specifier of namedChildren(child)) {
        if (specifier.type !== "import_specifier") continue;
        const name = specifier.childForFieldName("name") ?? specifier.namedChildren[0];
        const alias = specifier.childForFieldName("alias");
        if (name) result.push(item(alias?.text ?? name.text, "named", alias ?? name, { source, imported: name.text }));
      }
    }
  }
  return result;
};
const commonjsImportsFor = (node) => {
  if (node.type !== "lexical_declaration" && node.type !== "variable_declaration") return [];
  const result = [];
  for (const declarator of namedChildren(node).filter((child) => child.type === "variable_declarator")) {
    const value = declarator.childForFieldName("value");
    const name = declarator.childForFieldName("name");
    if (value?.type !== "call_expression" || value.childForFieldName("function")?.text !== "require") continue;
    const source = stringValue(value.childForFieldName("arguments")?.namedChildren[0]);
    if (source === undefined || !name || name.type !== "identifier") continue;
    result.push(item(name.text, "require", name, { source }));
  }
  return result;
};
const commonjsExportsFor = (node) => {
  if (node.type !== "expression_statement") return [];
  const assignment = node.namedChildren.find((child) => child.type === "assignment_expression");
  const left = assignment?.childForFieldName("left");
  if (!left || left.type !== "member_expression") return [];
  const object = left.childForFieldName("object");
  const property = left.childForFieldName("property");
  const moduleExports = object?.type === "identifier" && object.text === "module" && property?.text === "exports";
  const nestedModuleExports = object?.type === "member_expression" &&
    object.childForFieldName("object")?.text === "module" && object.childForFieldName("property")?.text === "exports";
  if (moduleExports) return [item("default", "commonjs", left)];
  if (nestedModuleExports && property) return [item(property.text, "commonjs", property)];
  if (object?.type === "identifier" && object.text === "exports" && property) return [item(property.text, "commonjs", property)];
  return [];
};

const declarationNodeTypes = new Map([
  ["function_declaration", "function"],
  ["generator_function_declaration", "function"],
  ["class_declaration", "class"],
  ["abstract_class_declaration", "class"],
  ["interface_declaration", "interface"],
  ["type_alias_declaration", "type"],
  ["enum_declaration", "enum"],
  ["internal_module", "namespace"],
  ["module", "namespace"],
]);
const declarationItems = (node) => {
  if (!node) return [];
  if (node.type === "lexical_declaration" || node.type === "variable_declaration") {
    return namedChildren(node).filter((child) => child.type === "variable_declarator").flatMap((declarator) => {
      const name = declarator.childForFieldName("name");
      return name && ["identifier", "type_identifier", "property_identifier"].includes(name.type)
        ? [item(name.text, "variable", name)]
        : [];
    });
  }
  if (declarationNodeTypes.has(node.type)) {
    const name = node.childForFieldName("name");
    return name ? [item(name.text, declarationNodeTypes.get(node.type), name)] : [];
  }
  if (node.type === "ambient_declaration") return namedChildren(node).flatMap(declarationItems);
  return [];
};
const exportsFor = (node) => {
  const source = stringValue(node.childForFieldName("source"));
  const result = [];
  const declaration = node.childForFieldName("declaration");
  if (declaration) {
    const declarations = declarationItems(declaration);
    for (const found of declarations) result.push({ ...found, kind: "declaration", source });
    if (declarations.length === 0) {
      const fallback = declaration.childForFieldName("name") ?? declaration;
      result.push(item("default", "default", fallback, { source }));
    }
    return result;
  }
  const clause = node.namedChildren.find((child) => child.type === "export_clause");
  if (clause) {
    for (const specifier of namedChildren(clause)) {
      if (specifier.type !== "export_specifier") continue;
      const name = specifier.childForFieldName("name") ?? specifier.namedChildren[0];
      const alias = specifier.childForFieldName("alias");
      if (name) result.push(item(alias?.text ?? name.text, alias ? "alias" : "named", alias ?? name, { source, local: name.text }));
    }
  } else {
    const namespace = node.namedChildren.find((child) => child.type === "namespace_export");
    const namespaceName = namespace?.namedChildren.at(-1);
    if (namespaceName) {
      result.push(item(namespaceName.text, "namespace", namespaceName, { source }));
    } else if (source !== undefined) {
      result.push(item("*", "star", node, { source }));
    }
  }
  if (result.length === 0 && node.childForFieldName("value")) {
    result.push(item("default", "default", node, { source }));
  }
  return result;
};
const sortedItems = (items) => items.sort((a, b) =>
  a.location.start.line - b.location.start.line ||
  a.location.start.column - b.location.start.column ||
  a.name.localeCompare(b.name) ||
  a.kind.localeCompare(b.kind),
);
const inspect = (absolute) => {
  const source = readFileSync(absolute, "utf8");
  const [language, grammar] = extensions.get(extname(absolute).toLowerCase());
  const parser = new Parser();
  parser.setLanguage(grammar);
  const tree = parser.parse(source);
  const rel = relativePath(absolute);
  if (tree.rootNode.hasError) throw new Error("parse error in " + rel);
  const imports = [];
  const exports = [];
  const declarations = [];
  for (const child of namedChildren(tree.rootNode)) {
    if (child.type === "import_statement") imports.push(...importsFor(child));
    imports.push(...commonjsImportsFor(child));
    if (child.type === "export_statement") exports.push(...exportsFor(child));
    exports.push(...commonjsExportsFor(child));
    declarations.push(...declarationItems(child.type === "export_statement" ? child.childForFieldName("declaration") : child));
  }
  const result = {
    path: rel,
    language,
    imports: sortedItems(imports),
    exports: sortedItems(exports),
    declarations: sortedItems(declarations),
  };
  if (querySource !== undefined) {
    let query;
    try {
      query = new Parser.Query(grammar, querySource);
    } catch (error) {
      throw new Error("invalid query for " + rel + ": " + error.message);
    }
    result.captures = query.captures(tree.rootNode).map(({ name, node }) => ({
      name,
      type: node.type,
      ...(new Set(["identifier", "type_identifier", "property_identifier", "shorthand_property_identifier_pattern", "string_fragment"]).has(node.type)
        ? { text: node.text }
        : {}),
      location: location(node),
    })).sort((a, b) =>
      a.location.start.line - b.location.start.line ||
      a.location.start.column - b.location.start.column ||
      a.name.localeCompare(b.name) ||
      a.type.localeCompare(b.type),
    );
  }
  return result;
};

const files = [...new Set(inputs.flatMap(collect))].sort((a, b) => relativePath(a).localeCompare(relativePath(b)));
if (files.length === 0) throw new Error("no supported source files found");
const results = files.map(inspect);
if (json) {
  process.stdout.write(JSON.stringify({ files: results }, null, 2) + "\n");
} else {
  for (const result of results) {
    process.stdout.write(result.path + " (" + result.language + ")\n");
    for (const group of ["imports", "exports", "declarations"]) {
      for (const found of result[group]) {
        process.stdout.write("  " + group.slice(0, -1) + " " + found.name + " @" + found.location.start.line + ":" + found.location.start.column + "\n");
      }
    }
    for (const capture of result.captures ?? []) {
      process.stdout.write("  capture " + capture.name + " @" + capture.location.start.line + ":" + capture.location.start.column + "\n");
    }
  }
}
