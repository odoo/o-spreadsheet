/**
 * This file is largely inspired by owl 1.
 * `css` tag has been removed from owl 2 without workaround to manage css.
 * So, the solution was to import the behavior of owl 1 directly in our
 * codebase, with one difference: the css is added to the sheet as soon as the
 * css tag is executed. In owl 1, the css was added as soon as a Component was
 * created for the first time.
 */

const STYLESHEETS: { [id: string]: HTMLStyleElement } = {};
let nextId: number = 0;

/**
 * CSS tag helper for defining inline stylesheets.  With this, one can simply define
 * an inline stylesheet with just the following code:
 * ```js
 *     css`.component-a { color: red; }`;
 * ```
 */
export function css(strings, ...args) {
  const name = `__sheet__${nextId++}`;
  const value = String.raw(strings, ...args);
  registerSheet(name, value);
  activateSheet(name);
  return name;
}

export function processSheet(str: string): string {
  const tokens = str.split(/(\{|\}|;)/).map((s) => s.trim());
  const selectorStack: string[][] = [];
  const parts: string[] = [];
  let rules: string[] = [];
  function generateSelector(stackIndex: number, parentSelector?: string) {
    const parts: string[] = [];
    for (const selector of selectorStack[stackIndex]) {
      let part = (parentSelector && parentSelector + " " + selector) || selector;
      if (part.includes("&")) {
        part = selector.replace(/&/g, parentSelector || "");
      }
      if (stackIndex < selectorStack.length - 1) {
        part = generateSelector(stackIndex + 1, part);
      }
      parts.push(part);
    }
    return parts.join(", ");
  }
  function generateRules() {
    if (rules.length) {
      parts.push(generateSelector(0) + " {");
      parts.push(...rules);
      parts.push("}");
      rules = [];
    }
  }
  while (tokens.length) {
    let token = tokens.shift()!;
    if (token === "}") {
      generateRules();
      selectorStack.pop();
    } else {
      if (tokens[0] === "{") {
        generateRules();
        selectorStack.push(token.split(/\s*,\s*/));
        tokens.shift();
      }
      if (tokens[0] === ";") {
        rules.push("  " + token + ";");
      }
    }
  }
  return parts.join("\n");
}
function registerSheet(id: string, css: string) {
  const sheet = document.createElement("style");
  sheet.textContent = processSheet(css);
  STYLESHEETS[id] = sheet;
}

function activateSheet(id: string) {
  const sheet = STYLESHEETS[id];
  sheet.setAttribute("component", id);
  document.head.appendChild(sheet);
}
