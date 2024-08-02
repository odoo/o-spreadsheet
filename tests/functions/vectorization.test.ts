import { OPERATOR_MAP, UNARY_OPERATOR_MAP } from "../../src/formulas/compiler";
import { functionRegistry } from "../../src/functions";
import { toScalar } from "../../src/functions/helper_matrices";
import { toString } from "../../src/functions/helpers";
import { setCellContent } from "../test_helpers/commands_helpers";
import {
  checkFunctionDoesntSpreadBeyondRange,
  createModelFromGrid,
  getRangeValuesAsMatrix,
  restoreDefaultFunctions,
} from "../test_helpers/helpers";

describe("vectorization", () => {
  // prettier-ignore
  const grid = {
    A1: "A1", B1: "B1", C1: "C1",
    A2: "A2", B2: "B2", C2: "C2",
    A3: "A3", B3: "B3", C3: "C3",
  };

  beforeAll(() => {
    functionRegistry.add("FUNCTION.WITHOUT.RANGE.ARGS", {
      description: "a function with simple args",
      args: [
        { name: "arg1", description: "", type: ["ANY"] },
        { name: "arg2", description: "", type: ["ANY"] },
      ],
      compute: function (arg1, arg2) {
        return toString(toScalar(arg1)) + toString(toScalar(arg2));
      },
    });

    functionRegistry.add("FUNCTION.THAT.SPREADS", {
      description: "a function that spreads a matrix",
      args: [{ name: "arg1", description: "", type: ["ANY"] }],
      compute: function (arg1) {
        const value = toString(toScalar(arg1));
        return [
          [value, value],
          [value, value],
        ];
      },
    });
  });

  afterAll(() => {
    restoreDefaultFunctions();
  });
  test("scalar arg with vertical arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:D2")).toEqual([["A1B1"], ["A1B2"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();
  });

  test("scalar arg with horizontal arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1, B1:C1)");
    expect(getRangeValuesAsMatrix(model, "D1:E1")).toEqual([["A1B1", "A1C1"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E1")).toBeTruthy();
  });

  test("scalar arg with matrix arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1, B1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1B1", "A1C1"],
      ["A1B2", "A1C2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("vertical arg with vertical arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:A2, B1:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:D2")).toEqual([["A1B1"], ["A2B2"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:D2")).toBeTruthy();
  });

  test("vertical arg with horizontal arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:A2, B1:C1)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1B1", "A1C1"],
      ["A2B1", "A2C1"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("vertical arg with matrix arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:A2, B1:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1B1", "A1C1"],
      ["A2B2", "A2C2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("horizontal arg with horizontal arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:B1, A2:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:E1")).toEqual([["A1A2", "B1B2"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E1")).toBeTruthy();
  });

  test("horizontal arg with matrix arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:B1, A2:B3)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1A2", "B1B2"],
      ["A1A3", "B1B3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("matrix arg with matrix arg", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:B2, B2:C3)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1B2", "B1C2"],
      ["A2B3", "B2C3"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("vectorization display #N/A errors when vectors havent the same size", () => {
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:B1, A2:C2)");
    expect(getRangeValuesAsMatrix(model, "D1:F1")).toEqual([["A1A2", "B1B2", "#N/A"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:F1")).toBeTruthy();

    setCellContent(model, "D2", "=FUNCTION.WITHOUT.RANGE.ARGS(A1:A2, B1:B3)");
    expect(getRangeValuesAsMatrix(model, "D2:D4")).toEqual([["A1B1"], ["A2B2"], ["#N/A"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D2:D4")).toBeTruthy();
  });

  test("vectorization of array formula will only return the first value of the array", () => {
    // can change in the future with VECTORIZATION V2 ??
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", "=FUNCTION.THAT.SPREADS(A1)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", "A1"],
      ["A1", "A1"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();

    setCellContent(model, "D1", "=FUNCTION.THAT.SPREADS(A1:B2)");
    expect(getRangeValuesAsMatrix(model, "D1:E2")).toEqual([
      ["A1", "B1"],
      ["A2", "B2"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "D1:E2")).toBeTruthy();
  });

  test("function which throws an error during the evaluation of the position of one of its vectors, will apply the error to this position and continue the evaluation for each vector position", () => {
    // prettier-ignore
    const grid = {
      A1: "A1", B1: "B1",
      A2: "A2", B2: "#ERROR",
      A3: "A3", B3: "B3",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "D1", '=FUNCTION.WITHOUT.RANGE.ARGS("this is ", B1:B3)');
    expect(getRangeValuesAsMatrix(model, "D1:D3")).toEqual([
      ["this is B1"],
      ["#ERROR"],
      ["this is B3"],
    ]);

    setCellContent(model, "D1", '=FUNCTION.WITHOUT.RANGE.ARGS("#ERROR", A1:A3)');
    expect(getRangeValuesAsMatrix(model, "D1:D3")).toEqual([["#ERROR"], ["#ERROR"], ["#ERROR"]]);
  });

  test("binary operators should always accept vectors", () => {
    // mean binary operators args should always be simple args
    for (let op in OPERATOR_MAP) {
      const functionDefinition = functionRegistry.content[OPERATOR_MAP[op]];
      expect(
        functionDefinition.args.every((arg) =>
          arg.type.every((t) => !t.startsWith("RANGE") && t !== "META")
        )
      );
    }
  });

  test("unary operators should always accept vectors", () => {
    // mean unary operators args should always be simple arg
    for (const op in UNARY_OPERATOR_MAP) {
      const functionDefinition = functionRegistry.content[UNARY_OPERATOR_MAP[op]];
      expect(functionDefinition.args[0].type.every((t) => !t.startsWith("RANGE") && t !== "META"));
    }
  });
});
