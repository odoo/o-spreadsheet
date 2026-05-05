/**
 * Block of code that produces a value.
 */
export interface FunctionCode {
  readonly returnExpression: JsString;
  readonly returnARange: boolean;
  /**
   * Return the same function code but wrapped in a closure.
   */
  wrapInClosure(isArrayFormula: boolean): FunctionCode;
  /**
   * Return the same function code but with the return expression assigned to a variable.
   */
  assignResultToVariable(): FunctionCode;
}

class JsString extends String {
  // `brand` makes a plain `string` not assignable to `JsString`.
  //   code.append("return 1;")        // type error
  //   code.append(jsStr`return 1;`)   // ok
  private declare brand: never;
}

type SafeJsValue = JsString | number | boolean | (JsString | number | boolean)[];

/**
 * Creates a JsString from a raw string, bypassing the template string interpolation checks.
 * This can lead to security vulnerabilities if the string is not trusted!
 */
export function dangerouslyCreateJsStr(trustedStr: string): JsString {
  return new JsString(trustedStr);
}

/**
 * Creates a JsString from a template string, ensuring that all interpolated values are safe.
 */
export function jsStr(strings: TemplateStringsArray, ...values: SafeJsValue[]): JsString {
  let str = "";
  for (let i = 0; i < strings.length; i++) {
    const value = values[i];
    if (i >= values.length) {
      str += strings[i];
    } else if (isSafeJsValue(value)) {
      str += strings[i] + value;
    } else if (Array.isArray(value) && value.every(isSafeJsValue)) {
      // same behavior as array interpolation in template strings
      str += strings[i] + value.map((v) => v.toString()).join(",");
    } else {
      throw new Error(`Invalid interpolated value at index ${i}: ${value}`);
    }
  }
  return dangerouslyCreateJsStr(str);
}

function isSafeJsValue(value: unknown): boolean {
  return value instanceof JsString || typeof value === "number" || typeof value === "boolean";
}

export class FunctionCodeBuilder {
  private code: JsString[] = [];

  constructor(private scope: Scope = new Scope()) {}

  append(...lines: (JsString | FunctionCode)[]) {
    for (const line of lines) {
      if (line instanceof FunctionCodeImpl) {
        this.code.push(...line.code);
      } else if (line instanceof JsString) {
        this.code.push(line);
      } else {
        throw new Error(`Invalid line: ${line}`);
      }
    }
  }

  return(expression: JsString, returnARange: boolean = false): FunctionCode {
    if (!isSafeJsValue(expression)) {
      throw new Error(`Expected JsString, got ${expression}`);
    }
    return new FunctionCodeImpl(this.scope, this.code, expression, returnARange);
  }

  toString(): string {
    return indentCode(this.code.join("\n"));
  }
}

class FunctionCodeImpl implements FunctionCode {
  constructor(
    private readonly scope: Scope,
    readonly code: JsString[],
    readonly returnExpression: JsString,
    readonly returnARange: boolean
  ) {}

  wrapInClosure(waitingForArrayFormula: boolean): FunctionCode {
    const closureName = this.scope.nextVariableName();
    const code = new FunctionCodeBuilder(this.scope);
    if (waitingForArrayFormula) {
      code.append(jsStr`const ${closureName} = (zone) => {`);
    } else {
      code.append(jsStr`const ${closureName} = () => {`);
    }
    code.append(...this.code);
    code.append(jsStr`return ${this.returnExpression};`);
    code.append(jsStr`}`);
    return code.return(closureName);
  }

  assignResultToVariable(): FunctionCode {
    if (this.scope.isAlreadyDeclared(this.returnExpression)) {
      return this;
    }
    const variableName = this.scope.nextVariableName();
    const code = new FunctionCodeBuilder(this.scope);
    code.append(...this.code);
    code.append(jsStr`const ${variableName} = ${this.returnExpression};`);
    return code.return(variableName);
  }
}

export class Scope {
  private nextId = 1;
  // use string instead of JsString because Set uses reference equality and
  // we want to consider two JsString with the same content as the same variable
  private declaredVariables: Set<string> = new Set();

  nextVariableName(): JsString {
    const name = jsStr`_${this.nextId++}`;
    this.declaredVariables.add(name.toString());
    return name;
  }

  isAlreadyDeclared(name: JsString): boolean {
    return this.declaredVariables.has(name.toString());
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
