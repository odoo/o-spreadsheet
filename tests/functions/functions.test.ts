import { Model } from "../../src";
import { args, functionRegistry } from "../../src/functions/index";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCell } from "../test_helpers/getters_helpers";
import { evaluateCell } from "../test_helpers/helpers";

describe("addFunction", () => {
  test("can add a function", () => {
    const val = evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" });
    expect(val).toBe("#BAD_EXPR");
    functionRegistry.add("DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: (arg: number) => (2 * arg) as any,
      args: args(`number (number) my number`),
      returns: ["NUMBER"],
    });
    expect(evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" })).toBe(6);
  });

  test("can not add a function with invalid name", () => {
    const createBadFunction = () => {
      functionRegistry.add("TEST_FUNCTION", {
        description: "Double the first argument",
        compute: () => 0,
        args: [],
        returns: ["NUMBER"],
      });
    };
    expect(createBadFunction).toThrow(
      "Invalid function name TEST_FUNCTION. Function names can exclusively contain alphanumerical values separated by dots (.)"
    );
  });

  test("Can use a custom evaluation context in a function", () => {
    const model = new Model(
      {},
      {
        evalContext: {
          coucou: "Raoul",
        },
      }
    );
    functionRegistry.add("GETCOUCOU", {
      description: "Get coucou's name",
      compute: function () {
        return (this as any).coucou;
      },
      args: args(``),
      returns: ["STRING"],
    });
    setCellContent(model, "A1", "=GETCOUCOU()");
    expect(getCell(model, "A1")!.evaluated.value).toBe("Raoul");
  });

  test("Can use a getter in a function", () => {
    const model = new Model();
    functionRegistry.add("GETNUMBERCOLS", {
      description: "Get the number of columns",
      compute: function () {
        const sheetId = (this as any).getters.getActiveSheetId();
        return (this as any).getters.getNumberCols(sheetId);
      },
      args: args(``),
      returns: ["STRING"],
    });
    expect(evaluateCell("A1", { A1: "=GETNUMBERCOLS()" })).toBe(
      model.getters.getNumberCols(model.getters.getActiveSheetId())
    );
  });
});
