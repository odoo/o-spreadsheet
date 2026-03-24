import { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { toScalar } from "@odoo/o-spreadsheet-engine/functions/helper_matrices";
import {
  isEvaluationError,
  toBoolean,
  toNumber,
} from "@odoo/o-spreadsheet-engine/functions/helpers";
import { Arg, CellErrorType, DEFAULT_LOCALE, EvaluationError } from "../../src/types";
import { setCellContent, setCellFormat } from "../test_helpers/commands_helpers";
import { getCellError, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { addToRegistry, createModel, evaluateCell } from "../test_helpers/helpers";
describe("functions", () => {
  test("can add a function", async () => {
    const val = await evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" });
    expect(val).toBe("#NAME?");
    addToRegistry(functionRegistry, "DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: function (arg) {
        return 2 * toNumber(toScalar(arg), DEFAULT_LOCALE);
      },
      args: [arg("number (number)", "my number")],
    });
    expect(await evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" })).toBe(6);
  });
  test("can not add a function with invalid name", () => {
    const createBadFunction = () => {
      addToRegistry(functionRegistry, "TEST*FUNCTION", {
        description: "Double the first argument",
        compute: () => 0,
        args: [],
      });
    };
    expect(createBadFunction).toThrow(
      "Invalid function name TEST*FUNCTION. Function names can exclusively contain alphanumerical values separated by dots (.)"
    );
  });
  test("can add a function with underscore", () => {
    const createBadFunction = () => {
      addToRegistry(functionRegistry, "TEST_FUNCTION", {
        description: "Double the first argument",
        compute: () => 0,
        args: [],
      });
    };
    expect(createBadFunction).not.toThrow();
  });
  test("Function can return value depending on input values", async () => {
    const model = await createModel();
    addToRegistry(functionRegistry, "RETURN.VALUE.DEPENDING.ON.INPUT.VALUE", {
      description: "return value depending on input value",
      compute: function (arg) {
        return toNumber(toScalar(arg), DEFAULT_LOCALE) * 2;
      },
      args: [arg("number (number)", "blabla")],
    });
    await setCellContent(model, "A1", "21");
    await setCellContent(model, "A2", "42");
    await setCellContent(model, "B1", "=RETURN.VALUE.DEPENDING.ON.INPUT.VALUE(A1)");
    await setCellContent(model, "B2", "=RETURN.VALUE.DEPENDING.ON.INPUT.VALUE(A2)");
    expect(getEvaluatedCell(model, "B1").value).toBe(42);
    expect(getEvaluatedCell(model, "B2").value).toBe(84);
  });
  test("Function can return value depending on input error", async () => {
    const model = await createModel();
    addToRegistry(functionRegistry, "RETURN.VALUE.DEPENDING.ON.INPUT.ERROR", {
      description: "return value depending on input error",
      compute: function (arg: Arg) {
        return isEvaluationError(toScalar(arg)?.value);
      },
      args: [arg("arg (any)", "blabla")],
    });
    await setCellContent(model, "A1", "=SQRT(-1)");
    await setCellContent(model, "B1", "=RETURN.VALUE.DEPENDING.ON.INPUT.ERROR(A1)");
    await setCellContent(model, "B2", "=RETURN.VALUE.DEPENDING.ON.INPUT.ERROR(A2)");
    expect(getEvaluatedCell(model, "B1").value).toBe(true);
    expect(getEvaluatedCell(model, "B2").value).toBe(false);
  });
  test("Function can return error depending on input value", async () => {
    const model = await createModel();
    addToRegistry(functionRegistry, "RETURN.ERROR.DEPENDING.ON.INPUT.VALUE", {
      description: "return value depending on input error",
      compute: function (arg) {
        const error = new EvaluationError("Les calculs sont pas bons KEVIN !");
        return toBoolean(toScalar(arg)) ? error : "ceci n'est pas une erreur";
      },
      args: [arg("arg (any)", "blabla")],
    });
    await setCellContent(model, "B1", "=RETURN.ERROR.DEPENDING.ON.INPUT.VALUE(true)");
    await setCellContent(model, "B2", "=RETURN.ERROR.DEPENDING.ON.INPUT.VALUE(false)");
    expect(getEvaluatedCell(model, "B1")?.value).toBe("#ERROR");
    expect(getCellError(model, "B1")).toBe("Les calculs sont pas bons KEVIN !");
    expect(getEvaluatedCell(model, "B2").value).toBe("ceci n'est pas une erreur");
  });
  test("Function can return error depending on input error", async () => {
    const model = await createModel();
    addToRegistry(functionRegistry, "RETURN.ERROR.DEPENDING.ON.INPUT.ERROR", {
      description: "return value depending on input error",
      compute: function (arg) {
        return toScalar(arg)?.value === CellErrorType.BadExpression
          ? CellErrorType.CircularDependency
          : CellErrorType.InvalidReference;
      },
      args: [arg("arg (any)", "blabla")],
    });
    await setCellContent(model, "A1", "=ThatDoesNotMeanAnything");
    await setCellContent(model, "B1", "=RETURN.ERROR.DEPENDING.ON.INPUT.ERROR(A1)");
    await setCellContent(model, "B2", "=RETURN.ERROR.DEPENDING.ON.INPUT.ERROR(SQRT(-1))");
    expect(getEvaluatedCell(model, "B1").value).toBe("#CYCLE");
    expect(getEvaluatedCell(model, "B2").value).toBe("#REF");
  });
  test("Function can return format depending on input format", async () => {
    const model = await createModel();
    addToRegistry(functionRegistry, "RETURN.FORMAT.DEPENDING.ON.INPUT.FORMAT", {
      description: "return format depending on input format",
      compute: function (arg) {
        return { value: 42, format: toScalar(arg)?.format };
      },
      args: [arg("number (number)", "blabla")],
    });
    await setCellContent(model, "A1", "42");
    await setCellFormat(model, "A1", "0%");
    await setCellContent(model, "A2", "42");
    await setCellFormat(model, "A2", "#,##0.00");
    await setCellContent(model, "B1", "=RETURN.FORMAT.DEPENDING.ON.INPUT.FORMAT(A1)");
    await setCellContent(model, "B2", "=RETURN.FORMAT.DEPENDING.ON.INPUT.FORMAT(A2)");
    expect(getEvaluatedCell(model, "B1").format).toBe("0%");
    expect(getEvaluatedCell(model, "B2").format).toBe("#,##0.00");
  });
  test("Function can return format depending on input value", async () => {
    const model = await createModel();
    addToRegistry(functionRegistry, "RETURN.FORMAT.DEPENDING.ON.INPUT.VALUE", {
      description: "return format depending on input value",
      compute: function (arg) {
        const value = toNumber(toScalar(arg), DEFAULT_LOCALE);
        return {
          value,
          format: value >= 0 ? "0%" : "#,##0.00",
        };
      },
      args: [arg("number (number)", "blabla")],
    });
    await setCellContent(model, "A1", "42");
    await setCellContent(model, "A2", "-42");
    await setCellContent(model, "B1", "=RETURN.FORMAT.DEPENDING.ON.INPUT.VALUE(A1)");
    await setCellContent(model, "B2", "=RETURN.FORMAT.DEPENDING.ON.INPUT.VALUE(A2)");
    expect(getEvaluatedCell(model, "B1").format).toBe("0%");
    expect(getEvaluatedCell(model, "B2").format).toBe("#,##0.00");
  });
  test("Can use a custom evaluation context in a function", async () => {
    const model = await createModel(
      {},
      {
        custom: {
          coucou: "Raoul",
        },
      }
    );
    addToRegistry(functionRegistry, "GETCOUCOU", {
      description: "Get coucou's name",
      compute: function () {
        return (this as any).coucou;
      },
      args: [],
    });
    await setCellContent(model, "A1", "=GETCOUCOU()");
    expect(getEvaluatedCell(model, "A1").value).toBe("Raoul");
  });
  test("Can use a getter in a function", async () => {
    const model = await createModel();
    addToRegistry(functionRegistry, "GETNUMBERCOLS", {
      description: "Get the number of columns",
      compute: function () {
        const sheetId = (this as any).getters.getActiveSheetId();
        return (this as any).getters.getNumberCols(sheetId);
      },
      args: [],
    });
    expect(await evaluateCell("A1", { A1: "=GETNUMBERCOLS()" })).toBe(
      model.getters.getNumberCols(model.getters.getActiveSheetId())
    );
  });
  test("undefined fallback to the zero value in a function", async () => {
    addToRegistry(functionRegistry, "UNDEFINED", {
      description: "undefined",
      // @ts-expect-error can happen in a vanilla javascript code base
      compute: function () {
        return undefined;
      },
      args: [],
    });
    expect(await evaluateCell("A1", { A1: "=UNDEFINED()" })).toBe(0);
  });
  describe("check type of arguments", () => {
    test("reject non-range argument when expecting only range argument", async () => {
      addToRegistry(functionRegistry, "RANGEEXPECTED", {
        description: "function expect number in 1st arg",
        compute: (arg) => {
          return true;
        },
        args: [arg("arg1 (range<any>)", "1st argument")],
      });
      addToRegistry(functionRegistry, "FORMULA_RETURNING_RANGE", {
        description: "function returning range",
        compute: () => {
          return [["cucumber"]];
        },
        args: [],
      });
      addToRegistry(functionRegistry, "FORMULA_NOT_RETURNING_RANGE", {
        description: "function returning range",
        compute: () => {
          return "cucumber";
        },
        args: [],
      });
      addToRegistry(functionRegistry, "FORMULA_RETURNING_ERROR", {
        description: "function returning ERROR",
        compute: () => {
          return "#ERROR";
        },
        args: [],
      });
      addToRegistry(functionRegistry, "FORMULA_TROWING_ERROR", {
        description: "function trowing error",
        compute: () => {
          throw new EvaluationError("NOP");
        },
        args: [],
      });
      addToRegistry(functionRegistry, "FORMULA_RETURNING_RANGE_WITH_ERROR", {
        description: "function returning range",
        compute: () => {
          return [["#ERROR"]];
        },
        args: [],
      });
      addToRegistry(functionRegistry, "FORMULA_RETURNING_RANGE_TROWING_ERROR", {
        description: "function returning range",
        compute: () => {
          throw new EvaluationError("NOP");
        },
        args: [],
      });
      const m = await createModel();
      const errorMessage =
        "Function RANGEEXPECTED expects the parameter '1' to be reference to a cell or range.";
      await setCellContent(m, "A1", "=RANGEEXPECTED(42)");
      expect(getEvaluatedCell(m, "A1").value).toBe("#BAD_EXPR");
      expect(getCellError(m, "A1")).toBe(errorMessage);
      await setCellContent(m, "B1", '=RANGEEXPECTED("test")');
      expect(getEvaluatedCell(m, "B1").value).toBe("#BAD_EXPR");
      expect(getCellError(m, "B1")).toBe(errorMessage);
      await setCellContent(m, "C1", "=RANGEEXPECTED(TRUE)");
      expect(getEvaluatedCell(m, "C1").value).toBe("#BAD_EXPR");
      expect(getCellError(m, "C1")).toBe(errorMessage);
      await setCellContent(m, "D1", "=RANGEEXPECTED(FORMULA_NOT_RETURNING_RANGE())");
      expect(getEvaluatedCell(m, "D1").value).toBe("#BAD_EXPR");
      expect(getCellError(m, "D1")).toBe(errorMessage);
      await setCellContent(m, "E1", "=RANGEEXPECTED(A1)");
      expect(getEvaluatedCell(m, "E1").value).toBe(true);
      await setCellContent(m, "F1", "=RANGEEXPECTED(A1:A1)");
      expect(getEvaluatedCell(m, "F1").value).toBe(true);
      await setCellContent(m, "G1", "=RANGEEXPECTED(A1:A2)");
      expect(getEvaluatedCell(m, "G1").value).toBe(true);
      await setCellContent(m, "H1", "=RANGEEXPECTED(A1:A$2)");
      expect(getEvaluatedCell(m, "H1").value).toBe(true);
      await setCellContent(m, "I1", "=RANGEEXPECTED(sheet1!A1:A$2)");
      expect(getEvaluatedCell(m, "I1").value).toBe(true);
      await setCellContent(m, "J1", "=RANGEEXPECTED(FORMULA_RETURNING_RANGE())");
      expect(getEvaluatedCell(m, "J1").value).toBe(true);
      await setCellContent(m, "K1", "=RANGEEXPECTED(FORMULA_TROWING_ERROR())");
      expect(getEvaluatedCell(m, "K1").value).toBe("#BAD_EXPR");
      expect(getCellError(m, "K1")).toBe(errorMessage);
      await setCellContent(m, "L1", "=RANGEEXPECTED(FORMULA_RETURNING_RANGE_WITH_ERROR())");
      expect(getEvaluatedCell(m, "L1").value).toBe(true);
      await setCellContent(m, "M1", "=RANGEEXPECTED(FORMULA_RETURNING_RANGE_TROWING_ERROR())");
      expect(getEvaluatedCell(m, "M1").value).toBe("#BAD_EXPR");
      expect(getCellError(m, "M1")).toBe(errorMessage);
    });
    test("simple argument value from a single cell or range reference", async () => {
      const m = await createModel();
      addToRegistry(functionRegistry, "SIMPLE_VALUE_EXPECTED", {
        description: "does not accept a range",
        compute: (arg) => {
          return true;
        },
        args: [{ name: "arg1", description: "", type: ["NUMBER"] }],
      });
      await setCellContent(m, "B1", "=SIMPLE_VALUE_EXPECTED(A1)");
      expect(getEvaluatedCell(m, "B1").value).toBe(true);
      await setCellContent(m, "B2", "=SIMPLE_VALUE_EXPECTED(A1:A2)");
      expect(getEvaluatedCell(m, "B2").value).toBe(true);
      expect(getEvaluatedCell(m, "B3").value).toBe(true);
    });
  });
});
