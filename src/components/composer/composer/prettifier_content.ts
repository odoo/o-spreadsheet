// ---------------------------------------
// DOC part
// ---------------------------------------

import { AST } from "../../../formulas/parser";

type Union = { type: "union"; a: Doc; b: Doc };
type Concat = { type: "concat"; docs: Doc[] };
type Nest = { type: "nest"; indent: number; a: Doc };
type Line = { type: "line" };

type Doc = null | Concat | Nest | Union | string | Line;

// indicates where a newline can be inserted
function line(): Line {
  return { type: "line" };
}

// sections the tokens as a single line
function concat(docs: Doc[]): Concat {
  const res: Doc[] = [];
  for (const d of docs) {
    // concats of concats are concats
    // let's flatten them for the output readability
    if (typeof d === "object" && d !== null && d.type === "concat") {
      res.push(...d.docs);
    } else {
      res.push(d);
    }
  }
  return { type: "concat", docs: res };
}

// indents the tokens
function nest(indent: number, x: Doc): Nest {
  return { type: "nest", indent, a: x };
}

// sections tokens into a group
function group(x: Doc): Union {
  return union(flatten(x), x);
}

function union(a: Doc, b: Doc): Union {
  return { type: "union", a, b };
}

function flatten(x: Doc): Doc {
  if (typeof x === "string") {
    return x;
  }
  if (x === null) {
    return null;
  }
  if (x.type === "union") {
    return flatten(x.a);
  }
  if (x.type === "concat") {
    return concat(x.docs.map(flatten));
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
// pretty part
// ---------------------------------------

type SubLine = {
  type: "subline";
  indent: number;
  doc: SubDoc;
};
type SubText = {
  type: "subtext";
  text: string;
  doc: SubDoc;
};
type SubDoc = SubLine | SubText | null;
type DocFit = [number, Doc];

function pretty(width: number, x: Doc): string {
  return layout(best(width, 0, x));
}

function layout(x: SubDoc): string {
  if (x && "type" in x) {
    if (x.type === "subline") {
      return "\n" + "\t".repeat(x.indent) + layout(x.doc);
    }
    if (x.type === "subtext") {
      return x.text + layout(x.doc);
    }
  }
  return "";
}

function best(width: number, k: number, x: Doc): SubDoc {
  return be(width, k, [[0, x]]);
}

function be(width: number, k: number, x: DocFit[]): SubDoc {
  if (x.length === 0) return null;
  const [first, ...rest] = x;
  const [i, doc] = first;
  if (doc !== null) {
    if (typeof doc === "string") {
      return {
        type: "subtext",
        text: doc,
        doc: be(width, k + doc.length, rest),
      };
    }
    if (doc.type === "concat") {
      const concatDocs: DocFit[] = doc.docs.map((d) => [i, d]);
      const res = be(width, k, [...concatDocs, ...rest]);
      return res;
    }
    if (doc.type === "nest") {
      return be(width, k, [[i + doc.indent, doc.a], ...rest]);
    }
    if (doc.type === "line") {
      return {
        type: "subline",
        indent: i,
        doc: be(width, i, rest),
      };
    }
    if (doc.type === "union") {
      const a = be(width, k, [[i, doc.a], ...rest]);
      const b = be(width, k, [[i, doc.b], ...rest]);
      return fits(width - k, a) ? a : b;
    }
  }
  return null;
}

function fits(width: number, x: SubDoc): boolean {
  if (width < 0) return false;
  if (x === null) {
    return true;
  } else if (x.type === "subline") {
    return true;
  } else if (x.type === "subtext") {
    return fits(width - x.text.length, x.doc);
  }
  return false;
}

// ---------------------------------------
// AST part
// ---------------------------------------

export function prettify(ast: AST) {
  const doc = astToDoc(ast);
  console.log(JSON.stringify(doc, null, 2));
  return "= " + pretty(30, doc);
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
      const argsDocs = ast.args.map(astToDoc);
      return group(
        concat([
          // line(),
          ast.value,
          "(",
          nest(
            1,
            concat([
              line(),
              concat(argsDocs.map((doc, i) => (i > 0 ? concat([",", line(), doc]) : doc))),
            ])
          ),
          line(),
          ")",
        ])
      );

    case "UNARY_OPERATION":
      return ast.postfix
        ? concat([astToDoc(ast.operand), ast.value])
        : concat([ast.value, astToDoc(ast.operand)]);

    // case "BIN_OPERATION":
    //   return concat([astToDoc(ast.left), " ", ast.value, " ", astToDoc(ast.right)]);

    case "BIN_OPERATION": {
      const leftDoc = astToDoc(ast.left);
      const rightDoc = astToDoc(ast.right);
      const operator = ` ${ast.value} `;
      // return concat([leftDoc, operator, rightDoc]); // V1
      return group(concat([leftDoc, operator, line(), rightDoc])); // V2
    }

    case "SYMBOL":
      return ast.value;

    case "EMPTY":
      return "";
  }
}
