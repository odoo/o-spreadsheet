import { evaluateCell } from "../test_helpers/helpers";

describe("ISERR formula", () => {
  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISERR()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=ISERR(A2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=IF()" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=NA()" })).toBe(false);
  });
});

describe("ISERR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISERR()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=ISERR("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISERR("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(3%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(NA())" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=ISERR(1/0)" })).toBe(true); // corresponds to #ERROR error
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISERR(A2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: '"test"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: '"123"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: '="TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=true" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=false" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=123" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=NA()" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=A2" })).toBe(true); // corresponds to #CYCLE error
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=(+" })).toBe(true); // corresponds to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=ISERR(A2)", A2: "=SQRT(-1)" })).toBe(true); // corresponds to #ERROR error
  });
});

describe("ISERROR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISERROR()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=ISERROR("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISERROR("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISERROR(3%)" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=ISERROR(1/0)" })).toBe(true); // corresponds to #ERROR error
    expect(evaluateCell("A1", { A1: "=ISERROR(NA())" })).toBe(true); // corresponds to #N/A error
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

    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=A2" })).toBe(true); // corresponds to #CYCLE error
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=(+" })).toBe(true); // corresponds to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=SQRT(-1)" })).toBe(true); // corresponds to #ERROR error
    expect(evaluateCell("A1", { A1: "=ISERROR(A2)", A2: "=NA()" })).toBe(true); // corresponds to #N/A error
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
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(1/0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(NA())" })).toBe(false);
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
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "=A2" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "=1/0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "=+(" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISLOGICAL(A2)", A2: "=NA()" })).toBe(false);
  });
});

describe("ISNA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISNA()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=ISNA("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISNA("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(3%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(1/0)" })).toBe(false); // corresponds to #ERROR error

    expect(evaluateCell("A1", { A1: "=ISNA(NA())" })).toBe(true);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISNA(A2)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: '"test"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: '"123"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: '="TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "=true" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "=false" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "=123" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "=A2" })).toBe(false); // corresponds to #CYCLE error
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "=(+" })).toBe(false); // corresponds to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "=SQRT(-1)" })).toBe(false); // corresponds to #ERROR error

    expect(evaluateCell("A1", { A1: "=ISNA(A2)", A2: "=NA()" })).toBe(true);
  });
});

describe("ISBLANK formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISBLANK()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=ISBLANK("")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=ISBLANK("test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(3%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(1/0)" })).toBe(false);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "TEST" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: '"test"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: '"123"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: '="TRUE"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "=true" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "=false" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "=123" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "=A2" })).toBe(false); // corresponds to #CYCLE error
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "=(+" })).toBe(false); // corresponds to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=ISBLANK(A2)", A2: "=SQRT(-1)" })).toBe(false); // corresponds to #ERROR error
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
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(1/0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(NA())" })).toBe(true);
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
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "=A2" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "=1/0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "=+(" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=ISNONTEXT(A2)", A2: "=NA()" })).toBe(true);
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
    expect(evaluateCell("A1", { A1: "=ISNUMBER(1/0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(NA())" })).toBe(false);
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
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "=A2" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "=1/0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "=+(" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISNUMBER(A2)", A2: "=NA()" })).toBe(false);
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
    expect(evaluateCell("A1", { A1: "=ISTEXT(1/0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(NA())" })).toBe(false);
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
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "=A2" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "=1/0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "=+(" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=ISTEXT(A2)", A2: "=NA()" })).toBe(false);
  });
});

describe("NA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=NA(0)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NA()" })).toBe("#N/A");
  });
});
