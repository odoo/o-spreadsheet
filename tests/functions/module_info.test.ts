import { evaluateCell } from "../helpers";

describe("ISERROR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISERROR()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=ISERROR("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISERROR("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(3%)" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=ISERROR(1/0)" })).toBe(true); // corespond to #ERROR error
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: '"test"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: '"123"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: '="TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=true" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=false" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=123" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=A2" })).toBe(true); // corespond to #CYCLE error
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=(+" })).toBe(true); // corespond to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=SQRT(-1)" })).toBe(true); // corespond to #ERROR error
  });
});

describe("ISLOGICAL formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISLOGICAL()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=ISLOGICAL("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISLOGICAL("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISLOGICAL("TRUE")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(1.2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(3%)" })).toBe(false);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: '"test"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: '"TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: '"123"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: '="TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "=true" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "=false" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "=123" })).toBe(false);
  });
});

describe("ISNONTEXT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISNONTEXT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=ISNONTEXT("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISNONTEXT("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISNONTEXT("TRUE")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(123)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(3%)" })).toBe(true);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "123" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: '"test"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: '"TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: '"123"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: '="TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "=true" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "=123" })).toBe(true);
  });
});

describe("ISNUMBER formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISNUMBER()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=ISNUMBER("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISNUMBER("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISNUMBER("TRUE")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(123)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(1.2)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(3%)" })).toBe(true);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "123" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: '"test"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: '"TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: '"123"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: '="TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "=true" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "=123" })).toBe(true);
  });
});

describe("ISTEXT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISTEXT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=ISTEXT("")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=ISTEXT("test")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=ISTEXT("TRUE")' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISTEXT(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(123)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(3%)" })).toBe(false);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "TEST" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "123" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: '"test"' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: '"TRUE"' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: '"123"' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: '="TRUE"' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "=true" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "=123" })).toBe(false);
  });
});
