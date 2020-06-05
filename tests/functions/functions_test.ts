import { functionRegistry, args } from "../../src/functions/index";
import { evaluateCell, getCell } from "../helpers";
import { Model } from "../../src";

describe("addFunction", () => {
  test("can add a function", () => {
    const val = evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" });
    expect(val).toBe("#BAD_EXPR");
    functionRegistry.add("DOUBLEDOUBLE", {
      description: "Double the first argument",
      compute: (arg: number) => (2 * arg) as any,
      args: args`number (number) my number`,
      returns: ["NUMBER"],
    });
    expect(evaluateCell("A1", { A1: "=DOUBLEDOUBLE(3)" })).toBe(6);
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
      args: args``,
      returns: ["STRING"],
    });
    model.dispatch("SET_VALUE", { xc: "A1", text: "=GETCOUCOU()" });
    expect(getCell(model, "A1")!.value).toBe("Raoul");
  });
});
