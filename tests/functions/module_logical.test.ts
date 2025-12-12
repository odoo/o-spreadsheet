import { Model } from "../../src";
import { setCellContent, setCellFormat } from "../test_helpers/commands_helpers";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import {
  createModelFromGrid,
  evaluateCell,
  evaluateCellFormat,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";

describe("AND formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=AND( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=AND(TRUE, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(FALSE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=AND(FALSE, TRUE)" })).toBe(false);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=AND("" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND("true" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=AND("false" , TRUE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=AND("test" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND("test" , FALSE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND(TRUE , "test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND(FALSE , "test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=AND(TRUE , "1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=AND(0 , TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=AND(42 , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(-42 , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(TRUE , KABOUM)" })).toBe("#BAD_EXPR");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "FALSE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "TRUE" })).toBe(
      true
    );
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A3: '="FALSE', A4: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A3: "0", A4: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A3: '="0"', A4: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A3: "=kqjsd", A4: "1" })).toBe("#BAD_EXPR");
  });
});

describe("FALSE formula", () => {
  test("does not accept argument", () => {
    expect(evaluateCell("A1", { A1: "=FALSE(45)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });
  test("return false", () => {
    expect(evaluateCell("A1", { A1: "=FALSE()" })).toBe(false);
  });
  test("equals the false boolean value", () => {
    expect(evaluateCell("A1", { A1: "=FALSE()=FALSE" })).toBe(true);
  });
});

describe("IF formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF( ,  ,  )" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(evaluateCell("A1", { A1: "=IF( , 1, 2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(TRUE,  , 2)" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(evaluateCell("A1", { A1: "=IF(FALSE , 1, 2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(TRUE , 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=IF(TRUE , "1", 2)' })).toBe("1");
    expect(evaluateCell("A1", { A1: "=IF(TRUE , FALSE, 2)" })).toBe(false);
  });

  test("functional tests on simple arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IF(TRUE,42,1/0)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=IF(TRUE,1/0,42)" })).toBe("#DIV/0!");
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF(42, 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(0, 1, 2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=IF("test", 1, 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "TRUE", A3: "1", A4: "2" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "FALSE", A3: "1", A4: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: " ", A3: "1", A4: "2" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "TRUE", A3: "42", A4: "=1/0" })).toBe(
      42
    );
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "TRUE", A3: "=1/0", A4: "42" })).toBe(
      "#DIV/0!"
    );
    expect(evaluateCell("A1", { A1: "=IF(TRUE, 1/(1/1), 1/(1/0))" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(FALSE, 1/(1/1), 1/(1/0))" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=IF(FALSE, A1, 42)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=IF(TRUE, A1, 42)" })).toBe("#CYCLE");
    expect(evaluateCell("A2", { A1: "=IF(TRUE, A1, 42)", A2: "=A1" })).toBe("#CYCLE");
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "0", A3: "1", A4: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A3: "1", A4: "2" })).toBe(2);
  });

  test("take format into account", () => {
    expect(evaluateCellFormat("A1", { A1: "=IF(true, A2, A3)", A2: "12/12/12", A3: "42%" })).toBe(
      "m/d/yy"
    );
    expect(evaluateCellFormat("A1", { A1: "=IF(false, A2, A3)", A2: "12/12/12", A3: "42%" })).toBe(
      "0%"
    );
  });

  test("do not apply vectorization to arguments not surrounded by the logical expression", () => {
    //prettier-ignore
    const model = createModelFromGrid({
      A1: "true",  B1: "B1", 
      A2: "false", B2: "B2" 
    });
    setCellContent(model, "A3", "=IF(A1, 42, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([[42], [null]]);

    setCellContent(model, "A3", "=IF(A2, 42, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([["B1"], ["B2"]]);
  });

  test("apply vectorization to arguments when logical expression is a matrix", () => {
    //prettier-ignore
    const grid = { 
      A1: "true", B1: "false", C1: "C1", D1: "D1", E1: "E1",
      A2: "true", B2: "true"
    };
    const model = createModelFromGrid(grid);

    setCellContent(model, "A3", "=IF(A1:A2, 42, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      [42, 42, 42],
      [42, 42, 42],
    ]);

    setCellContent(model, "A3", "=IF(B1:B2, 42, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      ["C1", "D1", "E1"],
      [42, 42, 42],
    ]);
  });

  test("IF output can be used as a reference", () => {
    expect(evaluateCell("A1", { A1: '=CELL("address", IF(false, B1, C1))' })).toBe("$C$1");
  });
});

describe("IFERROR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR( )" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=IFERROR( ,  )" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(evaluateCell("A1", { A1: "=IFERROR(FALSE , 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFERROR(TRUE , 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=IFERROR("" , 42)' })).toBe("");
    expect(evaluateCell("A1", { A1: "=IFERROR(3% , 42)" })).toBe(0.03);
  });

  test("functional tests on simple arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR(FALSE, 42/0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFERROR(42/0, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFERROR(42/0, )" })).toBe(0); // @compatibility: on google sheets, return empty string ""
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "=A2" })).toBe(42); // corespond to #CYCLE error
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "=(+" })).toBe(42); // corespond to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "=SQRT(-1)" })).toBe(42); // corespond to #ERROR error

    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "3" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "test" })).toBe("test");
  });

  test("functional tests on function arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR(ADD(1,2), 42)" })).toBe(3);
  });

  test("functional tests on wrong expressions arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR((+, 42)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=IFERROR(TODAY(4), 42)" })).toBe("#BAD_EXPR");
  });

  test("functional tests on arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, A3)", A2: "TRUE", A3: "=1/0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, A3)", A2: "=1/0", A3: "=1/0" })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=IFERROR(TRUE, COUNT(1/0))" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=IFERROR(1/0, COUNT(A1))" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=IFERROR(IFERROR(TRUE, 1/0), 1/0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=IFERROR(IFERROR(1/0, 1/0), 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IFERROR(IFERROR(1/0, 1/0), A1)" })).toBe("#CYCLE");
    expect(evaluateCell("A1", { A1: "=IFERROR(1, 1/0) + IFERROR(1, 1/0)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IFERROR(doesNotExist!B1, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IFERROR(doesNotExist!B1:B2, 1)" })).toBe(1);
  });

  test("format is preserved from value", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellFormat(model, "A1", "0.00%");
    setCellContent(model, "A3", "=IFERROR(A1, 2)");
    expect(getEvaluatedCell(model, "A3").formattedValue).toBe("100.00%");
  });

  test("format is preserved from error value", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellFormat(model, "A1", "0.00%");
    setCellContent(model, "A3", "=IFERROR(0/0, A1)");
    expect(getEvaluatedCell(model, "A3").formattedValue).toBe("100.00%");
  });

  test("do not apply vectorization to arguments not surrounded by the logical expression", () => {
    const model = createModelFromGrid({
      A1: "42",
      B1: "B1",
      A2: "=1/0",
      B2: "B2",
    });

    setCellContent(model, "A3", "=IFERROR(A1, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([[42], [null]]);

    setCellContent(model, "A3", "=IFERROR(A2, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([["B1"], ["B2"]]);
  });

  test("apply vectorization to arguments when logical expression is a matrix", () => {
    //prettier-ignore
    const grid = { 
      A1: "42", B1: "=1/0", C1: "C1", D1: "D1", E1: "E1",
      A2: "53", B2: "64"
    };
    const model = createModelFromGrid(grid);

    setCellContent(model, "A3", "=IFERROR(A1:A2, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      [42, 42, 42],
      [53, 53, 53],
    ]);

    setCellContent(model, "A3", "=IFERROR(B1:B2, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      ["C1", "D1", "E1"],
      [64, 64, 64],
    ]);
  });
});

describe("IFNA formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFNA( )" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFNA( ,  )" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(evaluateCell("A1", { A1: "=IFNA(FALSE , 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFNA(TRUE , 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=IFNA("" , 42)' })).toBe("");
    expect(evaluateCell("A1", { A1: "=IFNA(3% , 42)" })).toBe(0.03);
    expect(evaluateCell("A1", { A1: "=IFNA(FALSE, 42/0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFNA(42/0, FALSE)" })).toBe("#DIV/0!");

    expect(evaluateCell("A1", { A1: "=IFNA(NA(), 42)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=IFNA(NA(), )" })).toBe(0); // @compatibility: on google sheets, return empty string ""
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "=NA()" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "=A2" })).toBe("#CYCLE"); // corespond to #CYCLE error
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "=(+" })).toBe("#BAD_EXPR"); // corespond to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "=SQRT(-1)" })).toBe("#ERROR"); // corespond to #ERROR error

    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "3" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=IFNA(A2, 42)", A2: "test" })).toBe("test");
  });

  test("take format into account", () => {
    expect(evaluateCellFormat("A1", { A1: "=IFNA(A2, A3)", A2: "=NA()", A3: "42%" })).toBe("0%");
    expect(evaluateCellFormat("A1", { A1: "=IFNA(A2, A3)", A2: "12/12/12", A3: "42%" })).toBe(
      "m/d/yy"
    );
  });

  test("do not apply vectorization to arguments not surrounded by the logical expression", () => {
    const model = createModelFromGrid({ B1: "B1", B2: "B2" });

    setCellContent(model, "A3", "=IFNA(42, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([[42], [null]]);

    setCellContent(model, "A3", "=IFNA(NA(), B1:B2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([["B1"], ["B2"]]);
  });

  test("apply vectorization to arguments when logical expression is a matrix", () => {
    //prettier-ignore
    const grid = { 
      A1: "42", B1: "=NA()", C1: "C1", D1: "D1", E1: "E1",
      A2: "53", B2: "64"
    };
    const model = createModelFromGrid(grid);

    setCellContent(model, "A3", "=IFNA(A1:A2, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      [42, 42, 42],
      [53, 53, 53],
    ]);

    setCellContent(model, "A3", "=IFNA(B1:B2, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      ["C1", "D1", "E1"],
      [64, 64, 64],
    ]);
  });
});

describe("IFS formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS( , 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(FALSE, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(TRUE, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=IFS(TRUE, "1")' })).toBe("1");
    expect(evaluateCell("A1", { A1: "=IFS(TRUE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFS(TRUE, )" })).toBe(0); // @compatibility: on google sheets, return empty string ""
  });

  test("functional tests on simple arguments with errors", () => {
    expect(evaluateCell("A1", { A1: '=IFS(TRUE, "ok1", 1/0, 1/0)' })).toBe("ok1");
    expect(evaluateCell("A1", { A1: '=IFS(1/0, "ok1", TRUE, 42)' })).toBe("#DIV/0!");
    expect(evaluateCell("A1", { A1: "=IFS(TRUE, 1/0, TRUE, 42)" })).toBe("#DIV/0!");
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS(42, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IFS(0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=IFS("test", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "TRUE", A3: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "FALSE", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "test", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "TRUE" })).toBe(0); // @compatibility: on google sheets, return empty string ""
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "False",
        A3: "ok1",
        A4: "TRUE",
        A5: "ok2",
      })
    ).toBe("ok2");
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "TRUE",
        A3: "ok1",
        A4: "TRUE",
        A5: "ok2",
      })
    ).toBe("ok1");
  });

  test("functional tests on cell arguments with errors", () => {
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "TRUE",
        A3: "ok1",
        A4: "=1/0",
        A5: "=1/0",
      })
    ).toBe("ok1");
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "=1/0",
        A3: "ok1",
        A4: "TRUE",
        A5: "42",
      })
    ).toBe("#DIV/0!");
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "TRUE",
        A3: "=1/0",
        A4: "TRUE",
        A5: "42",
      })
    ).toBe("#DIV/0!");
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "test", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "1", A3: "2" })).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=IFS(A2, A3, A4, A5)", A2: "42", A3: "ok1", A4: "TRUE", A5: "ok2" })
    ).toBe("ok1");
    expect(
      evaluateCell("A1", { A1: "=IFS(A2, A3, A4, A5)", A2: "0", A3: "ok1", A4: "TRUE", A5: "ok2" })
    ).toBe("ok2");
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "test",
        A3: "ok1",
        A4: "TRUE",
        A5: "ok2",
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("take format into account", () => {
    expect(
      evaluateCellFormat("A1", { A1: "=IFS(true, A2, true, A3)", A2: "12/12/12", A3: "42%" })
    ).toBe("m/d/yy");
    expect(
      evaluateCellFormat("A1", { A1: "=IFS(false, A2, true, A3)", A2: "12/12/12", A3: "42%" })
    ).toBe("0%");
  });

  test("do not apply vectorization to arguments not surrounded by the logical expression", () => {
    //prettier-ignore
    const model = createModelFromGrid({
      A1: "true",  B1: "true",  C1: "C1", 
      A2: "false", B2: "false", C2: "C2",
    });

    setCellContent(model, "A3", "=IFS(A1, 42, B1, C1:C2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([[42], [null]]);

    setCellContent(model, "A3", "=IFS(A1, 42, B1:B2, C1:C2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([[42], [null]]);

    setCellContent(model, "A3", "=IFS(A2, 42, B1, C1:C2)");
    expect(getRangeValuesAsMatrix(model, "A3:A4")).toEqual([["C1"], ["C2"]]);
  });

  test("apply vectorization to arguments when logical expression is a matrix", () => {
    //prettier-ignore
    const model = createModelFromGrid({
      A1: "true", B1: "true",  C1: "C1",   D1: "D1",   E1: "E1",
      A2: "true", B2: "false", C2: "true", D2: "true", E2: "true",
    });

    setCellContent(model, "A3", "=IFS(A1:A2, 42, true, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      [42, 42, 42],
      [42, 42, 42],
    ]);

    setCellContent(model, "A3", "=IFS(A1:A2, 42, C1:E1, true)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      [42, 42, 42],
      [42, 42, 42],
    ]);

    setCellContent(model, "A3", "=IFS(B1:B2, 42, true, C1:E1)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      [42, 42, 42],
      ["C1", "D1", "E1"],
    ]);

    setCellContent(model, "A3", "=IFS(B1:B2, 42, C2:E2, 24)");
    expect(getRangeValuesAsMatrix(model, "A3:C4")).toEqual([
      [42, 42, 42],
      [24, 24, 24],
    ]);
  });

  test("IFS output can be used as a reference", () => {
    expect(evaluateCell("A1", { A1: '=CELL("address", IFS(false, B1, true, C1))' })).toBe("$C$1");
  });
});

describe("NOT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A// @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NOT(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(FALSE)" })).toBe(true);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT(0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NOT("test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=NOT("true")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NOT("false")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NOT("1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT(A2)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "=TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "=FALSE" })).toBe(true);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "test" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '"true"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '"false"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '="true"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '="false"' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '"0"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });
});

describe("OR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=OR( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=OR(TRUE, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(FALSE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=OR(FALSE, TRUE)" })).toBe(true);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=OR("" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR("true" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR("false" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR("false" , FALSE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=OR("test" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR("test" , FALSE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR(FALSE , "test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR(TRUE , "test")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR(TRUE , "1")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR("1", TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=OR(0 , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(42 , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(-42 , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(FALSE , KABOUM)" })).toBe("#BAD_EXPR");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "TRUE", A4: "FALSE" })).toBe(
      true
    );
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "TRUE", A4: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "FALSE", A4: "FALSE" })).toBe(
      false
    );
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "TRUE", A4: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "FALSE", A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A3: '="TRUE"', A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A3: "42", A4: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A3: '="42"', A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A3: "=kqjsd", A4: "0" })).toBe("#BAD_EXPR");
  });
});

describe("SWITCH formula", () => {
  test("take 3 argument minimum", () => {
    expect(evaluateCell("A1", { A1: "=SWITCH(42, 42, 42)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SWITCH(42, 42)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=SWITCH(42)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=SWITCH()" })).toBe("#BAD_EXPR");
  });

  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 23, 123)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=SWITCH( 23, 23, 123)" })).toBe(123);
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 23, 123, 42, 321)" })).toBe(321);
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 23, 123, 24, 321)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 23, 123, 24, 321, 42, 1111)" })).toBe(1111);

    expect(evaluateCell("A1", { A1: "=SWITCH(TRUE, FALSE, 23)" })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=SWITCH(TRUE, TRUE, 23)" })).toBe(23);
    expect(evaluateCell("A1", { A1: "=SWITCH(23, 23, TRUE)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=SWITCH("str", 23, 1, "str2", 2, "str", 3)' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=SWITCH(25, 26, "str2", 25, "str")' })).toBe("str");

    expect(evaluateCell("A1", { A1: "=SWITCH( , , 42)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 42, )" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=SWITCH("", "", 42)' })).toBe(42);
    expect(evaluateCell("A1", { A1: '=SWITCH(42, 42, "")' })).toBe("");

    expect(evaluateCell("A1", { A1: '=SWITCH("true" , TRUE, 42)' })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: "=SWITCH(1, TRUE, 42)" })).toBe("#N/A");
  });

  test("functional with optional value after repeatable values", () => {
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 23, 23, 123)" })).toBe(123);
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 23, 23, 42, 321, 123)" })).toBe(321);
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 23, 23, 45, 321, )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=SWITCH( 42, 43, 43, )" })).toBe(0);
  });

  test("functional tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=SWITCH(A2, A3, A4)", A2: "test", A3: "TRUE", A4: "42" })
    ).toBe("#N/A");
    expect(
      evaluateCell("A1", { A1: "=SWITCH(A2, A3, A4)", A2: "test", A3: "test", A4: "42" })
    ).toBe(42);
  });

  test("return error only when arriving on an error value", () => {
    expect(evaluateCell("A1", { A1: "=SWITCH(KABOUM, 42, 42)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=SWITCH(42, KABOUM, 42)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=SWITCH(42, 23, KABOUM, 42, 111)" })).toBe(111);
    expect(evaluateCell("A1", { A1: "=SWITCH(42, 42, 111, KABOUM, 666)" })).toBe(111);
    expect(evaluateCell("A1", { A1: "=SWITCH(42, 23, KABOUM, KABOUM, 666, 42, 11)" })).toBe(
      "#BAD_EXPR"
    );
  });

  test("SWITCH output can be used as a reference", () => {
    expect(evaluateCell("A1", { A1: '=CELL("address", SWITCH(42, 41, B1, 42, C1, 43, D1))' })).toBe(
      "$C$1"
    );
  });
});

describe("TRUE formula", () => {
  test("does not accept argument", () => {
    expect(evaluateCell("A1", { A1: "=TRUE(45)" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });
  test("return true", () => {
    expect(evaluateCell("A1", { A1: "=TRUE()" })).toBe(true);
  });
  test("equals the true boolean value", () => {
    expect(evaluateCell("A1", { A1: "=TRUE()=TRUE" })).toBe(true);
  });
});

describe("XOR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=XOR( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=XOR(TRUE, TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(FALSE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(FALSE, TRUE)" })).toBe(true);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=XOR("" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR("true" , TRUE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=XOR("false" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=XOR("false" , FALSE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=XOR("test" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR("test" , FALSE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR(TRUE , "test" )' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR(FALSE , "test" )' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR(TRUE , "1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=XOR(0 , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(42 , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(-42 , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(TRUE , KABOUM)" })).toBe("#BAD_EXPR");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "TRUE", A4: "FALSE" })).toBe(
      true
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "TRUE", A4: "TRUE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "TRUE", A3: "TRUE", A4: "TRUE" })).toBe(
      true
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "FALSE", A3: "FALSE", A4: "FALSE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "FALSE", A3: "TRUE", A4: "TRUE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "FALSE", A4: "FALSE" })).toBe(
      false
    );
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "TRUE", A4: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "FALSE", A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A3: '="TRUE"', A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A3: "42", A4: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A3: '="42"', A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A3: "=kqjsd", A4: "0" })).toBe("#BAD_EXPR");
  });
});
