import { Arg } from "./arguments";

const PRIMITIVE_TYPES = ["NUMBER", "STRING", "BOOLEAN"];
const RANGE_TYPES = ["RANGE<NUMBER>", "RANGE<STRING>", "RANGE<BOOLEAN>"];

let nextId = 1;

export function makeSanitizer(args: Arg[]): Function {
  nextId = 1;
  const code: string[] = [];
  const hasRepeatingArg = args.length && args[args.length - 1].repeating;

  const min = args.filter(a => !a.optional).length;
  const max = args.length;
  if (min === max && !hasRepeatingArg) {
    code.push(`if (args.length !== ${args.length}) {`);
    code.push(
      `  throw new Error(\`Wrong number of arguments. Expected ${args.length}, but got \$\{args.length\} argument(s) instead.\`);`
    );
    code.push(`}`);
  } else {
    const conditions: string[] = [];
    if (min > 0) {
      conditions.push(`args.length < ${min}`);
    }
    if (!hasRepeatingArg) {
      conditions.push(`args.length > ${args.length}`);
    }
    if (conditions.length) {
      code.push(`if (${conditions.join(" || ")}) {`);
      code.push(
        `  throw new Error(\`Wrong number of arguments. Expected ${args.length}, but got \$\{args.length\} argument(s) instead.\`);`
      );
      code.push(`}`);
    }
  }
  for (let i = 0; i < args.length; i++) {
    sanitizeArg(code, args[i], "args", i);
  }
  code.push(`return args;`);
  return new Function("args", code.join("\n"));
}

function sanitizeArg(code: string[], arg: Arg, name: string, i: number | string) {
  if (arg.type.filter(t => PRIMITIVE_TYPES.includes(t)).length > 1) {
    throw new Error("Unsupported type definition. Please go talk to GED about this");
  }
  if (arg.repeating) {
    code.push(`for (let i = ${i}; i < ${name}.length; i++) {`);
    const basicArg = Object.assign({}, arg, { repeating: false, optional: false });
    sanitizeArg(code, basicArg, name, "i");
    code.push(`}`);
    return;
  }
  const id = `_val_${nextId++}`;
  code.push(`let ${id} = ${name}[${i}];`);
  const rangeType = arg.type.find(t => RANGE_TYPES.includes(t));
  const type = rangeType ? rangeType.slice(6, -1).toLowerCase() : "";

  if (arg.type.includes("NUMBER")) {
    code.push(`switch (typeof ${id}) {`);
    if (!arg.optional || (arg.optional && arg.default)) {
      code.push(` case "undefined":`);
      code.push(`   ${name}[${i}] = ${arg.default || 0};`);
      code.push(`   break;`);
    }
    code.push(` case "boolean":`);
    code.push(`   ${name}[${i}] = ${id} ? 1 : 0;`);
    code.push(`   break;`);
    code.push(` case "string":`);
    code.push(`   if (${id}) {`);
    code.push(`     let n = Number(${id});`);
    code.push(`     if (isNaN(n)) {`);
    code.push(
      `       throw new Error(\`Argument "${arg.name}" should be a number, but "\$\{${id}\}" is a text, and cannot be coerced to a number.\`);`
    );
    code.push(`     } else {`);
    code.push(`       ${name}[${i}] = n;`);
    code.push(`     }`);
    code.push(`   } else {`);
    code.push(`     ${name}[${i}] = 0;`);
    code.push(`   }`);
    code.push(`   break;`);

    if (rangeType) {
      code.push(`  case "object":`);
      sanitizeRange(code, id, arg, type);
      code.push(`    break;`);
    }
    code.push(`}`);
    return;
  }

  if (arg.type.includes("BOOLEAN")) {
    code.push(`switch (typeof ${id}) {`);
    code.push(` case "undefined":`);
    code.push(`   ${name}[${i}] = false;`);
    code.push(`   break;`);
    code.push(` case "number":`);
    code.push(`   ${name}[${i}] = ${id} ? true : false;`);
    code.push(`   break;`);
    code.push(` case "string":`);
    code.push(`   if (${name}[${i}]) {`);
    code.push(`     let uppercaseVal = ${id}.toUpperCase();`);
    code.push(`     if (uppercaseVal === "TRUE") {`);
    code.push(`       ${name}[${i}] = true;`);
    code.push(`     } else if (uppercaseVal === "FALSE") {`);
    code.push(`       ${name}[${i}] = false;`);
    code.push(`     } else {`);
    code.push(
      `       throw new Error(\`Argument "${arg.name}" should be a boolean, but "\$\{${id}\}" is a text, and cannot be coerced to a boolean.\`);`
    );
    code.push(`     }`);
    code.push(`   } else {`);
    /**
     * @compatibility Note: this is not the way Google Sheets behave:
     *
     * =if("", 1, 2) is evaluated to 2
     * =or("", 1) throws an error
     *
     * It is not clear (to me) why in the first expression it looks like it
     * is accepted, but not in the second.
     */
    code.push(`     ${name}[${i}] = false;`);
    code.push(`   }`);
    code.push(`   break;`);
    code.push(`}`);
  }

  if (arg.type.includes("STRING")) {
    code.push(`switch (typeof ${id}) {`);
    code.push(` case "undefined":`);
    code.push(`   ${name}[${i}] = "";`);
    code.push(`   break;`);
    code.push(` case "number":`);
    code.push(`   ${name}[${i}] = ${id}.toString();`);
    code.push(`   break;`);
    code.push(` case "boolean":`);
    code.push(`   ${name}[${i}] = ${id} ? "TRUE" : "FALSE";`);
    code.push(`   break;`);
    if (rangeType) {
      code.push(`  case "object":`);
      sanitizeRange(code, id, arg, type);
      code.push(`    break;`);
    }
    code.push(`}`);
    return;
  }

  if (arg.type.includes("RANGE")) {
    code.push(`if (!(${id} instanceof Array)) {`);
    code.push(`   throw new Error(\`Argument "${arg.name}" has the wrong type\`);`);
    code.push(`}`);
  }

  if (rangeType) {
    sanitizeRange(code, id, arg, type);
  }
}

function sanitizeRange(code: string[], name: string, arg: Arg, type: string) {
  code.push(`if (!(${name} instanceof Array)) {`);
  code.push(`   throw new Error(\`Argument "${arg.name}" has the wrong type\`);`);
  code.push(`}`);
  code.push(`for (let i = 0; i < ${name}.length; i++) {`);
  code.push(`  let col = ${name}[i];`);
  code.push(`  for (let j = 0; j < col.length; j++) {`);
  code.push(`    if (typeof col[j] !== "${type}") {`);
  code.push(`      col[j] = undefined;`);
  code.push(`    }`);
  code.push(`  }`);
  code.push(`}`);
}
//------------------------------------------------------------------------------
// Wrapping functions for arguments sanitization
//------------------------------------------------------------------------------
export function protectFunction(fn: Function, argList: Arg[]): Function {
  if (argList.length === 0) {
    return function(this: any) {
      if (arguments.length) {
        throw new Error(
          `Wrong number of arguments. Expected 0, but got ${arguments.length} argument(s) instead.`
        );
      }
      return fn.call(this);
    };
  }
  const sanitizer = makeSanitizer(argList);
  return function(this: any, ...args) {
    args = sanitizer(args);
    return fn.call(this, ...args);
  };
}
