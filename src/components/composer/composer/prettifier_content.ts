import {
  AST,
  leftOperandNeedsParenthesis,
  rightOperandNeedsParenthesis,
} from "../../../formulas/parser";

// ---------------------------------------
// Prettify possibility structure
// ---------------------------------------

// The `PrettifyPossibility` structure represents all possible ways to format an Abstract Syntax Tree (AST) into a human-readable string.
// It includes formatting elements such as line breaks, indentation, and token grouping.
//
// Once created, this structure is used to determine the best formatting path based on the available width,
// allowing dynamic selection of the most suitable layout for the given constraints.

type PrettifyPossibility = string | ChooseBetween | Join | Nest | Line;
type ChooseBetween = { type: "chooseBetween"; p1: PrettifyPossibility; p2: PrettifyPossibility };
type Join = { type: "join"; rules: PrettifyPossibility[] };
type Nest = { type: "nest"; indentLvl: number; p: PrettifyPossibility };
type Line = { type: "line" };

/** Useful for indicating where to insert a new line. Placed in a group, it will be used if there is insufficient space*/
function line(): Line {
  return { type: "line" };
}

/** Useful for indicating where to insert a new line with a specific indentation level.
 * Should be placed before a line. Placed in a group, it will be used if there is insufficient space*/
function nest(indentLvl: number, p: PrettifyPossibility): Nest {
  return { type: "nest", indentLvl, p };
}

/** Useful for join few rules into a single rule.
 * Note that, this is the only way to melt strings (depending the AST value)
 * with other rules (ChooseBetween | Concat | Nest | Line)
 */
function join(pps: PrettifyPossibility[]): Join {
  return { type: "join", rules: pps };
}

/** Useful for indicating where to print a rule into a single line depending on the available space.*/
function group(pp: PrettifyPossibility): ChooseBetween {
  return chooseBetween(flatten(pp), pp);
}

/** Used exclusively for `group`, indicating that we can choose between two rules depending on the available space.*/
function chooseBetween(p1: PrettifyPossibility, p2: PrettifyPossibility): ChooseBetween {
  return { type: "chooseBetween", p1, p2 };
}

/** Recursive function used exclusively for `group`, to indicate how to flatten the rules.*/
function flatten(pp: PrettifyPossibility): PrettifyPossibility {
  if (typeof pp === "string") {
    return pp;
  }
  if (pp.type === "chooseBetween") {
    // normally should be "chooseBetween(flatten(x.a), flatten(x.b))" but compute time is too high
    return flatten(pp.p1);
  }
  if (pp.type === "join") {
    return join(pp.rules.map(flatten));
  }
  if (pp.type === "nest") {
    return {
      type: "nest",
      indentLvl: pp.indentLvl,
      p: flatten(pp.p),
    };
  }
  if (pp.type === "line") {
    return " ";
  }
  return pp;
}

// ---------------------------------------
// printer part
// ---------------------------------------

/**
 * The `SubRule` represents a structured representation of an only way to
 * format an AST into a human-readable string. This is a reduced version of
 * the `PrettifyPossibility` structure,
 */
type SubRule = subLine | subText | null;

type subLine = {
  type: "subLine";
  indent: number;
  rule: SubRule;
};
type subText = {
  type: "subText";
  text: string;
  rule: SubRule;
};

/**
 * `RestToFit` is a stateful representation of the remaining `PrettifyPossibility` to check for fitting knowing an indentation level already used.
 *  It is a tuple where the first element is the current indentation level and the second element is the `PrettifyPossibility` to check for fitting.
 */
type RestToFit = [number, PrettifyPossibility];

/**
 * Print use the `PrettifyPossibility` structure to create a layout that fits within a given width.
 */
function print(prettifyPossibility: PrettifyPossibility, width: number): string {
  return layout(best(width, prettifyPossibility));
}

/**
 * Recursively formats a given `SubRule` object into a human-readable string representation.
 * This function is the final step of the prettifier process, converting the "one way" structure
 * (reduced version of `PrettifyPossibility`) into a comprehensible string.
 */
function layout(x: SubRule): string {
  if (x && "type" in x) {
    if (x.type === "subLine") {
      return "\n" + "\t".repeat(x.indent) + layout(x.rule);
    }
    if (x.type === "subText") {
      return x.text + layout(x.rule);
    }
  }
  return "";
}

/**
 * Determines the best sub-rule based on the given width, indentation level `k`, and the `PrettifyPossibility`.
 * This is the function that reduces the PrettifyPossibility to a SubRule
 */
function best(width: number, prettifyPossibility: PrettifyPossibility): SubRule {
  return _best(width, 0, [[0, prettifyPossibility]]);
}

function _best(width: number, currentIndentLvl: number, restsToFit: RestToFit[]): SubRule {
  if (restsToFit.length === 0) return null;
  const [firstPpToFit, ...rests] = restsToFit;
  const [indentLvl, pp] = firstPpToFit;
  if (typeof pp === "string") {
    return {
      type: "subText",
      text: pp,
      rule: _best(width, currentIndentLvl + pp.length, rests),
    };
  }
  if (pp.type === "join") {
    const restsJoinToFit: RestToFit[] = pp.rules.map((j) => [indentLvl, j]);
    const res = _best(width, currentIndentLvl, [...restsJoinToFit, ...rests]);
    return res;
  }
  if (pp.type === "nest") {
    return _best(width, currentIndentLvl, [[indentLvl + pp.indentLvl, pp.p], ...rests]);
  }
  if (pp.type === "line") {
    return {
      type: "subLine",
      indent: indentLvl,
      rule: _best(width, indentLvl, rests),
    };
  }
  if (pp.type === "chooseBetween") {
    const a = _best(width, currentIndentLvl, [[indentLvl, pp.p1], ...rests]);
    const b = _best(width, currentIndentLvl, [[indentLvl, pp.p2], ...rests]);
    return fits(width - currentIndentLvl, a) ? a : b;
  }
  return null;
}

/**
 * Determines whether a given width can accommodate a specific `SubRule`.
 */
function fits(width: number, x: SubRule): boolean {
  if (width < 0) return false;
  if (x === null) {
    return true;
  } else if (x.type === "subLine") {
    return true;
  } else if (x.type === "subText") {
    return fits(width - x.text.length, x.rule);
  }
  return false;
}

// ---------------------------------------
// AST part
// ---------------------------------------

export function prettify(ast: AST) {
  return "= " + print(astToPp(ast), 38); // 38 but 40 with the `= ` at the beginning
}

/** transform an AST composed of sub-ASTs into a PrettifyPossibility composed of sub-PrettifyPossibility.*/
function astToPp(ast: AST): PrettifyPossibility {
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
      const pps = ast.args.map(astToPp);
      return splitParenthesesContent(
        join(pps.map((pp, i) => (i < 1 ? pp : join([",", line(), pp])))),
        ast.value
      );

    case "UNARY_OPERATION":
      const operandPp = astToPp(ast.operand);
      const needParenthesis = ast.postfix
        ? leftOperandNeedsParenthesis(ast)
        : rightOperandNeedsParenthesis(ast);
      const finalOperandPp = needParenthesis ? splitParenthesesContent(operandPp) : operandPp;

      return ast.postfix ? join([finalOperandPp, ast.value]) : join([ast.value, finalOperandPp]);

    case "BIN_OPERATION": {
      const leftPp = astToPp(ast.left);
      const needParenthesisLeftPp = leftOperandNeedsParenthesis(ast);
      const finalLeftPp = needParenthesisLeftPp ? splitParenthesesContent(leftPp) : leftPp;

      const rightPp = astToPp(ast.right);
      const needParenthesisRightPp = rightOperandNeedsParenthesis(ast);
      const finalRightPp = needParenthesisRightPp ? splitParenthesesContent(rightPp) : rightPp;

      const operator = ` ${ast.value}`;
      return group(join([finalLeftPp, operator, nest(1, join([line(), finalRightPp]))]));
    }

    case "SYMBOL":
      return ast.value;

    case "EMPTY":
      return "";
  }
}

function splitParenthesesContent(
  pp: PrettifyPossibility,
  functionName: undefined | string = undefined
): PrettifyPossibility {
  const astToJoinGroup = ["(", nest(1, join([line(), pp])), line(), ")"];
  if (functionName) {
    astToJoinGroup.unshift(functionName);
  }
  return group(join(astToJoinGroup));
}
