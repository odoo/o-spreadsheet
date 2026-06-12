import { FunctionResultObject, LazyArg, Matrix, UnboundedZone } from "../../src";
import { functionRegistry } from "../../src/functions/function_registry";
import { toMatrix3, toString } from "../../src/functions/helpers";
import { isErrorResult } from "../../src/helpers/cells/cell_evaluation";
import { zoneToXc } from "../../src/helpers/zones";
import { addToRegistry, evaluateCell } from "../test_helpers/helpers";

describe("lazification", () => {
  let inspectedZoneMemory: string[] = [];
  beforeEach(() => {
    inspectedZoneMemory = [];

    addToRegistry(functionRegistry, "R", {
      description:
        "function that return the range given as argument, and keep in memory the real range position used by the lazy evaluation",
      computeArray: (zone: UnboundedZone, range: LazyArg) => {
        if (range === undefined) {
          range = () => [[]];
        }

        const result = toMatrix3(range(zone));
        if (result[0] !== undefined && isErrorResult(result[0][0])) {
          return result;
        }

        let position: { col: number; row: number } | undefined;

        // find the position of the first non-empty cell in the result matrix
        outerLoop: for (let colIndex = 0; colIndex < result.length; colIndex++) {
          const column = result[colIndex];
          if (!column) {
            continue;
          }

          for (let rowIndex = 0; rowIndex < column.length; rowIndex++) {
            const cell = column[rowIndex];
            if (cell?.position) {
              position = cell.position;
              break outerLoop;
            }
          }
        }

        if (!position) {
          return result;
        }

        const left = position.col;
        const top = position.row;
        let right = position.col - 1;
        let bottom = position.row - 1;

        for (let colIndex = 0; colIndex < result.length; colIndex++) {
          if (result[colIndex] !== undefined) {
            right += 1;
          }
        }

        if (result[0] !== undefined) {
          for (let rowIndex = 0; rowIndex < result[0].length; rowIndex++) {
            if (result[0][rowIndex] !== undefined) {
              bottom += 1;
            }
          }
        }

        inspectedZoneMemory.push(zoneToXc({ left, top, right, bottom }));

        return result;
      },
      args: [{ name: "arg", description: "", type: ["RANGE"], acceptMatrix: true, lazy: true }],
    });

    addToRegistry(functionRegistry, "SUB_R", {
      description:
        "function that return the range given as argument reduced to the sub zone given as second argument",
      computeArray: (
        zone: UnboundedZone,
        arg: (zone: UnboundedZone) => Matrix<FunctionResultObject>,
        subRange: FunctionResultObject
      ) => {
        const result = toMatrix3(arg(parseLTRB(toString(subRange))));

        // SUB_R extracts only the portion of an array formula result that is needed.
        // Because evaluation is lazy, SUB_R is useful for forcing child formulas
        // to compute only the requested part.

        // In general, each formula that interrogates an array formula should filter
        // its queried result and keep only non-empty data or return errors for
        // empty data (depending of the formula purpose).

        // Note that this does not mean a formula cannot return a matrix with holes.
        // Depending on the input zone, if the requested zone is larger than the
        // actual produced data, the formula will return a matrix with holes.

        // Here, SUB_R bypasses the normal output zone by applying `subRange` directly.
        // As a result, we can no longer guarantee that a valid zone
        // (for example: left: 0, top: 0, right: undefined, bottom: undefined)
        // produces a hole-free matrix. Therefore, we must explicitly filter the
        // matrix here.

        const realResult: Matrix<FunctionResultObject> = [];
        for (let colIndex = 0; colIndex < result.length; colIndex++) {
          if (result[colIndex] !== undefined && result[colIndex].length > 0) {
            if (result[colIndex][0] !== undefined) {
              realResult[colIndex] = result[colIndex];
            }
          }
        }
        return realResult;
      },
      args: [
        { name: "arg", description: "", type: ["RANGE"], acceptMatrix: true, lazy: true },
        { name: "subRange", description: "", type: ["STRING"] },
      ],
    });
  });

  describe.skip("ARRAY.CONSTRAIN use arguments partially", () => {
    test.each([
      ["=ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", ["A1"]],
      ["=ARRAY.CONSTRAIN( R( A1:B2 ), 2, 1 )", ["A1:A2"]],
      ["=ARRAY.CONSTRAIN( R( A1:B2 ), 1, 2 )", ["A1:B1"]],
      ["=ARRAY.CONSTRAIN( R( A1:B2 ), 2, 2 )", ["A1:B2"]],
      ["=ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", ["A1:B2"]],
      ["=ARRAY.CONSTRAIN( R( A1:B ), 3, 3 )", ["A1:B3"]],
      ["=ARRAY.CONSTRAIN( R( A1:2 ), 3, 3 )", ["A1:C2"]],
    ])("use argument partially, formula: %s, used ranges %s", (formula, realRanges) => {
      evaluateCell("C1", {
        C1: formula,
      });
      expect(inspectedZoneMemory).toEqual(realRanges);
    });

    //////////////////////////////////////////////////////////////////////////
    test("test tool", () => {
      expect(
        evaluateCell("J1", {
          J1: `=?SUB_R( ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 ), "L0 R0 T0 B0")`,
        })
      ).toBe("#ERROR");
      expect(inspectedZoneMemory).toEqual(["C3"]);
    });

    //////////////////////////////////////////////////////////////////////////

    test.each([
      // test with col/row index at limit of the range

      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L0 R0 T0 B0", 0, ["C3"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L0 R0 T0   ", 0, ["C3:C5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L0    T0   ", 0, ["C3:E5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L0    T0 B0", 0, ["C3:E3"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L1 R1 T1 B1", 0, ["D4"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L1 R1 T1   ", 0, ["D4:D5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L1    T1   ", 0, ["D4:E5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L1    T1 B1", 0, ["D4:E4"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L2 R2 T2 B2", 0, ["E5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L2 R2 T2   ", 0, ["E5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L2    T2   ", 0, ["E5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L2    T2 B2", 0, ["E5"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L3 R3 T3 B3", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L3 R3 T3   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L3    T3   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 3, 3 )", "L3    T3 B3", 0, []],

      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L0 R0 T0 B0", 0, ["C3"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L0 R0 T0   ", 0, ["C3"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L0    T0   ", 0, ["C3"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L0    T0 B0", 0, ["C3"]],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L1 R1 T1 B1", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L1 R1 T1   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L1    T1   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L1    T1 B1", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L2 R2 T2 B2", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L2 R2 T2   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L2    T2   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L2    T2 B2", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L3 R3 T3 B3", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L3 R3 T3   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L3    T3   ", 0, []],
      ["ARRAY.CONSTRAIN( R( C3:F6 ), 1, 1 )", "L3    T3 B3", 0, []],

      // test with column/row index out of range

      // in practice return an error for technical raisons (see ARRAY.CONSTRAIN implementation)
      // but in theory it could return only the part of the range that is in the zone.

      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L0 R0 T0 B0", "#ERROR", ["C3"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L0 R0 T0   ", "#ERROR", ["C3:C4"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L0    T0   ", "#ERROR", ["C3:D4"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L0    T0 B0", "#ERROR", ["C3:D3"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L1 R1 T1 B1", "#ERROR", ["D4"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L1 R1 T1   ", "#ERROR", ["D4"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L1    T1   ", "#ERROR", ["D4"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L1    T1 B1", "#ERROR", ["D4"]],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L2 R2 T2 B2", "#ERROR", []],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L2 R2 T2   ", "#ERROR", []],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L2    T2   ", "#ERROR", []],
      ["ARRAY.CONSTRAIN( R( C3:D4 ), 3, 3 )", "L2    T2 B2", "#ERROR", []],
    ])(
      "relay lazy instructions, formula: %s, zone: %s, result %s, realRanges %s",
      (formula, unboundedZone, result, realRangesUsed) => {
        expect(
          evaluateCell("J1", {
            J1: `=SUB_R(${formula}, "${unboundedZone}")`,
          })
        ).toBe(result);
        expect(inspectedZoneMemory).toEqual(realRangesUsed);
      }
    );
  });

  describe("CHOOSECOLS formula can use arguments partially", () => {
    test.each([
      ["=CHOOSECOLS( R( A1:B2 ), 2, 1 )", ["B1:B2", "A1:A2"]],
      ["=CHOOSECOLS( R( A1:B2 ), 1 )", ["A1:A2"]],
      ["=CHOOSECOLS( R( A1:B2 ), 2 )", ["B1:B2"]],
      ["=CHOOSECOLS( R( A1:B2 ), 3 )", []],
      ["=CHOOSECOLS( R( A1:B2 ), 42 )", []],
      ["=CHOOSECOLS( R( A1:B2 ), -1, -2 )", ["B1:B2", "A1:A2"]],
      ["=CHOOSECOLS( R( A1:B2 ), -1 )", ["B1:B2"]],
      ["=CHOOSECOLS( R( A1:B2 ), -2 )", ["A1:A2"]],
      ["=CHOOSECOLS( R( A1:B2 ), -3 )", []],
    ])("use argument partially, formula: %s, used ranges %s", (formula, ranges) => {
      evaluateCell("C1", {
        C1: formula,
      });
      expect(inspectedZoneMemory).toEqual(ranges);
    });

    test.each([
      // test with column index at limit of the range

      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0 R0 T0 B0", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0    T0   ", 0, ["C3:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L1 R1 T1 B1", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L1    T1   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0 R0 T1   ", 0, ["C4:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0 R0 T1 B1", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0 R0 T2   ", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0 R0 T2 B2", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0 R0 T3   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 1 )", "L0 R0 T3 B3", 0, []],

      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0 R0 T0 B0", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0    T0   ", 0, ["E3:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L1 R1 T1 B1", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L1    T1   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0 R0 T1   ", 0, ["E4:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0 R0 T1 B1", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0 R0 T2   ", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0 R0 T2 B2", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0 R0 T3   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 3 )", "L0 R0 T3 B3", 0, []],

      // test with column index out of range

      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T0 B0", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0    T0   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L1 R1 T1 B1", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L1    T1   ", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T1   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T1 B1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T2   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T2 B2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T3   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T3 B3", "#ERROR", []],

      // test with negative column index at limit of the range

      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0 R0 T0 B0", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0    T0   ", 0, ["E3:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L1 R1 T1 B1", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L1    T1   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0 R0 T1   ", 0, ["E4:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0 R0 T1 B1", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0 R0 T2   ", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0 R0 T2 B2", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0 R0 T3   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -1 )", "L0 R0 T3 B3", 0, []],

      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0 R0 T0 B0", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0    T0   ", 0, ["C3:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L1 R1 T1 B1", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L1    T1   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0 R0 T1   ", 0, ["C4:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0 R0 T1 B1", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0 R0 T2   ", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0 R0 T2 B2", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0 R0 T3   ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -3 )", "L0 R0 T3 B3", 0, []],

      // test with negative column index out of range

      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0 R0 T0 B0", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0    T0   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L1 R1 T1 B1", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L1    T1   ", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0 R0 T1   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0 R0 T1 B1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0 R0 T2   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0 R0 T2 B2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0 R0 T3   ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L0 R0 T3 B3", "#ERROR", []],
    ])(
      "relay lazy instructions, formula: %s, zone: %s, result %s, realRanges %s",
      (formula, unboundedZone, result, realRangesUsed) => {
        expect(
          evaluateCell("J1", {
            J1: `=SUB_R(${formula}, "${unboundedZone}")`,
          })
        ).toBe(result);
        expect(inspectedZoneMemory).toEqual(realRangesUsed);
      }
    );

    test.each([
      // test with column index at limit of the range

      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+0    ", 0, ["C3:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+0 B+0", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0     T-1 B-1", 0, ["E5", "C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0 R+0 T-1 B-1", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T-1 B-1", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-2 R-2 T+1    ", 0, ["E4:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-2 R-2 T+1 B+1", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+1     T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+1 R+1 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-2 R-2 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+1    ", 0, ["C4:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+1 B+1", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0     T-2 B-2", 0, ["E4", "C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0 R+0 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+2    ", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+2 B+2", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0     T+2 B+2", 0, ["E5", "C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0 R+0 T-3 B-3", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T-3 B-3", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+3    ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T+3 B+3", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0     T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L+0 R+0 T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 3, 1 )", "L-1 R-1 T-4 B-4", 0, []],

      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+0    ", 0, ["E3:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+0 B+0", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0     T-1 B-1", 0, ["C5", "E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0 R+0 T-1 B-1", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T-1 B-1", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-2 R-2 T+1    ", 0, ["C4:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-2 R-2 T+1 B+1", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+1     T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+1 R+1 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-2 R-2 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+1    ", 0, ["E4:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+1 B+1", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0     T-2 B-2", 0, ["C4", "E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0 R+0 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+2    ", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+2 B+2", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0     T+2 B+2", 0, ["C5", "E5"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0 R+0 T-3 B-3", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T-3 B-3", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+3    ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T+3 B+3", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0     T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L+0 R+0 T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), 1, 3 )", "L-1 R-1 T-4 B-4", 0, []],

      // test with column index out of range

      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+0    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+0 B+0", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0     T-1 B-1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0 R+0 T-1 B-1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T-1 B-1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-2 R-2 T+1    ", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-2 R-2 T+1 B+1", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+1     T-2 B-2", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+1 R+1 T-2 B-2", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-2 R-2 T-2 B-2", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+1    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+1 B+1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0     T-2 B-2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0 R+0 T-2 B-2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T-2 B-2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+2    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+2 B+2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0     T+2 B+2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0 R+0 T-3 B-3", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T-3 B-3", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+3    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T+3 B+3", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0     T-4 B-4", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L+0 R+0 T-4 B-4", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L-1 R-1 T-4 B-4", "#ERROR", []],

      // test with negative column index at limit of the range

      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+0    ", 0, ["E3:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+0 B+0", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0     T-1 B-1", 0, ["C5", "E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0 R+0 T-1 B-1", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T-1 B-1", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-2 R-2 T+1    ", 0, ["C4:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-2 R-2 T+1 B+1", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+1     T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+1 R+1 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-2 R-2 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+1    ", 0, ["E4:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+1 B+1", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0     T-2 B-2", 0, ["C4", "E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0 R+0 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+2    ", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+2 B+2", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0     T+2 B+2", 0, ["C5", "E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0 R+0 T-3 B-3", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T-3 B-3", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+3    ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T+3 B+3", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0     T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L+0 R+0 T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -3, -1 )", "L-1 R-1 T-4 B-4", 0, []],

      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+0    ", 0, ["C3:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+0 B+0", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0     T-1 B-1", 0, ["E5", "C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0 R+0 T-1 B-1", 0, ["E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T-1 B-1", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-2 R-2 T+1    ", 0, ["E4:E5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-2 R-2 T+1 B+1", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+1     T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+1 R+1 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-2 R-2 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+1    ", 0, ["C4:C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+1 B+1", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0     T-2 B-2", 0, ["E4", "C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0 R+0 T-2 B-2", 0, ["E4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T-2 B-2", 0, ["C4"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+2    ", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+2 B+2", 0, ["C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0     T+2 B+2", 0, ["E5", "C5"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0 R+0 T-3 B-3", 0, ["E3"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T-3 B-3", 0, ["C3"]],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+3    ", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T+3 B+3", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0     T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L+0 R+0 T-4 B-4", 0, []],
      ["CHOOSECOLS( R( C3:E5 ), -1, -3 )", "L-1 R-1 T-4 B-4", 0, []],

      // test with negative column index out of range

      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+0    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+0 B+0", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0     T-1 B-1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0 R+0 T-1 B-1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T-1 B-1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-2 R-2 T+1    ", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-2 R-2 T+1 B+1", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+1     T-2 B-2", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+1 R+1 T-2 B-2", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-2 R-2 T-2 B-2", 0, []], // side effect of lazy evaluation: the zone is out of CHOOSECOLS range result, so no error is returned
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+1    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+1 B+1", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0     T-2 B-2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0 R+0 T-2 B-2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T-2 B-2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+2    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+2 B+2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0     T+2 B+2", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0 R+0 T-3 B-3", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T-3 B-3", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+3    ", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T+3 B+3", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0     T-4 B-4", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L+0 R+0 T-4 B-4", "#ERROR", []],
      ["CHOOSECOLS( R( C3:E5 ), -4 )", "L-1 R-1 T-4 B-4", "#ERROR", []],
    ])(
      "relay negative lazy instructions, formula: %s, zone: %s, realRanges %s",
      (formula, unboundedZone, result, realRangesUsed) => {
        expect(
          evaluateCell("J1", {
            J1: `=SUB_R(${formula}, "${unboundedZone}")`,
          })
        ).toBe(result);
        expect(inspectedZoneMemory).toEqual(realRangesUsed);
      }
    );
  });
});

function parseLTRB(ref: string): UnboundedZone {
  const parts = ref.trim().split(/\s+/);

  const zone: UnboundedZone = {
    top: 0,
    bottom: undefined,
    left: 0,
    right: undefined,
  };

  const seen = new Set<string>();

  for (const part of parts) {
    if (!part) {
      continue;
    }

    const match = part.match(/^([LRTB])([+-]?\d+)$/); // allow optional + or - sign
    if (!match) {
      throw new Error(`Invalid token: ${part}`);
    }

    const key = match[1];
    const value = parseInt(match[2], 10);

    if (seen.has(key)) {
      throw new Error(`Duplicate key: ${key}`);
    }
    seen.add(key);

    switch (key) {
      case "L":
        zone.left = value;
        break;
      case "R":
        zone.right = value;
        break;
      case "T":
        zone.top = value;
        break;
      case "B":
        zone.bottom = value;
        break;
    }
  }

  if (zone.left !== undefined && zone.right !== undefined && zone.left > zone.right) {
    [zone.left, zone.right] = [zone.right, zone.left];
  }

  if (zone.top !== undefined && zone.bottom !== undefined && zone.top > zone.bottom) {
    [zone.top, zone.bottom] = [zone.bottom, zone.top];
  }

  return zone;
}
