import { AST, ASTOperation, ASTUnaryOperation, OP_PRIORITY } from "../formulas/parser";
import { argTargeting } from "../functions/arguments";
import { functionRegistry } from "../functions/function_registry";

import { memoize } from "../helpers/misc";

const ASSOCIATIVE_OPERATORS = ["*", "+", "&"];

/**
 * Pretty-prints formula ASTs into readable formulas.
 *
 * Implements a Wadler-inspired pretty printer:
 * it converts an AST into a `Doc` structure,
 * and then chooses between compact (flat) or expanded (with
 * line breaks and indentation) layouts depending on space.
 *
 * References:
 * - https://lik.ai/blog/how-a-pretty-printer-works/
 * - Wadler, "A prettier printer": https://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf
 */
export function prettify(ast: AST, width = 60): string {
  return "=" + print(astToDoc(ast), width - 1); // width-1 because of the leading '='
}

// ---------------------------------------
// Doc structure
// ---------------------------------------

/**
 * A `Doc` represents alternative layouts (tree of layouts) for pretty-printing.
 * The printer chooses the layout that fits best within the available width.
 */
type Doc = string | ChooseBetween | Concat | Nest | InsertLine;

type ChooseBetween = { type: "chooseBetween"; doc1: Doc; doc2: Doc };
type Concat = { type: "concat"; docs: Doc[] };
type Nest = { type: "nest"; indentLevel: number; doc: Doc };
type InsertLine = { type: "insertLine" };

/**
 * A possible line break.
 * Printed as either space or newline.
 */
function line(): InsertLine {
  return { type: "insertLine" };
}

/**
 * Increase indentation for a nested block.
 */
function nest(indentLevel: number, doc: Doc): Nest {
  return { type: "nest", indentLevel, doc };
}

/**
 * Combines multiple docs into a single doc, concatenating them side by side
 * without any line breaks or indentation.
 */
function concat(docs: Doc[]): Concat {
  return { type: "concat", docs };
}

/**
 * Marks a document as a unit to be printed "flat" (all on one line)
 * if it fits within the width, otherwise with line breaks.
 */
function group(doc: Doc): ChooseBetween {
  return chooseBetween(flatten(doc), doc);
}

/**
 * Creates a choice between two alternative layouts.
 * The formatter tries `doc1`; if it does not fit within
 * the line width, it falls back to `doc2`.
 */
function chooseBetween(doc1: Doc, doc2: Doc): ChooseBetween {
  return { type: "chooseBetween", doc1, doc2 };
}

/**
 * Flattens a doc into its single-line form.
 */
function flatten(doc: Doc): Doc {
  if (typeof doc === "string") {
    return doc;
  }
  if (doc.type === "chooseBetween") {
    // Normally should be "chooseBetween(flatten(doc.doc1), flatten(doc.doc2))",
    // but this is simplified for performance reasons.
    return flatten(doc.doc1);
  }
  if (doc.type === "concat") {
    return concat(doc.docs.map(flatten));
  }
  if (doc.type === "nest") {
    return {
      type: "nest",
      indentLevel: doc.indentLevel,
      doc: flatten(doc.doc),
    };
  }
  if (doc.type === "insertLine") {
    return "";
  }
  return doc;
}

// ---------------------------------------
// Printer part
// ---------------------------------------

/**
 * A linked list for string segments.
 * Used to avoid large string concatenations during layout selection.
 */
interface LinkedString {
  subString: string;
  next: LinkedString | null;
}

const getIndentationString = memoize(function getIndentationString(indentLevel: number): string {
  return "\n" + "\t".repeat(indentLevel);
});

/**
 * Converts a `Doc` into a string representation that fits within
 * the specified width.
 */
function print(doc: Doc, width: number): string {
  return stringify(selectBestLayout(width, doc));
}

/**
 * Join all segments of a LinkedString into the final string.
 */
function stringify(linkedString: LinkedString | null): string {
  let result = "";
  while (linkedString) {
    result += linkedString.subString;
    linkedString = linkedString.next;
  }
  return result;
}

/**
 * Layout selection for a `Doc` that fits within the given width.
 */
function selectBestLayout(width: number, doc: Doc): LinkedString | null {
  const head: RestToFitNode = {
    indentLevel: 0,
    doc,
    next: null,
  };
  return _selectBestLayout(width, 0, head);
}

/**
 * A specialized linked list node for tracking the remaining `Doc` to fit.
 */
interface RestToFitNode {
  indentLevel: number;
  doc: Doc;
  next: RestToFitNode | null;
}

function _selectBestLayout(
  width: number,
  currentIndentLevel: number,
  head: RestToFitNode | null
): LinkedString | null {
  if (head === null) {
    return null;
  }

  const { indentLevel, doc, next } = head;

  if (typeof doc === "string") {
    return {
      subString: doc,
      next: _selectBestLayout(width, currentIndentLevel + doc.length, next),
    };
  }
  if (doc.type === "concat") {
    let newHead = next;
    for (let i = doc.docs.length - 1; i >= 0; i--) {
      newHead = { indentLevel, doc: doc.docs[i], next: newHead };
    }
    return _selectBestLayout(width, currentIndentLevel, newHead);
  }
  if (doc.type === "nest") {
    return _selectBestLayout(width, currentIndentLevel, {
      indentLevel: indentLevel + doc.indentLevel,
      doc: doc.doc,
      next,
    });
  }
  if (doc.type === "insertLine") {
    return {
      subString: getIndentationString(indentLevel),
      next: _selectBestLayout(width, indentLevel, next),
    };
  }
  if (doc.type === "chooseBetween") {
    const head1 = { indentLevel, doc: doc.doc1, next };
    const possibleLinkedString = _selectBestLayout(width, currentIndentLevel, head1);
    if (fits(width - currentIndentLevel, possibleLinkedString)) {
      return possibleLinkedString;
    }

    const head2 = { indentLevel, doc: doc.doc2, next };
    return _selectBestLayout(width, currentIndentLevel, head2);
  }
  return null;
}

/**
 * Check if a layout fits on a single line within width.
 */
function fits(width: number, linkedString: LinkedString | null): boolean {
  while (linkedString) {
    if (linkedString.subString[0] === "\n") {
      return true;
    }
    width -= linkedString.subString.length;
    if (width < 0) {
      return false;
    }
    linkedString = linkedString.next;
  }
  return true;
}

function astToDoc(ast: AST): Doc {
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
      const functionDescription = functionRegistry.get(ast.value.toUpperCase());
      const getArgToFocus = argTargeting(functionDescription, ast.args.length);
      const docs: Doc[] = [];
      let i = 0;
      while (i < ast.args.length) {
        const isRepeating = functionDescription.args[getArgToFocus(i).index ?? -1]?.repeating;
        if (isRepeating) {
          const repeatingArgSeries = ast.args.slice(i, i + functionDescription.nbrArgRepeating);
          const docsSeries = repeatingArgSeries.map((arg) => astToDoc(arg));
          docs.push(group(concat(splitArgsWithCommas(docsSeries))));
          i += functionDescription.nbrArgRepeating;
        } else {
          docs.push(astToDoc(ast.args[i]));
          i++;
        }
      }
      return wrapInParentheses(concat(splitArgsWithCommas(docs)), ast.value);

    case "ARRAY": {
      const rowDocs = ast.value.map((row) =>
        concat(
          row.map((value, index) =>
            index === 0 ? astToDoc(value) : concat([", ", line(), astToDoc(value)])
          )
        )
      );
      const body = concat(
        rowDocs.map((doc, index) => (index === 0 ? group(doc) : concat(["; ", line(), group(doc)])))
      );
      return wrapInBraces(body);
    }

    case "UNARY_OPERATION":
      const operandDoc = astToDoc(ast.operand);
      const needParenthesis = ast.postfix
        ? leftOperandNeedsParenthesis(ast)
        : rightOperandNeedsParenthesis(ast);
      const finalOperandDoc = needParenthesis ? wrapInParentheses(operandDoc) : operandDoc;

      return ast.postfix
        ? concat([finalOperandDoc, ast.value])
        : concat([ast.value, finalOperandDoc]);

    case "BIN_OPERATION": {
      const leftDoc = astToDoc(ast.left);
      const needParenthesisLeftDoc = leftOperandNeedsParenthesis(ast);
      const finalLeftDoc = needParenthesisLeftDoc ? wrapInParentheses(leftDoc) : leftDoc;

      const rightDoc = astToDoc(ast.right);
      const needParenthesisRightDoc = rightOperandNeedsParenthesis(ast);
      const finalRightDoc = needParenthesisRightDoc ? wrapInParentheses(rightDoc) : rightDoc;

      const operator = `${ast.value}`;
      return group(concat([finalLeftDoc, operator, nest(1, concat([line(), finalRightDoc]))]));
    }

    case "SYMBOL":
      return ast.value;

    case "EMPTY":
      return "";
  }
}

function splitArgsWithCommas(docs: Doc[]): Doc[] {
  const result: Doc[] = docs.length ? [docs[0]] : [];
  for (let i = 1; i < docs.length; i++) {
    result.push(", ", line());
    result.push(docs[i]);
  }
  return result;
}

/**
 * Wraps a `Doc` in parentheses (with optional function name).
 */
function wrapInParentheses(doc: Doc, functionName: undefined | string = undefined): Doc {
  const docToConcat = ["(", nest(1, concat([line(), doc])), line(), ")"];
  if (functionName) {
    docToConcat.unshift(functionName);
  }
  return group(concat(docToConcat));
}

function wrapInBraces(doc: Doc): Doc {
  return group(concat(["{", nest(1, concat([line(), doc])), line(), "}"]));
}

/**
 * Converts an ast formula to the corresponding string
 */
export function astToFormula(ast: AST): string {
  switch (ast.type) {
    case "FUNCALL":
      const args = ast.args.map((arg) => astToFormula(arg));
      return `${ast.value}(${args.join(",")})`;
    case "NUMBER":
      return ast.value.toString();
    case "REFERENCE":
      return ast.value;
    case "STRING":
      return `"${ast.value}"`;
    case "BOOLEAN":
      return ast.value ? "TRUE" : "FALSE";
    case "UNARY_OPERATION":
      if (ast.postfix) {
        const leftOperand = leftOperandNeedsParenthesis(ast)
          ? `(${astToFormula(ast.operand)})`
          : astToFormula(ast.operand);
        return leftOperand + ast.value;
      }
      const rightOperand = rightOperandNeedsParenthesis(ast)
        ? `(${astToFormula(ast.operand)})`
        : astToFormula(ast.operand);
      return ast.value + rightOperand;
    case "ARRAY":
      return (
        "{" +
        ast.value.map((row) => row.map((cell) => astToFormula(cell)).join(",")).join(";") +
        "}"
      );
    case "BIN_OPERATION":
      const leftOperation = leftOperandNeedsParenthesis(ast)
        ? `(${astToFormula(ast.left)})`
        : astToFormula(ast.left);
      const rightOperation = rightOperandNeedsParenthesis(ast)
        ? `(${astToFormula(ast.right)})`
        : astToFormula(ast.right);
      return leftOperation + ast.value + rightOperation;
    default:
      return ast.value;
  }
}

function leftOperandNeedsParenthesis(operationAST: ASTOperation | ASTUnaryOperation): boolean {
  const mainOperator = operationAST.value;
  const leftOperation = "left" in operationAST ? operationAST.left : operationAST.operand;
  const leftOperator = leftOperation.value;
  return (
    leftOperation.type === "BIN_OPERATION" && OP_PRIORITY[leftOperator] < OP_PRIORITY[mainOperator]
  );
}

function rightOperandNeedsParenthesis(operationAST: ASTOperation | ASTUnaryOperation): boolean {
  const mainOperator = operationAST.value;
  const rightOperation = "right" in operationAST ? operationAST.right : operationAST.operand;
  const rightPriority = OP_PRIORITY[rightOperation.value];
  const mainPriority = OP_PRIORITY[mainOperator];
  if (rightOperation.type !== "BIN_OPERATION") {
    return false;
  }
  if (rightPriority < mainPriority) {
    return true;
  }
  return rightPriority === mainPriority && !ASSOCIATIVE_OPERATORS.includes(mainOperator);
}
