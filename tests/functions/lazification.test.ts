import { FunctionResultObject, LazyArg, Matrix, UnboundedZone } from "../../src";
import { functionRegistry } from "../../src/functions/function_registry";
import { toMatrix, toString } from "../../src/functions/helpers";
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

        const result = toMatrix(range(zone));

        if (
          result[0].length === 0 ||
          (isErrorResult(result[0][0]) && result.length === 1 && result[0].length === 1)
        ) {
          return result;
        }

        const position = result[0][0].position;

        if (!position) {
          throw new Error(
            "'R' is a helper for testing lazification, it should be used only with a range argument"
          );
        }

        const left = position.col;
        const top = position.row;
        const right = position.col + result.length - 1;
        const bottom = position.row + result[0].length - 1;

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
        return arg(parseLTRB(toString(subRange)));
      },
      args: [
        { name: "arg", description: "", type: ["RANGE"], acceptMatrix: true, lazy: true },
        { name: "subRange", description: "", type: ["STRING"] },
      ],
    });
  });

  describe("ARRAY.CONSTRAIN formula can use arguments partially", () => {
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

    test.each([
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L0 R0 T0 B0", ["A1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L0    T0   ", ["A1:B2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L1 R1 T1 B1", ["B2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L1    T1   ", ["B2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L2 R2 T0 B2", []],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L0 R2 T2 B2", []],

      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L0 R0 T0 B0", ["A1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L0    T0   ", ["A1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L1 R1 T1 B1", []],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L1    T1   ", []],
    ])(
      "relay lazy instructions, formula: %s, zone: %s, realRanges %s",
      (formula, unboundedZone, realRanges) => {
        evaluateCell("C1", {
          C1: `=SUB_R(${formula}, "${unboundedZone}")`,
        });
        expect(inspectedZoneMemory).toEqual(realRanges);
      }
    );

    test("testtest", () => {
      evaluateCell("C1", {
        C1: `=?SUB_R( ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 ), "L-1 R-1 T0 B0 ")`,
      });
      expect(inspectedZoneMemory).toEqual(["B1"]);

      // evaluateCell("C1", {
      //   C1: '=SUB_R( ARRAY.CONSTRAIN( R(A1:B2), 3, 3 ), "C1R1")',
      // });
      // expect(inspectedZoneMemory).toEqual(["A1"]);
    });

    test.each([
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L-1 R-1 T0  B0  ", ["B1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L-1 R-1 T0      ", ["B1:B2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L0  R0  T-1 B-1 ", ["A2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L0      T-1 B-1 ", ["A2:B2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L-1 R-1 T-1 B-1 ", ["B2"]],

      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L-2 R-1 T0  B0  ", ["A1:B1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L-2 R-1 T0      ", ["A1:B2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L0  R0  T-2 B-1 ", ["A1:A2"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 3, 3 )", "L0      T-2 B-1 ", ["A1:B2"]],

      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L-1 R-1 T0  B0  ", ["A1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L-1 R-1 T0      ", ["A1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L0  R0  T-1 B-1 ", ["A1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L0      T-1 B-1 ", ["A1"]],
      ["ARRAY.CONSTRAIN( R( A1:B2 ), 1, 1 )", "L-1 R-1 T-1 B-1 ", ["A1"]],
    ])(
      "relay negative lazy instructions, formula: %s, zone: %s, realRanges %s",
      (formula, unboundedZone, realRanges) => {
        evaluateCell("C1", {
          C1: `=SUB_R(${formula}, "${unboundedZone}")`,
        });
        expect(inspectedZoneMemory).toEqual(realRanges);
      }
    );
  });

  describe("CHOOSECOLS formula can use arguments partially", () => {
    test.each([
      ["=CHOOSECOLS( R( A1:B2 ), 1 )", ["A1:A2"]],
      ["=CHOOSECOLS( R( A1:B2 ), 2 )", ["B1:B2"]],
      ["=CHOOSECOLS( R( A1:B2 ), 3 )", []],
      ["=CHOOSECOLS( R( A1:B2 ), 42 )", []],
      ["=CHOOSECOLS( R( A1:B2 ), -1 )", ["B1:B2"]],
      ["=CHOOSECOLS( R( A1:B2 ), -2 )", ["A1:A2"]],
      ["=CHOOSECOLS( R( A1:B2 ), -3 )", []],
    ])("use argument partially, formula: %s, used ranges %s", (formula, ranges) => {
      evaluateCell("C1", {
        C1: formula,
      });
      expect(inspectedZoneMemory).toEqual(ranges);
    });

    test("testtest", () => {
      //////////////////////////////////////////////////////////////////////////
      evaluateCell("C1", {
        C1: `=?SUB_R( CHOOSECOLS( R( C3:E5 ), 2 ), "L1 R1 T1 B1")`,
      });
      expect(inspectedZoneMemory).toEqual([]);
      //////////////////////////////////////////////////////////////////////////
    });

    test.each([
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0 R0 T0 B0", ["D3"]],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0    T0   ", ["D3:D5"]],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L1 R1 T1 B1", []],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L1    T1   ", []],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0 R0 T1   ", ["D4:D5"]],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0 R0 T1 B1", ["D4"]],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0 R0 T2   ", ["D5"]],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0 R0 T2 B2", ["D5"]],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0 R0 T3   ", []],
      ["CHOOSECOLS( R( C3:E5 ), 2 )", "L0 R0 T3 B3", []],

      // CHOOSECOLS( R( C3:E5 ), 4 ) return error

      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T0 B0", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0    T0   ", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L1 R1 T1 B1", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L1    T1   ", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T1   ", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T1 B1", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T2   ", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T2 B2", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T3   ", []],
      ["CHOOSECOLS( R( C3:E5 ), 4 )", "L0 R0 T3 B3", []],
    ])(
      "relay lazy instructions, formula: %s, zone: %s, realRanges %s",
      (formula, unboundedZone, realRanges) => {
        evaluateCell("C1", {
          J1: `=SUB_R(${formula}, "${unboundedZone}")`,
        });
        expect(inspectedZoneMemory).toEqual(realRanges);
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

    const match = part.match(/^([LRTB])(-?\d+)$/); // ✅ autorise les négatifs
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
