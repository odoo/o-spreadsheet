import { Arg } from "./arguments";

const PRIMITIVE_TYPES = ["NUMBER", "STRING", "BOOLEAN"];
const RANGE_TYPES = ["RANGE<NUMBER>", "RANGE<STRING>", "RANGE<BOOLEAN>"];

export function makeSanitizer(args: Arg[]): Function {
  const code: string[] = [];
  const hasRepeatingArg = args.length && args[args.length - 1].repeating;

  const min = args.filter(a => !a.optional).length;
  const max = args.length;
  if (min === max && !hasRepeatingArg) {
    code.push(`if (arguments.length !== ${args.length}) {`);
    code.push(
      `  throw new Error(\`Wrong number of arguments. Expected ${args.length}, but got \$\{arguments.length\} argument(s) instead.\`);`
    );
    code.push(`}`);
  } else {
    const conditions: string[] = [];
    if (min > 0) {
      conditions.push(`arguments.length < ${min}`);
    }
    if (!hasRepeatingArg) {
      conditions.push(`arguments.length > ${args.length}`);
    }
    if (conditions.length) {
      code.push(`if (${conditions.join(" || ")}) {`);
      code.push(
        `  throw new Error(\`Wrong number of arguments. Expected ${args.length}, but got \$\{arguments.length\} argument(s) instead.\`);`
      );
      code.push(`}`);
    }
  }
  const argNames: string[] = [];
  for (let i = 0; i < args.length; i++) {
    let name = `arg${i}`;
    argNames.push(args[i].repeating ? `...${name}` : `${name}`);
    sanitizeArg(code, args[i], name);
  }
  code.push(`return this.fn(${argNames.join(",")});`);
  const sanitizer = new Function(...argNames, code.join("\n"));
  return sanitizer;
}

function sanitizeArg(code: string[], arg: Arg, name: string) {
  if (arg.type.filter(t => PRIMITIVE_TYPES.includes(t)).length > 1) {
    throw new Error("Unsupported type definition. Please go talk to GED about this");
  }
  if (arg.repeating) {
    code.push(`for (let i = 0; i < ${name}.length; i++) {`);
    const basicArg = Object.assign({}, arg, { repeating: false, optional: false });
    code.push(`let ${name}_value = ${name}[i];`);
    sanitizeArg(code, basicArg, name + "_value");
    code.push(`${name}[i] = ${name}_value;`);
    code.push(`}`);
    return;
  }
  const rangeType = arg.type.find(t => RANGE_TYPES.includes(t));
  const type = rangeType ? rangeType.slice(6, -1).toLowerCase() : "";

  if (arg.type.includes("NUMBER")) {
    code.push(`switch (typeof ${name}) {`);
    if (!arg.optional || (arg.optional && arg.default)) {
      code.push(` case "undefined":`);
      code.push(`   ${name} = ${arg.default || 0};`);
      code.push(`   break;`);
    }
    code.push(` case "boolean":`);
    code.push(`   ${name} = ${name} ? 1 : 0;`);
    code.push(`   break;`);
    code.push(` case "string":`);
    code.push(`   if (${name}) {`);
    code.push(`     let n = Number(${name});`);
    code.push(`     if (isNaN(n)) {`);
    code.push(
      `       throw new Error(\`Argument "${arg.name}" should be a number, but "\$\{${name}\}" is a text, and cannot be coerced to a number.\`);`
    );
    code.push(`     } else {`);
    code.push(`       ${name} = n;`);
    code.push(`     }`);
    code.push(`   } else {`);
    code.push(`     ${name} = 0;`);
    code.push(`   }`);
    code.push(`   break;`);

    if (rangeType) {
      code.push(`  case "object":`);
      sanitizeRange(code, name, arg, type);
      code.push(`    break;`);
    }
    code.push(`}`);
    return;
  }

  if (arg.type.includes("BOOLEAN")) {
    code.push(`switch (typeof ${name}) {`);
    code.push(` case "undefined":`);
    code.push(`   ${name} = false;`);
    code.push(`   break;`);
    code.push(` case "number":`);
    code.push(`   ${name} = ${name} ? true : false;`);
    code.push(`   break;`);
    code.push(` case "string":`);
    code.push(`   if (${name}) {`);
    code.push(`     let uppercaseVal = ${name}.toUpperCase();`);
    code.push(`     if (uppercaseVal === "TRUE") {`);
    code.push(`       ${name} = true;`);
    code.push(`     } else if (uppercaseVal === "FALSE") {`);
    code.push(`       ${name} = false;`);
    code.push(`     } else {`);
    code.push(
      `       throw new Error(\`Argument "${arg.name}" should be a boolean, but "\$\{${name}\}" is a text, and cannot be coerced to a boolean.\`);`
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
    code.push(`     ${name} = false;`);
    code.push(`   }`);
    code.push(`   break;`);
    code.push(`}`);
  }

  if (arg.type.includes("STRING")) {
    code.push(`switch (typeof ${name}) {`);
    code.push(` case "undefined":`);
    code.push(`   ${name} = "";`);
    code.push(`   break;`);
    code.push(` case "number":`);
    code.push(`   ${name} = ${name}.toString();`);
    code.push(`   break;`);
    code.push(` case "boolean":`);
    code.push(`   ${name} = ${name} ? "TRUE" : "FALSE";`);
    code.push(`   break;`);
    code.push(`}`);
  }

  if (arg.type.includes("RANGE")) {
    code.push(`if (!(${name} instanceof Array)) {`);
    code.push(`   throw new Error(\`Argument "${arg.name}" has the wrong type\`);`);
    code.push(`}`);
  }

  if (rangeType) {
    sanitizeRange(code, name, arg, type);
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
    return fn;
  }
  const sanitizer = makeSanitizer(argList);
  return sanitizer.bind({ fn });
}
