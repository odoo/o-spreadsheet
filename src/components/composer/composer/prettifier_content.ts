import { AST } from "../../../formulas/parser";

// ---------------------------------------
// Prettify rule
// ---------------------------------------

// PrettifyRule is a data structure that represents how to format an AST into a human-readable string.
// We find there all the formatting structures like line breaks, indentation and token grouping.
// It is used to create a layout that fits depending on the available width.

type PrettifyRule = string | ChooseBetween | Concat | Nest | Line;
type ChooseBetween = { type: "chooseBetween"; a: PrettifyRule; b: PrettifyRule };
type Concat = { type: "concat"; rules: PrettifyRule[] };
type Nest = { type: "nest"; indent: number; a: PrettifyRule };
type Line = { type: "line" };

/** Useful for indicating where to insert a new line. Placed in a group, it will be used if there is insufficient space*/
function line(): Line {
  return { type: "line" };
}

/** Useful for indicating where to insert a new line with a specific indentation level.
 * Should be placed before a line. Placed in a group, it will be used if there is insufficient space*/
function nest(indent: number, x: PrettifyRule): Nest {
  return { type: "nest", indent, a: x };
}

/** Useful for join few rules into a single rule.
 * Note that, this is the only way to melt strings (depending the AST value)
 * with other rules (ChooseBetween | Concat | Nest | Line)
 */
function join(rules: PrettifyRule[]): Concat {
  return { type: "concat", rules };
}

/** Useful for indicating where to print a rule into a single line depending on the available space.*/
function group(x: PrettifyRule): ChooseBetween {
  return chooseBetween(flatten(x), x);
}

/** Used exclusively for `group`, indicating that we can choose between two rules depending on the available space.*/
function chooseBetween(a: PrettifyRule, b: PrettifyRule): ChooseBetween {
  return { type: "chooseBetween", a, b };
}

/** Recursive function used exclusively for `group`, to indicate how to flatten the rules.*/
function flatten(x: PrettifyRule): PrettifyRule {
  if (typeof x === "string") {
    return x;
  }
  if (x.type === "chooseBetween") {
    // normally should be "chooseBetween(flatten(x.a), flatten(x.b))" but compute time is too high
    return flatten(x.a);
  }
  if (x.type === "concat") {
    return join(x.rules.map(flatten));
  }
  if (x.type === "nest") {
    return {
      type: "nest",
      indent: x.indent,
      a: flatten(x.a),
    };
  }
  if (x.type === "line") {
    return " ";
  }
  return x;
}

// ---------------------------------------
// printer part
// ---------------------------------------

// Use the PrettifyRule to create a layout that fits within a given width.

type SubLine = {
  type: "subline";
  indent: number;
  rule: SubRule;
};
type SubText = {
  type: "subtext";
  text: string;
  rule: SubRule;
};

type SubRule = SubLine | SubText | null;
type RuleFit = [number, PrettifyRule];

/**
 * Print a PrettifyRule composed of sub-PrettyRules, depending on the available width.
 */
function printRuleDependingWidth(x: PrettifyRule, width: number): string {
  return layout(best(width, 0, x));
}

function layout(x: SubRule): string {
  if (x && "type" in x) {
    if (x.type === "subline") {
      return "\n" + "\t".repeat(x.indent) + layout(x.rule);
    }
    if (x.type === "subtext") {
      return x.text + layout(x.rule);
    }
  }
  return "";
}

function best(width: number, k: number, x: PrettifyRule): SubRule {
  return be(width, k, [[0, x]]);
}

function be(width: number, k: number, x: RuleFit[]): SubRule {
  if (x.length === 0) return null;
  const [first, ...rest] = x;
  const [i, rule] = first;
  if (rule !== null) {
    if (typeof rule === "string") {
      return {
        type: "subtext",
        text: rule,
        rule: be(width, k + rule.length, rest),
      };
    }
    if (rule.type === "concat") {
      const concatDocs: RuleFit[] = rule.rules.map((d) => [i, d]);
      const res = be(width, k, [...concatDocs, ...rest]);
      return res;
    }
    if (rule.type === "nest") {
      return be(width, k, [[i + rule.indent, rule.a], ...rest]);
    }
    if (rule.type === "line") {
      return {
        type: "subline",
        indent: i,
        rule: be(width, i, rest),
      };
    }
    if (rule.type === "chooseBetween") {
      const a = be(width, k, [[i, rule.a], ...rest]);
      const b = be(width, k, [[i, rule.b], ...rest]);
      return fits(width - k, a) ? a : b;
    }
  }
  return null;
}

function fits(width: number, x: SubRule): boolean {
  if (width < 0) return false;
  if (x === null) {
    return true;
  } else if (x.type === "subline") {
    return true;
  } else if (x.type === "subtext") {
    return fits(width - x.text.length, x.rule);
  }
  return false;
}

// ---------------------------------------
// AST part
// ---------------------------------------

export function prettify(ast: AST) {
  return "= " + printRuleDependingWidth(astToDoc(ast), 30);
}

/** transform an AST composed of sub-ASTs into a PrettifyRule composed of sub-PrettifyRules.*/
function astToDoc(ast: AST): PrettifyRule {
  switch (ast.type) {
    case "NUMBER":
      return String(ast.value);

    case "STRING":
      return `"${ast.value}"`;

    case "BOOLEAN":
      return ast.value ? "TRUE" : "FALSE";

    case "REFERENCE":
      return ast.value;

    case "FUNCALL":
      const argsDocs = ast.args.map(astToDoc);
      return group(
        join([
          ast.value,
          "(",
          nest(
            1,
            join([line(), join(argsDocs.map((doc, i) => (i > 0 ? join([",", line(), doc]) : doc)))])
          ),
          line(),
          ")",
        ])
      );

    case "UNARY_OPERATION":
      return ast.postfix
        ? join([astToDoc(ast.operand), ast.value])
        : join([ast.value, astToDoc(ast.operand)]);

    case "BIN_OPERATION": {
      const leftDoc = astToDoc(ast.left);
      const rightDoc = astToDoc(ast.right);
      const operator = ` ${ast.value}`;
      return group(join([leftDoc, operator, nest(1, join([line(), rightDoc]))]));
    }

    case "SYMBOL":
      return ast.value;

    case "EMPTY":
      return "";
  }
}
