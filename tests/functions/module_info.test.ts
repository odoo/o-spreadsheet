import { Model } from "../../src";
import { createSheet, setCellContent, setFormat } from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import { createModelFromGrid, evaluateCell, setGrid } from "../test_helpers/helpers";

describe("CELL formula", () => {
  test("CELL takes 2 arguments", () => {
    expect(evaluateCell("A1", { A1: "=CELL()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=CELL("address")' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=CELL("address", B1)' })).toBe("$B$1");
    expect(evaluateCell("A1", { A1: '=CELL("address", B1, 0)' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("CELL results with address parameter", () => {
    const grid = {
      A1: '=CELL("address", B1)',
      A2: '=CELL("address", C2:D4)',
      A3: '=CELL("address", Sheet2!C2:D4)',
      A4: '=CELL("address", Sheet1!E1:E2)',
    };
    const model = Model.BuildSync();
    createSheet(model, { sheetId: "sh2", name: "Sheet2" });
    setGrid(model, grid);

    expect(getCellContent(model, "A1")).toBe("$B$1");
    expect(getCellContent(model, "A2")).toBe("$C$2");
    expect(getCellContent(model, "A3")).toBe("Sheet2!$C$2");
    expect(getCellContent(model, "A4")).toBe("$E$1");
  });

  test("CELL results with col parameter", () => {
    const grid = {
      A1: '=CELL("col", B1)',
      A2: '=CELL("col", C2:D4)',
      A3: '=CELL("col", Sheet2!D2:D4)',
    };
    const model = Model.BuildSync();
    createSheet(model, { sheetId: "sh2", name: "Sheet2" });
    setGrid(model, grid);

    expect(getCellContent(model, "A1")).toBe("2");
    expect(getCellContent(model, "A2")).toBe("3");
    expect(getCellContent(model, "A3")).toBe("4");
  });

  test("CELL results with row parameter", () => {
    const grid = {
      A1: '=CELL("row", B1)',
      A2: '=CELL("row", C2:D4)',
      A3: '=CELL("row", Sheet2!D5:D9)',
    };
    const model = Model.BuildSync();
    createSheet(model, { sheetId: "sh2", name: "Sheet2" });
    setGrid(model, grid);

    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A2")).toBe("2");
    expect(getCellContent(model, "A3")).toBe("5");
  });

  test("CELL results with contents parameter", () => {
    const grid = {
      A1: '=CELL("contents", B1)',
      A2: '=CELL("contents", C2:D4)',
      A3: '=CELL("contents", Sheet2!D5:D9)',
      B1: "1",
      C2: "hello",
    };
    const model = Model.BuildSync();
    createSheet(model, { sheetId: "sh2", name: "Sheet2" });
    setCellContent(model, "D5", "=1+1", "sh2");
    setGrid(model, grid);

    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A2")).toBe("hello");
    expect(getCellContent(model, "A3")).toBe("2");
  });

  test("CELL results with format parameter", () => {
    const grid = {
      A1: '=CELL("format", B1)',
      A2: '=CELL("format", B2)',
      A3: '=CELL("format", B3)',
      B1: "1",
      B2: "=C1",
      B3: "9",
    };
    const model = Model.BuildSync();
    setFormat(model, "B1", "d/m/yyyy");
    setFormat(model, "C1", "0.00");
    setGrid(model, grid);

    expect(getCellContent(model, "A1")).toBe("d/m/yyyy");
    expect(getCellContent(model, "A2")).toBe("0.00");
    expect(getCellContent(model, "A3")).toBe("");
  });

  test("CELL results with type parameter", () => {
    const grid = {
      A1: '=CELL("type", B1)',
      A2: '=CELL("type", B2)',
      A3: '=CELL("type", B3)',
      B1: "1",
      B2: "=C1",
      C1: "hello",
    };
    const model = createModelFromGrid(grid);

    expect(getCellContent(model, "A1")).toBe("v");
    expect(getCellContent(model, "A2")).toBe("l");
    expect(getCellContent(model, "A3")).toBe("b");
  });

  test("CELL can be called without grid context", () => {
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "sh2", name: "Sh2" });
    setCellContent(model, "D5", "=1+1", sheetId);

    expect(model.getters.evaluateFormula(sheetId, '=CELL("address", Sh2!B1)')).toBe("Sh2!$B$1");
    expect(model.getters.evaluateFormula(sheetId, '=CELL("contents", D5)')).toBe(2);
  });
});

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
