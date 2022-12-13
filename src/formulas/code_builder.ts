/**
 * Takes a list of strings that might be single or multiline
 * and maps them in a list of single line strings.
 */
function splitCodeLines(codeBlocks: string[]): string[] {
  return codeBlocks
    .join("\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export interface Code {
  returnExpression: string | undefined;
  toString(): string;
}

export class CodeBuilder implements Code {
  private code: string[] = [];
  returnExpression: string | undefined;

  addLine(line: string) {
    this.code.push(line);
  }

  addLines(lines: (string | Code)[]) {
    this.code.push(...lines.map((line) => line.toString()));
  }

  assignResultTo(variableName: string) {
    this.addLine(`let ${variableName} = ${this.returnExpression};`);
    this.returnExpression = variableName;
  }

  wrapInClosure(closureName: string) {
    this.code.unshift(`const ${closureName} = () => {`);
    this.addLine(`return ${this.returnExpression};`);
    this.addLine(`}`);
    this.returnExpression = closureName;
  }

  toString(): string {
    let code = "";
    let indentLevel = 0;
    const lines = splitCodeLines(this.code);
    for (const line of lines) {
      if (line.startsWith("}")) {
        indentLevel--;
      }
      code += "\t".repeat(indentLevel) + line + "\n";
      if (line.endsWith("{")) {
        indentLevel++;
      }
    }
    return code.trim();
  }
}
