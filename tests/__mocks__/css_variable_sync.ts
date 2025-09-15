import fs from "fs";
import path from "path";

function getScssVariables(scss) {
  const vars = {};
  const varRegex = /^\s*\$([\w-]+):\s*([^;]+);/gm;
  let match;
  while ((match = varRegex.exec(scss))) {
    vars[match[1]] = match[2].trim();
  }
  function resolve(val, seen = new Set()) {
    val = val.replace(/\$([\w-]+)/g, (_, v) => {
      if (seen.has(v)) return "";
      seen.add(v);
      return vars[v] ? resolve(vars[v], seen) : "";
    });
    while (/#\{([^}]+)\}/.test(val)) {
      val = val.replace(/#\{\s*([^}]+)\s*\}/g, (_, inner) => {
        inner = inner.trim();
        if (inner.startsWith("$")) {
          const v = inner.slice(1);
          return vars[v] ? resolve(vars[v], seen) : "";
        }
        return inner;
      });
    }
    return val;
  }
  for (const k in vars) vars[k] = resolve(vars[k]);
  return vars;
}

function getCssCustomProperties(filePath) {
  const scss = fs.readFileSync(filePath, "utf8");
  const scssVars = getScssVariables(scss);
  const rootBlock = scss.match(/:root\s*{([\s\S]*?)}/);
  if (!rootBlock) return {};
  const props = {};
  const lines = rootBlock[1].split(";");
  for (const line of lines) {
    const match = line.match(/--([\w-]+)\s*:\s*([^;}]*)/);
    if (match) {
      let value = match[2].replace(/[}]/g, "").trim();
      while (/#\{([^}]+)\}/.test(value)) {
        value = value.replace(/#\{\s*([^}]+)\s*\}/g, (_, inner) => {
          inner = inner.trim();
          if (inner.startsWith("$")) {
            const v = inner.slice(1);
            return scssVars[v] || "";
          }
          return inner;
        });
      }
      value = value.replace(/#\{\s*([^}]*)$/g, (_, inner) => inner.trim());
      value = value.replace(/\$([\w-]+)/g, (_, v) => scssVars[v] || "");
      props[`--${match[1]}`] = value;
    }
  }
  return props;
}

const cssVars = getCssCustomProperties(path.resolve(__dirname, "../../src/variables.scss"));

export function getCSSVariable(variableName, parser) {
  const value = cssVars[variableName] || "";
  if (parser) return parser(value);
  return value;
}
