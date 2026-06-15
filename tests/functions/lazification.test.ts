import { FunctionResultNumber, FunctionResultObject, Matrix, UnboundedZone } from "../../src";
import { functionRegistry } from "../../src/functions/function_registry";
import { generateSubMatrix } from "../../src/functions/helpers";
import { addToRegistry, evaluateCell } from "../test_helpers/helpers";

describe("lazification", () => {
  let counter = 0;
  beforeEach(() => {
    counter = 0;

    addToRegistry(functionRegistry, "COUNT_USED_REF_IN_RANGE", {
      description: "function that return the range given as argument",
      computeArray: (zone: UnboundedZone, arg: Matrix<FunctionResultObject>) => {
        return generateSubMatrix(zone, arg.length, arg[0].length, (col, row) => {
          counter++;
          return arg[row][col];
        });
      },
      args: [{ name: "arg", description: "", type: ["RANGE"], acceptMatrix: true }],
    });

    addToRegistry(functionRegistry, "USE_SUB_RANGE", {
      description: "function that return the range given as argument",
      computeArray: (
        zone: UnboundedZone,
        arg: (zone: UnboundedZone) => Matrix<FunctionResultObject>,
        colStart: FunctionResultNumber,
        colEnd: FunctionResultNumber,
        rowStart: FunctionResultNumber,
        rowEnd: FunctionResultNumber
      ) => {
        const mockedZone = {
          left: colStart.value,
          right: colEnd.value,
          top: rowStart.value,
          bottom: rowEnd.value,
        };
        return arg(mockedZone);
      },
      args: [
        { name: "arg", description: "", type: ["RANGE"], acceptMatrix: true, lazy: true },
        { name: "colStart", description: "", type: ["NUMBER"] },
        { name: "colEnd", description: "", type: ["NUMBER"] },
        { name: "rowStart", description: "", type: ["NUMBER"] },
        { name: "rowEnd", description: "", type: ["NUMBER"] },
      ],
    });
  });

  describe("EXPAND formula can use arguments partially", () => {
    test("use argument fully", () => {
      evaluateCell("C1", {
        C1: "=EXPAND( COUNT_USED_REF_IN_RANGE( A1:B2 ), 3, 3, 42 )",
      });
      expect(counter).toBe(4);
    });

    test("use argument partially", () => {
      evaluateCell("C1", {
        C1: "=?USE_SUB_RANGE( EXPAND( COUNT_USED_REF_IN_RANGE( A1:B2 ), 3, 3, 42 ), 1, 1, 2, 2 )",
      });
      expect(counter).toBe(1);
    });
  });
  //   test("formula EXPAND uses argument partially", () => {
  //     // prettier-ignore
  //     const grid = {
  //       A1: "A1", B1: "B1",
  //       A2: "A2", B2: "B2"
  //     };
  //     const model = createModelFromGrid({
  //       C1: "=EXPAND(COUNT_USED_REF_IN_RANGE(A1:B2), 3, 3, 42)",
  //       ...grid,
  //     });
  //     expect(getRangeValuesAsMatrix(model, "C1:E3")).toEqual([
  //       ["A1", "A2", 42],
  //       ["B1", "B2", 42],
  //       [42, 42, 42],
  //     ]);
  //     expect(counter).toBe(4);

  //     counter = 0;
  //     setCellContent(model, "C1", "=CHOOSECOLS(EXPAND(COUNT_USED_REF_IN_RANGE(B1:C2), 3, 3, 42), 1)");
  //     expect(counter).toBe(2);

  //   });
});
