/**
 * Block of code that produces a value.
 */
export interface FunctionCode {
  readonly returnExpression: string;
  /**
   * Return the same function code but with the return expression assigned to a variable.
   */
  assignResultToVariable(): FunctionCode;
}

export class FunctionCodeBuilder {
  private code: string = "";

  constructor(private scope: Scope = new Scope()) {}

  append(...lines: (string | FunctionCode)[]) {
    this.code += lines.map((line) => line.toString()).join("\n") + "\n";
  }

  return(expression: string): FunctionCode {
    return new FunctionCodeImpl(this.scope, this.code, expression);
  }

  toString(): string {
    return indentCode(this.code);
  }
}

class FunctionCodeImpl implements FunctionCode {
  private readonly code: string;
  constructor(private readonly scope: Scope, code: string, readonly returnExpression: string) {
    this.code = indentCode(code);
  }

  toString(): string {
    return this.code;
  }

  assignResultToVariable(): FunctionCode {
    if (this.scope.isAlreadyDeclared(this.returnExpression)) {
      return this;
    }
    const variableName = this.scope.nextVariableName();
    const code = new FunctionCodeBuilder(this.scope);
    code.append(this.code);
    code.append(`const ${variableName} = ${this.returnExpression};`);
    return code.return(variableName);
  }
}

export class Scope {
  private nextId = 1;
  private declaredVariables: Set<string> = new Set();

  nextVariableName(): string {
    const name = `_${this.nextId++}`;
    this.declaredVariables.add(name);
    return name;
  }

  isAlreadyDeclared(name: string): boolean {
    return this.declaredVariables.has(name);
  }
}

/**
 * Takes a list of strings that might be single or multiline
 * and maps them in a list of single line strings.
 */
function splitLines(str: string): string[] {
  return str
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function indentCode(code: string): string {
  let result = "";
  let indentLevel = 0;
  const lines = splitLines(code);
  for (const line of lines) {
    if (line.startsWith("}")) {
      indentLevel--;
    }
    result += "\t".repeat(indentLevel) + line + "\n";
    if (line.endsWith("{")) {
      indentLevel++;
    }
  }
  return result.trim();
}
