import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
function getAllTsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (fullPath.endsWith(".ts") && !fullPath.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}
function getImports(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.ES2015, true);
  const imports = [];
  sourceFile.forEachChild((node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      let importPath = node.moduleSpecifier.text;
      const importPathLower = importPath.toLowerCase();
      if (importPath.startsWith(".")) {
        importPath = path.resolve(path.dirname(filePath), importPath);
        if (!importPath.endsWith(".ts")) importPath += ".ts";
        imports.push(importPath);
      } else if (importPathLower === "owl" || importPathLower.startsWith("owl/")) {
        imports.push("OWL");
      }
    }
  });
  return imports;
}
function buildDependencyGraph(files) {
  const graph = new Map();
  for (const file of files) {
    const imports = getImports(file).filter((f) => f === "OWL" || files.includes(f));
    graph.set(file, new Set(imports));
  }
  return graph;
}
function buildReverseGraph(graph) {
  const reverse = new Map();
  for (const [file, deps] of graph.entries()) {
    for (const dep of deps) {
      if (!reverse.has(dep)) reverse.set(dep, new Set());
      reverse.get(dep).add(file);
    }
  }
  return reverse;
}
function findOwlDependents(graph) {
  // Find files that import OWL directly
  const owlFiles = new Set();
  for (const [file, deps] of graph.entries()) {
    if (deps.has("OWL")) owlFiles.add(file);
  }
  // Traverse reverse graph to find all dependents
  const reverse = buildReverseGraph(graph);
  const toExclude = new Set(owlFiles);
  const stack = [...owlFiles];
  while (stack.length) {
    const file = stack.pop();
    for (const dependent of reverse.get(file) || []) {
      if (!toExclude.has(dependent)) {
        toExclude.add(dependent);
        stack.push(dependent);
      }
    }
  }
  return toExclude;
}
function topologicalSort(graph) {
  const visited = new Set();
  const result = [];
  function visit(node) {
    if (visited.has(node)) return;
    visited.add(node);
    for (const dep of graph.get(node) || []) {
      if (dep !== "OWL") visit(dep);
    }
    result.push(node);
  }
  for (const node of graph.keys()) {
    visit(node);
  }
  return result.reverse();
}
// Usage
const projectDir = process.argv[2] || "src";
const files = getAllTsFiles(projectDir).map((f) => path.resolve(f));
const graph = buildDependencyGraph(files);
const toExclude = findOwlDependents(graph);
for (const file of toExclude) {
  graph.delete(file);
}
const sorted = topologicalSort(graph);
console.log("Topological order (excluding OWL dependents):");
for (const file of sorted) {
  console.log(path.relative(process.cwd(), file));
}
