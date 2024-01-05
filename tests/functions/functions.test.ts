import { Model } from "../../src";
import { toScalar } from "../../src/functions/helper_matrices";
import { isEvaluationError, toBoolean, toNumber } from "../../src/functions/helpers";
import { arg, functionRegistry } from "../../src/functions/index";
import { Arg, DEFAULT_LOCALE } from "../../src/types";
import { CellErrorType, EvaluationError } from "../../src/types/errors";
import { setCellContent, setCellFormat } from "../test_helpers/commands_helpers";
import { getCellError, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { evaluateCell, restoreDefaultFunctions } from "../test_helpers/helpers";

describe("functions", () => {
  afterAll(() => {
    restoreDefaultFunctions();
  });
  test("can add a function", () => {
    const val = evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" });
    expect(val).toBe("#NAME?");
    functionRegistry.add("DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: function (arg) {
        return 2 * toNumber(toScalar(arg), DEFAULT_LOCALE);
      },
      args: [arg("number (number)", "my number")],
      returns: ["NUMBER"],
    });
    expect(evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" })).toBe(6);
  });

  test("can not add a function with invalid name", () => {
    const createBadFunction = () => {
      functionRegistry.add("TEST*FUNCTION", {
        description: "Double the first argument",
        compute: () => 0,
        args: [],
        returns: ["NUMBER"],
      });
    };
    expect(createBadFunction).toThrow(
      "Invalid function name TEST*FUNCTION. Function names can exclusively contain alphanumerical values separated by dots (.)"
    );
  });

  test("can add a function with underscore", () => {
    const createBadFunction = () => {
      functionRegistry.add("TEST_FUNCTION", {
        description: "Double the first argument",
        compute: () => 0,
        args: [],
        returns: ["NUMBER"],
      });
    };
    expect(createBadFunction).not.toThrow();
  });

  test("Function can return value depending on input values", () => {
    const model = new Model();
    functionRegistry.add("RETURN.VALUE.DEPENDING.ON.INPUT.VALUE", {
      description: "return value depending on input value",
      compute: function (arg) {
        return toNumber(toScalar(arg), DEFAULT_LOCALE) * 2;
      },
      args: [arg("number (number)", "blabla")],
      returns: ["NUMBER"],
    });
    setCellContent(model, "A1", "21");
    setCellContent(model, "A2", "42");
    setCellContent(model, "B1", "=RETURN.VALUE.DEPENDING.ON.INPUT.VALUE(A1)");
    setCellContent(model, "B2", "=RETURN.VALUE.DEPENDING.ON.INPUT.VALUE(A2)");
    expect(getEvaluatedCell(model, "B1").value).toBe(42);
    expect(getEvaluatedCell(model, "B2").value).toBe(84);
  });

  test("Function can return value depending on input error", () => {
    const model = new Model();
    functionRegistry.add("RETURN.VALUE.DEPENDING.ON.INPUT.ERROR", {
      description: "return value depending on input error",
      compute: function (arg: Arg) {
        return isEvaluationError(toScalar(arg)?.value) ? true : false;
      },
      args: [arg("arg (any)", "blabla")],
      returns: ["BOOLEAN"],
    });
    setCellContent(model, "A1", "=SQRT(-1)");
    setCellContent(model, "B1", "=RETURN.VALUE.DEPENDING.ON.INPUT.ERROR(A1)");
    setCellContent(model, "B2", "=RETURN.VALUE.DEPENDING.ON.INPUT.ERROR(A2)");
    expect(getEvaluatedCell(model, "B1").value).toBe(true);
    expect(getEvaluatedCell(model, "B2").value).toBe(false);
  });

  test("Function can return error depending on input value", () => {
    const model = new Model();
    functionRegistry.add("RETURN.ERROR.DEPENDING.ON.INPUT.VALUE", {
      description: "return value depending on input error",
      compute: function (arg) {
        const error = new EvaluationError("Les calculs sont pas bons KEVIN !");
        return toBoolean(toScalar(arg)) ? error : "ceci n'est pas une erreur";
      },
      args: [arg("arg (any)", "blabla")],
      returns: ["ANY"],
    });
    setCellContent(model, "B1", "=RETURN.ERROR.DEPENDING.ON.INPUT.VALUE(true)");
    setCellContent(model, "B2", "=RETURN.ERROR.DEPENDING.ON.INPUT.VALUE(false)");
    expect(getEvaluatedCell(model, "B1")?.value).toBe("#ERROR");
    expect(getCellError(model, "B1")).toBe("Les calculs sont pas bons KEVIN !");
    expect(getEvaluatedCell(model, "B2").value).toBe("ceci n'est pas une erreur");
  });

  test("Function can return error depending on input error", () => {
    const model = new Model();
    functionRegistry.add("RETURN.ERROR.DEPENDING.ON.INPUT.ERROR", {
      description: "return value depending on input error",
      compute: function (arg) {
        return toScalar(arg)?.value === CellErrorType.BadExpression
          ? CellErrorType.CircularDependency
          : CellErrorType.InvalidReference;
      },
      args: [arg("arg (any)", "blabla")],
      returns: ["ANY"],
    });
    setCellContent(model, "A1", "=ThatDoesNotMeanAnything");
    setCellContent(model, "B1", "=RETURN.ERROR.DEPENDING.ON.INPUT.ERROR(A1)");
    setCellContent(model, "B2", "=RETURN.ERROR.DEPENDING.ON.INPUT.ERROR(SQRT(-1))");
    expect(getEvaluatedCell(model, "B1").value).toBe("#CYCLE");
    expect(getEvaluatedCell(model, "B2").value).toBe("#REF");
  });

  test("Function can return format depending on input format", () => {
    const model = new Model();
    functionRegistry.add("RETURN.FORMAT.DEPENDING.ON.INPUT.FORMAT", {
      description: "return format depending on input format",
      compute: function (arg) {
        return { value: 42, format: toScalar(arg)?.format };
      },
      args: [arg("number (number)", "blabla")],
      returns: ["NUMBER"],
    });
    setCellContent(model, "A1", "42");
    setCellFormat(model, "A1", "0%");
    setCellContent(model, "A2", "42");
    setCellFormat(model, "A2", "#,##0.00");
    setCellContent(model, "B1", "=RETURN.FORMAT.DEPENDING.ON.INPUT.FORMAT(A1)");
    setCellContent(model, "B2", "=RETURN.FORMAT.DEPENDING.ON.INPUT.FORMAT(A2)");
    expect(getEvaluatedCell(model, "B1").format).toBe("0%");
    expect(getEvaluatedCell(model, "B2").format).toBe("#,##0.00");
  });

  test("Function can return format depending on input value", () => {
    const model = new Model();
    functionRegistry.add("RETURN.FORMAT.DEPENDING.ON.INPUT.VALUE", {
      description: "return format depending on input value",
      compute: function (arg) {
        const value = toNumber(toScalar(arg), DEFAULT_LOCALE);
        return {
          value,
          format: value >= 0 ? "0%" : "#,##0.00",
        };
      },
      args: [arg("number (number)", "blabla")],
      returns: ["NUMBER"],
    });
    setCellContent(model, "A1", "42");
    setCellContent(model, "A2", "-42");
    setCellContent(model, "B1", "=RETURN.FORMAT.DEPENDING.ON.INPUT.VALUE(A1)");
    setCellContent(model, "B2", "=RETURN.FORMAT.DEPENDING.ON.INPUT.VALUE(A2)");
    expect(getEvaluatedCell(model, "B1").format).toBe("0%");
    expect(getEvaluatedCell(model, "B2").format).toBe("#,##0.00");
  });

  test("Can use a custom evaluation context in a function", () => {
    const model = new Model(
      {},
      {
        custom: {
          coucou: "Raoul",
        },
      }
    );
    functionRegistry.add("GETCOUCOU", {
      description: "Get coucou's name",
      compute: function () {
        return (this as any).coucou;
      },
      args: [],
      returns: ["STRING"],
    });
    setCellContent(model, "A1", "=GETCOUCOU()");
    expect(getEvaluatedCell(model, "A1").value).toBe("Raoul");
  });

  test("Can use a getter in a function", () => {
    const model = new Model();
    functionRegistry.add("GETNUMBERCOLS", {
      description: "Get the number of columns",
      compute: function () {
        const sheetId = (this as any).getters.getActiveSheetId();
        return (this as any).getters.getNumberCols(sheetId);
      },
      args: [],
      returns: ["STRING"],
    });
    expect(evaluateCell("A1", { A1: "=GETNUMBERCOLS()" })).toBe(
      model.getters.getNumberCols(model.getters.getActiveSheetId())
    );
  });

  test("undefined fallback to the zero value in a function", () => {
    functionRegistry.add("UNDEFINED", {
      description: "undefined",
      // @ts-expect-error can happen in a vanilla javascript code base
      compute: function () {
        return undefined;
      },
      args: [],
      returns: ["STRING"],
    });
    expect(evaluateCell("A1", { A1: "=UNDEFINED()" })).toBe(0);
  });
});
