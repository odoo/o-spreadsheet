import { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { toScalar } from "@odoo/o-spreadsheet-engine/functions/helper_matrices";
import { toMatrix, toNumber } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { toCartesian, toZone } from "../../src/helpers";
import { DEFAULT_LOCALE, ErrorCell, UID } from "../../src/types";
import {
  addColumns,
  addRows,
  cut,
  deleteColumns,
  deleteContent,
  deleteRows,
  evaluateCells,
  merge,
  paste,
  setCellContent,
  setFormat,
  unMerge,
} from "../test_helpers/commands_helpers";
import { getCellContent, getCellError, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { addToRegistry, createModel } from "../test_helpers/helpers";

let model: Model;
let sheetId: UID;

describe("evaluate formulas that use/return an array", () => {
  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
    addToRegistry(functionRegistry, "MFILL", {
      description: "Return an n*n matrix filled with n.",
      args: [
        arg("n (number)", "number of column of the matrix"),
        arg("m (number)", "number of row of the matrix"),
        arg("v (number)", "value to fill matrix"),
      ],
      compute: function (n, m, v): number[][] {
        const _n = toNumber(toScalar(n), DEFAULT_LOCALE);
        const _m = toNumber(toScalar(m), DEFAULT_LOCALE);
        const _v = toNumber(toScalar(v), DEFAULT_LOCALE);
        return Array.from({ length: _n }, (_, i) => Array.from({ length: _m }, (_, j) => _v));
      },
    });
  });

  test("a simple reference to a range cannot return an array", async () => {
    await setCellContent(model, "A1", "=B2:B3");
    await setCellContent(model, "B2", "Hi");
    await setCellContent(model, "B3", "Hello");
    expect(getEvaluatedCell(model, "A1").value).toBe("Hi");
    expect(getEvaluatedCell(model, "A2").value).toBe("Hello");
  });

  test("can spread array", async () => {
    await setCellContent(model, "A1", "=MFILL(2, 2, 42)");
    expect(getEvaluatedCell(model, "A1").value).toBe(42);
    expect(getEvaluatedCell(model, "A2").value).toBe(42);
    expect(getEvaluatedCell(model, "B1").value).toBe(42);
    expect(getEvaluatedCell(model, "B2").value).toBe(42);
  });

  test("can use result array in formula that accept array", async () => {
    await setCellContent(model, "A1", "=SUM(MFILL(2, 2, 42))");
    expect(getEvaluatedCell(model, "A1").value).toBe(168);
  });

  test("can reference spilled range with spill operator", async () => {
    await setCellContent(model, "A1", "=MFILL(2, 2, 5)");
    await setCellContent(model, "D1", "=SUM(A1#)");
    expect(getEvaluatedCell(model, "D1").value).toBe(20);
  });

  test("can use result array in formula that accept scalar only (vectorization)", async () => {
    await setCellContent(model, "A1", "=ABS(MFILL(2, 2, -42))");
    expect(getEvaluatedCell(model, "A1").value).toBe(42);
    expect(getEvaluatedCell(model, "A2").value).toBe(42);
    expect(getEvaluatedCell(model, "B1").value).toBe(42);
    expect(getEvaluatedCell(model, "B2").value).toBe(42);
  });

  test("can use 1x1 result array in formula that accept scalar", async () => {
    await setCellContent(model, "A1", "=ABS(MFILL(1, 1, -42))");
    expect(getEvaluatedCell(model, "A1").value).toBe(42);
  });

  test("reference to a formula result array is possible", async () => {
    await setCellContent(model, "E5", "=B2");
    await setCellContent(model, "A1", "=MFILL(3,3,42)");
    await setCellContent(model, "D4", "=C3");
    expect(getEvaluatedCell(model, "E5").value).toBe(42);
    expect(getEvaluatedCell(model, "D4").value).toBe(42);
  });

  test("reference to a formula result array is null when removing the array formula", async () => {
    await setCellContent(model, "E5", "=B2");
    await setCellContent(model, "A1", "=MFILL(3,3,42)");
    await setCellContent(model, "D4", "=C3");
    await setCellContent(model, "A1", "");
    expect(getEvaluatedCell(model, "E5").value).toBe(0);
    expect(getEvaluatedCell(model, "D4").value).toBe(0);
  });

  test("can spread array with errors", async () => {
    await setCellContent(model, "A1", "42");
    await setCellContent(model, "A2", "=SQRT(-1)");
    await setCellContent(model, "B1", "=TRANSPOSE(A1:A2)");
    expect(getEvaluatedCell(model, "B1").value).toBe(42);
    expect(getEvaluatedCell(model, "C1").value).toBe("#ERROR");
  });

  test("can interpolate function name when error is returned", async () => {
    addToRegistry(functionRegistry, "GETERR", {
      description: "Get error",
      compute: () => {
        const error = {
          value: "#SPILL!",
          message: "Function [[FUNCTION_NAME]] failed",
        };
        return [[{ value: 42 }, error]];
      },
      args: [],
    });
    await setCellContent(model, "A1", "=GETERR()");
    expect((getEvaluatedCell(model, "A2") as ErrorCell).message).toBe("Function GETERR failed");
  });

  test("delete blocking content spills the result", async () => {
    await setCellContent(model, "A1", "=MFILL(3,3, 42)");
    await setCellContent(model, "A2", "coucou");
    expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");

    await addColumns(model, "before", "A", 1); // this forces a full re-evaluation
    await deleteContent(model, ["B2"]);
    expect(getEvaluatedCell(model, "B1").value).toBe(42);
  });

  test("1x1 matrix do not have any spreading relation", async () => {
    await setCellContent(model, "A1", "=MUNIT(1)");
    const positionA1 = model.getters.getActivePosition();
    expect(model.getters.getArrayFormulaSpreadingOn(positionA1)).not.toBeDefined();
  });

  test("Spreading relations are properly cleared upon cell content change", async () => {
    await setCellContent(model, "A1", "=MUNIT(2)");
    const positionA1 = model.getters.getActivePosition();
    expect(model.getters.getArrayFormulaSpreadingOn(positionA1)).toBeDefined();
    await setCellContent(model, "A1", "42");
    expect(model.getters.getArrayFormulaSpreadingOn(positionA1)).not.toBeDefined();
  });

  describe("spread matrix with format", () => {
    test("can spread matrix of values with matrix of format", async () => {
      addToRegistry(functionRegistry, "MATRIX.2.2", {
        description: "Return an 2*2 matrix with some values",
        args: [],
        compute: function () {
          return [
            [{ value: 1, format: "0.00" }, { value: 2 }],
            [{ value: 3, format: "0.00" }, { value: 4 }],
          ];
        },
      });

      await setFormat(model, "A1:A2", "0%");
      await setCellContent(model, "A1", "=MATRIX.2.2()");

      expect(getCellContent(model, "A1")).toBe("100%");
      expect(getCellContent(model, "A2")).toBe("200%");

      expect(getCellContent(model, "B1")).toBe("3.00");
      expect(getCellContent(model, "B2")).toBe("4");
    });

    test("can spread matrix of format depending on matrix of format", async () => {
      addToRegistry(functionRegistry, "MATRIX", {
        description: "Return the matrix passed as argument",
        args: [arg("matrix (range<number>)", "a matrix")],
        compute: function (matrix) {
          return toMatrix(matrix);
        },
      });

      await setCellContent(model, "A1", "42");
      await setCellContent(model, "A2", "24");

      await setFormat(model, "A1", "0%");
      await setFormat(model, "A2", "0.00");

      await setCellContent(model, "B1", "=MATRIX(A1:A2)");

      expect(getCellContent(model, "B1")).toBe("4200%");
      expect(getCellContent(model, "B2")).toBe("24.00");

      await setCellContent(model, "C1", "=MATRIX(B1:B2)");

      expect(getCellContent(model, "C1")).toBe("4200%");
      expect(getCellContent(model, "C2")).toBe("24.00");
    });
  });

  describe("cut/past reference", () => {
    test("reference to a spread is keep when we cut/past the spread formula", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      await setCellContent(model, "A3", "=B2");
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      await cut(model, "A1:B2");
      await paste(model, "C1");
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      await setCellContent(model, "C1", "=MFILL(2,2,24)");
      expect(getEvaluatedCell(model, "A3").value).toBe(24);
    });

    test("references to a spread are keep when we cut/past the spread formula", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      await setCellContent(model, "A3", "=TRANSPOSE(A1:B2)");
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      expect(getEvaluatedCell(model, "B4").value).toBe(42);
      await cut(model, "A1:B2");
      await paste(model, "C1");
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      expect(getEvaluatedCell(model, "B4").value).toBe(42);
      await setCellContent(model, "C1", "=MFILL(2,2,24)");
      expect(getEvaluatedCell(model, "A3").value).toBe(24);
      expect(getEvaluatedCell(model, "B4").value).toBe(24);
    });

    test("reference to a spread is keep when we cut/past the reference", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      await setCellContent(model, "A3", "=B2");
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      await cut(model, "A3");
      await paste(model, "C3");
      expect(getEvaluatedCell(model, "C3").value).toBe(42);
      await setCellContent(model, "A1", "=MFILL(2,2,24)");
      expect(getEvaluatedCell(model, "C3").value).toBe(24);
    });

    test("references to a spread are keep when we cut/past the references", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      await setCellContent(model, "A3", "=TRANSPOSE(A1:B2)");
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      expect(getEvaluatedCell(model, "B4").value).toBe(42);
      await cut(model, "A3:B4");
      await paste(model, "C3");
      expect(getEvaluatedCell(model, "C3").value).toBe(42);
      expect(getEvaluatedCell(model, "D4").value).toBe(42);
      await setCellContent(model, "A1", "=MFILL(2,2,24)");
      expect(getEvaluatedCell(model, "C3").value).toBe(24);
      expect(getEvaluatedCell(model, "D4").value).toBe(24);
    });
  });

  describe("result array can collides with other cell", () => {
    test("throw error on the formula when collide with cell having content", async () => {
      await setCellContent(model, "B2", "kikou");
      await setCellContent(model, "A1", "=MFILL(2,2, 42)");
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getCellError(model, "A1")).toBe(
        "Array result was not expanded because it would overwrite data in B2."
      );

      await setCellContent(model, "A4", "kikou");
      await setCellContent(model, "A3", "=MFILL(2,2, 42)");
      expect(getEvaluatedCell(model, "A3").value).toBe("#SPILL!");
      expect(getCellError(model, "A3")).toBe(
        "Array result was not expanded because it would overwrite data in A4."
      );
    });

    test("throw error on the formula when collide with other formula ", async () => {
      await setCellContent(model, "B2", "=SUM(42+24)");
      await setCellContent(model, "A1", "=MFILL(2,2, 42)");
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getCellError(model, "A1")).toBe(
        "Array result was not expanded because it would overwrite data in B2."
      );
      expect(getEvaluatedCell(model, "A2").value).toBe(null);
      expect(getEvaluatedCell(model, "B1").value).toBe(null);
      expect(getEvaluatedCell(model, "B2").value).toBe(66);
    });

    test("throw error message concerning the first cell encountered vertically", async () => {
      await setCellContent(model, "A1", "=MFILL(1,3, 42)");
      await setCellContent(model, "A2", "kikou");
      await setCellContent(model, "A3", "kikou");
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getCellError(model, "A1")).toBe(
        "Array result was not expanded because it would overwrite data in A2."
      );
    });

    test("throw error message concerning the first cell encountered horizontally", async () => {
      await setCellContent(model, "A1", "=MFILL(3,1, 42)");
      await setCellContent(model, "B1", "kikou");
      await setCellContent(model, "C1", "kikou");
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getCellError(model, "A1")).toBe(
        "Array result was not expanded because it would overwrite data in B1."
      );
    });

    describe("do not spread result when collide", () => {
      test("write collision first", async () => {
        await setCellContent(model, "B2", "kikou");
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        expect(getEvaluatedCell(model, "A2").value).toBe(null);
        expect(getEvaluatedCell(model, "B1").value).toBe(null);
        expect(getEvaluatedCell(model, "B2").value).toBe("kikou");
      });

      test("write formula first", async () => {
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await setCellContent(model, "B2", "kikou");
        expect(getEvaluatedCell(model, "A2").value).toBe(null);
        expect(getEvaluatedCell(model, "B1").value).toBe(null);
        expect(getEvaluatedCell(model, "B2").value).toBe("kikou");
      });

      test("do not spread result when collision removed then added again", async () => {
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await setCellContent(model, "B2", "kikou");
        await setCellContent(model, "B2", "");
        await setCellContent(model, "B2", "kikou");
        expect(getEvaluatedCell(model, "A2").value).toBe(null);
        expect(getEvaluatedCell(model, "B1").value).toBe(null);
        expect(getEvaluatedCell(model, "B2").value).toBe("kikou");
      });
    });

    describe("spread result when remove collision", () => {
      test("write collision first", async () => {
        await setCellContent(model, "B2", "kikou");
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await setCellContent(model, "B2", "");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);
        expect(getEvaluatedCell(model, "A2").value).toBe(42);
        expect(getEvaluatedCell(model, "B1").value).toBe(42);
        expect(getEvaluatedCell(model, "B2").value).toBe(42);
      });

      test("write formula first", async () => {
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await setCellContent(model, "B2", "kikou");
        await setCellContent(model, "B2", "");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);
        expect(getEvaluatedCell(model, "A2").value).toBe(42);
        expect(getEvaluatedCell(model, "B1").value).toBe(42);
        expect(getEvaluatedCell(model, "B2").value).toBe(42);
      });
    });

    describe("spread result when remove several collision", () => {
      test("write collision first", async () => {
        await setCellContent(model, "B1", "kikou 1");
        await setCellContent(model, "B2", "kikou 2");
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await deleteContent(model, ["B1:B2"]);
        expect(getEvaluatedCell(model, "A1").value).toBe(42);
        expect(getEvaluatedCell(model, "A2").value).toBe(42);
        expect(getEvaluatedCell(model, "B1").value).toBe(42);
        expect(getEvaluatedCell(model, "B2").value).toBe(42);
      });

      test("write formula first", async () => {
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await setCellContent(model, "B1", "kikou 1");
        await setCellContent(model, "B2", "kikou 2");
        await deleteContent(model, ["B1:B2"]);
        expect(getEvaluatedCell(model, "A1").value).toBe(42);
        expect(getEvaluatedCell(model, "A2").value).toBe(42);
        expect(getEvaluatedCell(model, "B1").value).toBe(42);
        expect(getEvaluatedCell(model, "B2").value).toBe(42);
      });
    });

    describe("keep collide when change collision", () => {
      test("write collision first", async () => {
        await setCellContent(model, "B2", "kikou");
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await setCellContent(model, "B2", "Aquecoucou");
        expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
        expect(getEvaluatedCell(model, "A2").value).toBe(null);
        expect(getEvaluatedCell(model, "B1").value).toBe(null);
        expect(getEvaluatedCell(model, "B2").value).toBe("Aquecoucou");
      });

      test("write formula first", async () => {
        await setCellContent(model, "A1", "=MFILL(2,2, 42)");
        await setCellContent(model, "B2", "kikou");
        await setCellContent(model, "B2", "Aquecoucou");
        expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
        expect(getEvaluatedCell(model, "A2").value).toBe(null);
        expect(getEvaluatedCell(model, "B1").value).toBe(null);
        expect(getEvaluatedCell(model, "B2").value).toBe("Aquecoucou");
      });
    });

    describe("collision tests on several limit positions", () => {
      test("limit located on the formula column", async () => {
        await setCellContent(model, "A1", "=MFILL(3,3,42)");
        await setCellContent(model, "A4", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);

        await setCellContent(model, "A3", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      });

      test("limit located on the formula row", async () => {
        await setCellContent(model, "A1", "=MFILL(3,3,42)");
        await setCellContent(model, "D1", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);

        await setCellContent(model, "C1", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      });

      test("limit located before the formula column", async () => {
        await setCellContent(model, "B1", "=MFILL(3,3,42)");
        await setCellContent(model, "A3", "kikou");
        expect(getEvaluatedCell(model, "B1").value).toBe(42);
      });

      test("limit located before the formula row", async () => {
        await setCellContent(model, "A2", "=MFILL(3,3,42)");
        await setCellContent(model, "C1", "kikou");
        expect(getEvaluatedCell(model, "A2").value).toBe(42);
      });

      test("limit located adter the formula column", async () => {
        await setCellContent(model, "A1", "=MFILL(1,3,42)");
        await setCellContent(model, "B3", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);

        await setCellContent(model, "A1", "=MFILL(2,3,42)");
        expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      });

      test("limit located after the formula row", async () => {
        await setCellContent(model, "A1", "=MFILL(1,3,42)");
        await setCellContent(model, "C2", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);

        await setCellContent(model, "A1", "=MFILL(3,2,42)");
        expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      });

      test("multiple limit test", async () => {
        await setCellContent(model, "A1", "=MFILL(5,3,42)");
        await setCellContent(model, "B4", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);
        await setCellContent(model, "C5", "kikou");
        expect(getEvaluatedCell(model, "A1").value).toBe(42);
        await setCellContent(model, "D3", "colision");
        expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      });
    });
  });

  describe("result array can collides with sheet borders", () => {
    let model: Model;
    beforeEach(async () => {
      model = await createModel({
        sheets: [
          {
            id: "sheet1",
            colNumber: 3,
            rowNumber: 3,
          },
        ],
      });
    });

    test("throw error message concerning the column encountered horizontally", async () => {
      await setCellContent(model, "B1", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "B1").value).toBe("#SPILL!");
      expect(getCellError(model, "B1")).toBe("Result couldn't be automatically expanded.");
    });

    test("throw error message concerning the row encountered verticaly", async () => {
      await setCellContent(model, "A2", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "A2").value).toBe("#SPILL!");
      expect(getCellError(model, "A2")).toBe("Result couldn't be automatically expanded.");
    });

    test("throw error message concerning the row and column encountered", async () => {
      await setCellContent(model, "B2", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "B2").value).toBe("#SPILL!");
      expect(getCellError(model, "B2")).toBe("Result couldn't be automatically expanded.");
    });

    test("do not spread result when collide", async () => {
      await setCellContent(model, "B2", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "B2").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "B3").value).toBe(null);
      expect(getEvaluatedCell(model, "C2").value).toBe(null);
      expect(getEvaluatedCell(model, "C3").value).toBe(null);
    });

    test("spread result when add columns", async () => {
      await setCellContent(model, "C1", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "C1").value).toBe("#SPILL!");

      await addColumns(model, "after", "C", 1);
      expect(getEvaluatedCell(model, "C1").value).toBe("#SPILL!");

      await addColumns(model, "after", "D", 1);
      expect(getEvaluatedCell(model, "C1").value).toBe(42);
      expect(getEvaluatedCell(model, "E3").value).toBe(42);
    });

    test("spread result when add rows", async () => {
      await setCellContent(model, "A3", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "A3").value).toBe("#SPILL!");

      await addRows(model, "after", 2, 1);
      expect(getEvaluatedCell(model, "A3").value).toBe("#SPILL!");

      await addRows(model, "after", 3, 1);
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      expect(getEvaluatedCell(model, "C5").value).toBe(42);
    });

    test("do not spread result when delete columns", async () => {
      await setCellContent(model, "A1", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "A1").value).toBe(42);
      expect(getEvaluatedCell(model, "C3").value).toBe(42);

      await deleteColumns(model, ["B"]);
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "B1").value).toBe(null);
    });

    test("do not spread result when delete rows", async () => {
      await setCellContent(model, "A1", "=MFILL(3,3, 42)");
      expect(getEvaluatedCell(model, "A1").value).toBe(42);
      expect(getEvaluatedCell(model, "C3").value).toBe(42);

      await deleteRows(model, [2]);
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "A2").value).toBe(null);
    });
  });

  describe("a formula that refers to a result array must always have the same result", () => {
    const ref = "=C3";
    const formula = "=MFILL(3,3,42)";
    const result = 42;

    describe("regardless the position of the result array", () => {
      test("reference located at the top/left of the result array", async () => {
        await setCellContent(model, "A1", ref);
        await setCellContent(model, "B2", formula);
        expect(getEvaluatedCell(model, "A1").value).toBe(result);
      });

      test("reference located at the top/right of the result array", async () => {
        await setCellContent(model, "E1", ref);
        await setCellContent(model, "B2", formula);
        expect(getEvaluatedCell(model, "E1").value).toBe(result);
      });

      test("reference located at the bottom/left of the result array", async () => {
        await setCellContent(model, "A5", ref);
        await setCellContent(model, "B2", formula);
        expect(getEvaluatedCell(model, "A5").value).toBe(result);
      });

      test("reference located at the bottom/right of the result array", async () => {
        await setCellContent(model, "E5", ref);
        await setCellContent(model, "B2", formula);
        expect(getEvaluatedCell(model, "E5").value).toBe(result);
      });
    });

    describe("regardless the order we set the formulas", () => {
      test("reference located at the top/left of the result array, set the formula ref first", async () => {
        await setCellContent(model, "A1", ref);
        await setCellContent(model, "B2", formula);
        expect(getEvaluatedCell(model, "A1").value).toBe(result);
      });

      test("reference located at the top/left of the result array, set the result array first", async () => {
        await setCellContent(model, "B2", formula);
        await setCellContent(model, "A1", ref);
        expect(getEvaluatedCell(model, "A1").value).toBe(result);
      });

      test("reference located at the bottom/right of the result array, set the formula ref first", async () => {
        await setCellContent(model, "E5", ref);
        await setCellContent(model, "B2", formula);
        expect(getEvaluatedCell(model, "E5").value).toBe(result);
      });

      test("reference located at the bottom/right of the result array, set the result array first", async () => {
        await setCellContent(model, "B2", formula);
        await setCellContent(model, "E5", ref);
        expect(getEvaluatedCell(model, "E5").value).toBe(result);
      });
    });
  });

  describe("formula with spread dependencies", () => {
    test("formula with own spread dependencies have only one cycle", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,B1+1)");
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "A2").value).toBe(1);
      expect(getEvaluatedCell(model, "B1").value).toBe(1);
      expect(getEvaluatedCell(model, "B2").value).toBe(1);
    });

    test("formulas with cross spread dependencies depends on a cycle limit", async () => {
      const spy = jest.spyOn(console, "warn").mockImplementation(); // Avoid unwanted logs spam
      await setCellContent(model, "A1", "=MFILL(2,1,D1+1)");
      await setCellContent(model, "C1", "=MFILL(2,1,B1+1)");
      expect(getEvaluatedCell(model, "A1").value).toBe(31);
      expect(getEvaluatedCell(model, "B1").value).toBe(31);
      expect(getEvaluatedCell(model, "C1").value).toBe(30);
      expect(getEvaluatedCell(model, "D1").value).toBe(30);
      expect(spy).toHaveBeenCalledWith("Maximum iteration reached while evaluating cells");
    });

    test("Spreaded formulas with range deps Do not invalidate themselves on evaluation", async () => {
      let c = 0;
      addToRegistry(functionRegistry, "INCREMENTONEVAL", {
        description: "returns the input, but fancy. Like transpose(transpose(range))",
        args: [arg("range (any, range<any>)", "The matrix to be transposed.")],
        compute: function (values) {
          c++;
          return 5;
        },
        isExported: true,
      });
      await setCellContent(model, "A1", "0");
      await setCellContent(model, "A2", "1");
      await setCellContent(model, "A3", "2");
      await setCellContent(model, "A4", "3");
      await setCellContent(model, "A5", "=INCREMENTONEVAL(A2:A3)");
      expect(c).toEqual(1);
      await setCellContent(model, "A5", "=INCREMENTONEVAL(A1:A2)");
      expect(c).toEqual(2);
      await setCellContent(model, "A5", "=INCREMENTONEVAL(A1:B2)");
      expect(c).toEqual(3);
    });

    test("array formula depending on array formula result is evaluated once", async () => {
      const mockCompute = jest.fn().mockImplementation((values) => values);

      addToRegistry(functionRegistry, "RANGE_IDENTITY", {
        description: "returns the input. Like transpose(transpose(range))",
        args: [arg("range (range<any>)", "")],
        compute: mockCompute,
      });
      await createModel({
        sheets: [
          {
            cells: {
              A1: "0",
              A2: "1",
              B1: "=RANGE_IDENTITY(A1:A2)",
              C1: "=RANGE_IDENTITY(B1:B2)",
              D1: "=RANGE_IDENTITY(C1:C2)",
            },
          },
        ],
      });
      expect(mockCompute).toHaveBeenCalledTimes(3);
    });

    test("Formula depending on array formula is reevaluated when the array formula result changes", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=sumifs(E4:E7,H4:H7,1)");
      await setCellContent(model, "C4", "=MUNIT(4)");
      await setCellContent(model, "H4", "=C4");
      await setCellContent(model, "H6", "=E6");
      expect(getEvaluatedCell(model, "A1").value).toBe(1);

      // Force a reevaluation to avoid the incremental evaluation following each update_cell
      await evaluateCells(model);
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
    });

    test("Spreaded formulas with range deps invalidate only once the dependencies of themselves", async () => {
      let c = 0;
      addToRegistry(functionRegistry, "INCREMENTONEVAL", {
        description: "",
        args: [arg("range (any, range<any>)", "")],
        compute: function () {
          c++;
          return 5;
        },
        isExported: false,
      });
      await setCellContent(model, "A1", "0");
      await setCellContent(model, "A2", "1");
      await setCellContent(model, "A5", "=TRANSPOSE(A1:A2)");
      await setCellContent(model, "B1", "=INCREMENTONEVAL(A5)"); // depends on array formula (main cell)
      expect(c).toEqual(1);
      await setCellContent(model, "A2", "2");
      expect(c).toEqual(2);
    });

    test("Spreaded formulas with range deps invalidate only once the dependencies of result", async () => {
      let c = 0;
      addToRegistry(functionRegistry, "INCREMENTONEVAL", {
        description: "",
        args: [arg("range (any, range<any>)", "")],
        compute: function () {
          c++;
          return 5;
        },
        isExported: false,
      });
      await setCellContent(model, "A1", "0");
      await setCellContent(model, "A2", "1");
      await setCellContent(model, "A5", "=TRANSPOSE(A1:A2)");
      await setCellContent(model, "B1", "=INCREMENTONEVAL(B5)"); // depends on array formula (not the main cell)
      expect(c).toEqual(1);
      await setCellContent(model, "A2", "2");
      expect(c).toEqual(2);
    });

    test("Cells that no longer depend on the array formula are removed from the spreading dependencies", async () => {
      await setCellContent(model, "A1", "=TRANSPOSE(A3:A4)");
      await setCellContent(model, "A3", "3");
      await setCellContent(model, "A4", "4");
      expect(getEvaluatedCell(model, "B1").value).toEqual(4);
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getCorrespondingFormulaCell({ sheetId, ...toCartesian("B1") })).toBe(
        model.getters.getCorrespondingFormulaCell({ sheetId, ...toCartesian("A1") })
      );
      await setCellContent(model, "A1", "=TRANSPOSE(A3)");
      expect(
        model.getters.getCorrespondingFormulaCell({ sheetId, ...toCartesian("B1") })
      ).toBeUndefined();
    });

    test("have collision when spread size zone change", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "B1", "=MFILL(1,A1+1,42)");
      await setCellContent(model, "A3", "=TRANSPOSE(B1:B2)");

      expect(getEvaluatedCell(model, "B1").value).toBe(42);
      expect(getEvaluatedCell(model, "B2").value).toBe(42);

      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      expect(getEvaluatedCell(model, "B3").value).toBe(42);

      await setCellContent(model, "A1", "2");

      expect(getEvaluatedCell(model, "B1").value).toBe(42);
      expect(getEvaluatedCell(model, "B2").value).toBe(42);
      expect(getEvaluatedCell(model, "B3").value).toBe(42);

      expect(getEvaluatedCell(model, "A3").value).toBe("#SPILL!");
    });

    test("recompute when spread if filled by a formula", async () => {
      await setCellContent(model, "A1", "=MFILL(1,2,42)");
      expect(getEvaluatedCell(model, "A1").value).toBe(42);
      expect(getEvaluatedCell(model, "A2").value).toBe(42);
      await setCellContent(model, "A2", "=MFILL(1,2,421)");
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "A2").value).toBe(421);
      expect(getEvaluatedCell(model, "A3").value).toBe(421);
    });

    test("recompute cell depending on spread values computed in between", async () => {
      const model = await createModel({
        sheets: [
          {
            name: "sheet1",
            cells: { A1: "=sheet2!A4" },
          },
          {
            name: "sheet2",
            cells: {
              A1: "=MFILL(1,3,42)",
              A4: "=MEDIAN(A2:A3)", // depends only on spread values (not on sheet2!A1)
            },
          },
        ],
      });
      // initially, cells are evaluated in this order: [sheet1!A1, sheet2!A1, sheet2!A4]
      expect(getEvaluatedCell(model, "A1").value).toBe(42);
    });

    test("array formula evaluated first invalidated by other", async () => {
      const model = await createModel({
        sheets: [
          {
            cells: {
              A1: "=B2:B3", // evaluated first
              B1: "=C1:C3", // invalidates A1
              C1: "1",
              C2: "2",
              C3: "3",
            },
          },
        ],
      });
      expect(getEvaluatedCell(model, "A1").value).toBe(2);
      expect(getEvaluatedCell(model, "A2").value).toBe(3);
      expect(getEvaluatedCell(model, "B1").value).toBe(1);
      expect(getEvaluatedCell(model, "B2").value).toBe(2);
      expect(getEvaluatedCell(model, "B3").value).toBe(3);
    });
  });

  describe("result array can collides with other result array", () => {
    test("throw error on the formula when collide", async () => {
      const formula = "=MFILL(2,2,42)";
      await setCellContent(model, "B1", formula);
      await setCellContent(model, "A2", formula);
      expect(getEvaluatedCell(model, "B1").value).toBe(42);
      expect(getEvaluatedCell(model, "A2").value).toBe("#SPILL!");
      expect(getCellError(model, "A2")).toBe(
        "Array result was not expanded because it would overwrite data in B2."
      );
    });

    test("throw error message concerning the first cell encountered vertically", async () => {
      await setCellContent(model, "A2", "=MFILL(2,2,42)");
      await setCellContent(model, "B1", "=MFILL(1,3,42)");
      expect(getEvaluatedCell(model, "B1").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "A2").value).toBe(42);
      expect(getCellError(model, "B1")).toBe(
        "Array result was not expanded because it would overwrite data in B2."
      );
    });

    test("throw error message concerning the first cell encountered horizontally", async () => {
      await setCellContent(model, "A2", "=MFILL(3,1,42)");
      await setCellContent(model, "B1", "=MFILL(2,2,42)");
      expect(getEvaluatedCell(model, "B1").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "A2").value).toBe(42);
      expect(getCellError(model, "B1")).toBe(
        "Array result was not expanded because it would overwrite data in B2."
      );
    });

    test("do not spread result when collide", async () => {
      const formula = "=MFILL(2,2,42)";
      await setCellContent(model, "B1", formula);
      await setCellContent(model, "A2", formula);
      expect(getEvaluatedCell(model, "B1").value).toBe(42);
      expect(getEvaluatedCell(model, "B2").value).toBe(42);
      expect(getEvaluatedCell(model, "A2").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "A3").value).toBe(null);
      expect(getEvaluatedCell(model, "B3").value).toBe(null);
    });

    test("spread result when remove collision", async () => {
      await setCellContent(model, "B1", "=MFILL(2,2,24)");
      await setCellContent(model, "A2", "=MFILL(2,2,42)");
      expect(getEvaluatedCell(model, "B1").value).toBe(24);
      expect(getEvaluatedCell(model, "B2").value).toBe(24);
      expect(getEvaluatedCell(model, "A2").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "A3").value).toBe(null);
      expect(getEvaluatedCell(model, "B3").value).toBe(null);
      await setCellContent(model, "B1", "");
      expect(getEvaluatedCell(model, "B1").value).toBe(null);
      expect(getEvaluatedCell(model, "A2").value).toBe(42);
      expect(getEvaluatedCell(model, "A3").value).toBe(42);
      expect(getEvaluatedCell(model, "B2").value).toBe(42);
      expect(getEvaluatedCell(model, "B3").value).toBe(42);
    });

    describe("collision tests on several limit positions", () => {
      const result = 42;
      const formula = "=MFILL(2,2,42)";

      test("covering formula located on the covered formula columns", async () => {
        await setCellContent(model, "B4", formula);
        await setCellContent(model, "C3", formula);
        expect(getEvaluatedCell(model, "B4").value).toBe(result);
        expect(getEvaluatedCell(model, "C3").value).toBe("#SPILL!");
      });

      test("covering formula located on the covered formula rows", async () => {
        await setCellContent(model, "C3", formula);
        await setCellContent(model, "D2", formula);
        expect(getEvaluatedCell(model, "C3").value).toBe(result);
        expect(getEvaluatedCell(model, "D2").value).toBe("#SPILL!");
      });

      test("covering formula located before the covered formula columns", async () => {
        await setCellContent(model, "A4", formula);
        await setCellContent(model, "C3", formula);
        expect(getEvaluatedCell(model, "A4").value).toBe(result);
        expect(getEvaluatedCell(model, "C3").value).toBe(result);
      });

      test("covering formula located before the covered formula rows", async () => {
        await setCellContent(model, "C3", formula);
        await setCellContent(model, "D1", formula);
        expect(getEvaluatedCell(model, "D1").value).toBe(result);
        expect(getEvaluatedCell(model, "C3").value).toBe(result);
      });

      test("covering formula located after the covered formula columns", async () => {
        await setCellContent(model, "C3", formula);
        await setCellContent(model, "E4", formula);
        expect(getEvaluatedCell(model, "E4").value).toBe(result);
        expect(getEvaluatedCell(model, "C3").value).toBe(result);
      });

      test("covering formula located after the covered formula rows", async () => {
        await setCellContent(model, "C3", formula);
        await setCellContent(model, "D5", formula);
        expect(getEvaluatedCell(model, "D5").value).toBe(result);
        expect(getEvaluatedCell(model, "C3").value).toBe(result);
      });
    });

    describe("throw error according to the order we set the formula", () => {
      const result = 42;
      const formula = "=MFILL(2,2,42)";
      test("order 1: set A2, set B1 --> error on B1", async () => {
        await setCellContent(model, "A2", formula);
        await setCellContent(model, "B1", formula);
        expect(getEvaluatedCell(model, "A2").value).toBe(result);
        expect(getEvaluatedCell(model, "B1").value).toBe("#SPILL!");
      });

      test("order 2: set B1, set A2 --> error on A2", async () => {
        await setCellContent(model, "B1", formula);
        await setCellContent(model, "A2", formula);
        expect(getEvaluatedCell(model, "A2").value).toBe("#SPILL!");
        expect(getEvaluatedCell(model, "B1").value).toBe(result);
      });
    });

    describe("throw error regardless the order we get the result", () => {
      const result = 42;
      const formula = "=MFILL(2,2,42)";
      test("order 1: get A2, get B1", async () => {
        await setCellContent(model, "A2", formula);
        await setCellContent(model, "B1", formula);
        expect(getEvaluatedCell(model, "A2").value).toBe(result);
        expect(getEvaluatedCell(model, "B1").value).toBe("#SPILL!");
      });

      test("order 2: get B1, get A2", async () => {
        await setCellContent(model, "A2", formula);
        await setCellContent(model, "B1", formula);
        expect(getEvaluatedCell(model, "B1").value).toBe("#SPILL!");
        expect(getEvaluatedCell(model, "A2").value).toBe(result);
      });
    });
  });

  describe("Spread formula getters", () => {
    test("getArrayFormulaSpreadingOn works on the root of an array formula", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      expect(model.getters.getArrayFormulaSpreadingOn({ sheetId, col: 0, row: 0 })).toEqual({
        sheetId,
        col: 0,
        row: 0,
      });
    });

    test("getSpreadZone getter returns the cells the formula spread on, as well as the cell the formula is on", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.getSpreadZone({ sheetId, col: 0, row: 0 })).toEqual(toZone("A1:B2"));
    });

    test("getSpreadZone does only return self if the formula could not spread", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      await setCellContent(model, "A2", "(ツ)_/¯");
      expect(model.getters.getSpreadZone({ sheetId, col: 0, row: 0 })).toEqual(toZone("A1"));
    });

    test("getSpreadZone is correct after the evaluation changed so the formula can spread again", async () => {
      await setCellContent(model, "H1", "5");
      await setCellContent(model, "A1", "=MFILL(H1,H1,42)");

      expect(model.getters.getSpreadZone({ sheetId, col: 0, row: 0 })).toEqual(toZone("A1:E5"));

      await setCellContent(model, "A4", "Block spread");
      expect(model.getters.getSpreadZone({ sheetId, col: 0, row: 0 })).toEqual(toZone("A1"));

      await setCellContent(model, "H1", "2");
      expect(model.getters.getSpreadZone({ sheetId, col: 0, row: 0 })).toEqual(toZone("A1:B2"));
    });

    test("getSpreadZone is updated after changing the cell content to a scalar value", async () => {
      await setCellContent(model, "A1", "=MFILL(2,2,42)");
      expect(model.getters.getSpreadZone({ sheetId, col: 0, row: 0 })).toEqual(toZone("A1:B2"));
      await setCellContent(model, "A1", "5");
      expect(model.getters.getSpreadZone({ sheetId, col: 0, row: 0 })).not.toBeDefined();
    });
  });

  describe("result array can collides with merged cells", () => {
    test("do not spread result upon collision", async () => {
      await setCellContent(model, "A1", "=MFILL(2, 2, 42)");
      await merge(model, "A2:A3");
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");
      expect(getEvaluatedCell(model, "A2").value).toBe(null);
      expect(getEvaluatedCell(model, "B1").value).toBe(null);
      expect(getEvaluatedCell(model, "B2").value).toBe(null);
    });

    test("spread result upon collision removal", async () => {
      await setCellContent(model, "A1", "=MFILL(2, 2, 42)");
      await merge(model, "A2:A3");
      expect(getEvaluatedCell(model, "A1").value).toBe("#SPILL!");

      await unMerge(model, "A2:A3");
      expect(getEvaluatedCell(model, "A1").value).toBe(42);
      expect(getEvaluatedCell(model, "A2").value).toBe(42);
      expect(getEvaluatedCell(model, "B1").value).toBe(42);
      expect(getEvaluatedCell(model, "B2").value).toBe(42);
    });

    test("correctly checks for merges in the specified zone", async () => {
      await setCellContent(model, "A1", "=MFILL(1, 2, 42)");
      await merge(model, "B1:B2");

      expect(getEvaluatedCell(model, "A1").value).toBe(42);
      expect(getEvaluatedCell(model, "A2").value).toBe(42);

      await setCellContent(model, "F6", "=MFILL(2, 1, 42)");
      await merge(model, "F7:G7");

      expect(getEvaluatedCell(model, "F6").value).toBe(42);
      expect(getEvaluatedCell(model, "G6").value).toBe(42);
    });
  });

  describe("evaluate literals array", () => {
    test("literal array with one row only", async () => {
      await setCellContent(model, "A1", "={1,2,3}");
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "B1").value).toBe(2);
      expect(getEvaluatedCell(model, "C1").value).toBe(3);
    });

    test("literal array with one column only", async () => {
      await setCellContent(model, "A1", "={1;2;3}");
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "A2").value).toBe(2);
      expect(getEvaluatedCell(model, "A3").value).toBe(3);
    });

    test("literal array as table", async () => {
      await setCellContent(model, "A1", "={1,2;3,4}");
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "B1").value).toBe(2);
      expect(getEvaluatedCell(model, "A2").value).toBe(3);
      expect(getEvaluatedCell(model, "B2").value).toBe(4);
    });

    test("literal array no matter argument type", async () => {
      await setCellContent(model, "A1", `={1,"test";TRUE,"42"}`);
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "B1").value).toBe("test");
      expect(getEvaluatedCell(model, "A2").value).toBe(true);
      expect(getEvaluatedCell(model, "B2").value).toBe("42");
    });

    test("literal array with formula", async () => {
      await setCellContent(model, "A1", `={1,2,SUM(1,2)}`);
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "B1").value).toBe(2);
      expect(getEvaluatedCell(model, "C1").value).toBe(3);
    });

    test("literal array with array formula", async () => {
      await setCellContent(model, "A1", `={"1","2";SPLIT("3,4",",")}`);
      expect(getEvaluatedCell(model, "A1").value).toBe("1");
      expect(getEvaluatedCell(model, "B1").value).toBe("2");
      expect(getEvaluatedCell(model, "A2").value).toBe("3");
      expect(getEvaluatedCell(model, "B2").value).toBe("4");
    });

    test("literal array with literal array", async () => {
      await setCellContent(model, "A1", `={{1,2;3,4},{"A","B";"C","D"}}`);
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "B1").value).toBe(2);
      expect(getEvaluatedCell(model, "C1").value).toBe("A");
      expect(getEvaluatedCell(model, "D1").value).toBe("B");
      expect(getEvaluatedCell(model, "A2").value).toBe(3);
      expect(getEvaluatedCell(model, "B2").value).toBe(4);
      expect(getEvaluatedCell(model, "C2").value).toBe("C");
      expect(getEvaluatedCell(model, "D2").value).toBe("D");

      await setCellContent(model, "A1", `={{1,2;3,4};{"A","B";"C","D"}}`);
      expect(getEvaluatedCell(model, "A1").value).toBe(1);
      expect(getEvaluatedCell(model, "B1").value).toBe(2);
      expect(getEvaluatedCell(model, "A2").value).toBe(3);
      expect(getEvaluatedCell(model, "B2").value).toBe(4);
      expect(getEvaluatedCell(model, "A3").value).toBe("A");
      expect(getEvaluatedCell(model, "B3").value).toBe("B");
      expect(getEvaluatedCell(model, "A4").value).toBe("C");
      expect(getEvaluatedCell(model, "B4").value).toBe("D");
    });

    test("literal array can only combine row argument with same number of columns", async () => {
      await setCellContent(model, "A1", `={"A","B";"C","D","E"}`);
      expect(getEvaluatedCell(model, "A1").value).toBe("#ERROR");
      expect(getCellError(model, "A1")).toBe(
        "All ranges in ARRAY.LITERAL must have the same number of columns (got 2, 3)."
      );
    });

    test("literal array can only combine column argument with same number of rows", async () => {
      await setCellContent(model, "A1", `={{"A";"B"},{"C";"D";"E"}}`);
      expect(getEvaluatedCell(model, "A1").value).toBe("#ERROR");
      expect(getCellError(model, "A1")).toBe(
        "All ranges in ARRAY.ROW must have the same number of columns (got 2, 3)."
      );
    });

    test("literal array as argument", async () => {
      await setCellContent(model, "A1", "=SUM({1,2,3})");
      await setCellContent(model, "A2", "=INDEX({1,2;3,4},2,1)");
      expect(getEvaluatedCell(model, "A1").value).toBe(6);
      expect(getEvaluatedCell(model, "A2").value).toBe(3);
    });
  });
});
