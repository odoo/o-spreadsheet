import { FunctionCodeBuilder, jsStr } from "../../src/formulas/code_builder";

describe("code builder", () => {
  test("can inject safe values", () => {
    expect(jsStr`const a = ${jsStr`'hello'`};`.toString()).toBe(`const a = 'hello';`);
    expect(jsStr`const a = ${jsStr`123`};`.toString()).toBe(`const a = 123;`);
    expect(jsStr`const a = ${123};`.toString()).toBe(`const a = 123;`);
    expect(jsStr`const a = ${true};`.toString()).toBe(`const a = true;`);
    expect(jsStr`const a = ${false};`.toString()).toBe(`const a = false;`);
  });

  test("can inject array of safe values", () => {
    expect(jsStr`const a = [${[jsStr`'hello'`, jsStr`123`, 123, true, false]}];`.toString()).toBe(
      `const a = ['hello',123,123,true,false];`
    );
  });

  test("cannot inject unsafe values", () => {
    // @ts-expect-error
    expect(() => jsStr`const a = ${"primitive string"};`).toThrow();
    // @ts-expect-error
    expect(() => jsStr`const a = ${{ a: 1 }};`).toThrow();
    // @ts-expect-error
    expect(() => jsStr`const a = ${new String("string")};`).toThrow();
  });

  test("can inject safe values", () => {
    const code = new FunctionCodeBuilder();
    code.append(jsStr`const a = 123;`);
    expect(code.toString()).toBe("const a = 123;");
    expect(code.return(jsStr`a`).returnExpression.toString()).toBe("a");
    expect(
      code
        .return(jsStr`a`)
        .assignResultToVariable()
        .returnExpression.toString()
    ).toBe("_1");
  });

  test("cannot add unsafe values", () => {
    const code = new FunctionCodeBuilder();
    // @ts-expect-error
    expect(() => code.append("const a = 1;")).toThrow();
    // @ts-expect-error
    expect(() => code.append({ a: 1 })).toThrow();
    // @ts-expect-error
    expect(() => code.append(new String("string"))).toThrow();
    // @ts-expect-error
    expect(() => code.return(new String("string"))).toThrow();
  });
});
