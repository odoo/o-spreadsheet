import { CorePlugin, coreTypes, Model } from "../src";
import { INCORRECT_RANGE_STRING } from "../src/constants";
import { copyRangeWithNewSheetId } from "../src/helpers";
import { corePluginRegistry } from "../src/plugins";
import { ApplyRangeChange, Command, Range, UID } from "../src/types";
import {
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  deleteSheet,
  renameSheet,
} from "./test_helpers/commands_helpers";
import { addTestPlugin } from "./test_helpers/helpers";

jest.mock("../src/helpers/uuid", () => require("./__mocks__/uuid"));

let m;

export interface UseRange {
  type: "USE_RANGE";
  sheetId: string;
  rangesXC: string[];
}

export interface UseTransientRange {
  type: "USE_TRANSIENT_RANGE";
  sheetId: string;
  rangesXC: string[];
}

type TestCommands = Command | UseRange | UseTransientRange;
//@ts-ignore
coreTypes.add("USE_RANGE");
//@ts-ignore
coreTypes.add("USE_TRANSIENT_RANGE");

class PluginTestRange extends CorePlugin {
  static getters = ["getUsedRanges", "getRanges"];

  ranges: Range[] = [];

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (let i = 0; i < this.ranges.length; i++) {
      let range = this.ranges[i];
      const change = applyChange(range);
      switch (change.changeType) {
        case "REMOVE":
          this.ranges[i] = change.range;
          break;
        case "RESIZE":
        case "MOVE":
        case "CHANGE":
          this.ranges[i] = change.range;
          break;
      }
    }
  }

  handle(cmd: TestCommands) {
    switch (cmd.type) {
      case "USE_RANGE":
        for (let r of cmd.rangesXC) {
          this.ranges.push(this.getters.getRangeFromSheetXC(cmd.sheetId, r));
        }
        break;
      case "USE_TRANSIENT_RANGE":
        for (let r of cmd.rangesXC) {
          this.ranges.push(this.getters.getRangeFromSheetXC(cmd.sheetId, r));
        }
        break;
    }
  }

  getUsedRanges() {
    return this.ranges.map((range) => this.getters.getRangeString(range, "s1"));
  }

  getRanges() {
    return this.ranges;
  }
}

beforeEach(() => {
  addTestPlugin(corePluginRegistry, PluginTestRange);
});

describe("range plugin", () => {
  beforeEach(() => {
    m = new Model({
      sheets: [
        { id: "s1", name: "s1" },
        { id: "s2", name: "s 2" },
        { id: "s1!!", name: "s1!!" },
      ],
    });
    m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["B2:D4"] });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("adapting the ranges to changes", () => {
    describe("create a range and remove a column", () => {
      test("in the middle", () => {
        deleteColumns(m, ["C"]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("in the start", () => {
        deleteColumns(m, ["C"]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("in the end", () => {
        deleteColumns(m, ["D"]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("before the start", () => {
        deleteColumns(m, ["A"]);
        expect(m.getters.getUsedRanges()).toEqual(["A2:C4"]);
      });

      test("after the end", () => {
        deleteColumns(m, ["F"]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("in another sheet", () => {
        createSheet(m, { sheetId: "42" });
        deleteColumns(m, ["A"], "42");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and remove multiple columns", () => {
      beforeEach(() => {
        m = new Model({
          sheets: [
            { id: "s1", name: "s1" },
            { id: "s2", name: "s 2" },
          ],
        });
        m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["C2:F5"] });
      });

      test("in the middle", () => {
        deleteColumns(m, ["D", "E"]);
        expect(m.getters.getUsedRanges()).toEqual(["C2:D5"]);
      });

      test("in the start", () => {
        deleteColumns(m, ["B", "C"]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("in the end", () => {
        deleteColumns(m, ["E", "F"]);
        expect(m.getters.getUsedRanges()).toEqual(["C2:D5"]);
      });

      test("before the start", () => {
        deleteColumns(m, ["A", "B"]);
        expect(m.getters.getUsedRanges()).toEqual(["A2:D5"]);
      });

      test("after the end", () => {
        deleteColumns(m, ["G", "H"]);
        expect(m.getters.getUsedRanges()).toEqual(["C2:F5"]);
      });

      test("including one column before the start and the first column", () => {
        deleteColumns(m, ["C", "B"]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("including one column after the end and the last column", () => {
        deleteColumns(m, ["G", "F"]);
        expect(m.getters.getUsedRanges()).toEqual(["C2:E5"]);
      });

      test("delete columns causing invalid reference will be marked as #REF", () => {
        m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["C1"] });
        deleteColumns(m, ["B", "C"]);
        expect(m.getters.getUsedRanges()[1]).toEqual("#REF");
      });
    });

    describe("create a range and remove a row", () => {
      test("in the middle", () => {
        deleteRows(m, [2]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("in the start", () => {
        deleteRows(m, [2]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("in the end", () => {
        deleteRows(m, [3]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("before the start", () => {
        deleteRows(m, [0]);
        expect(m.getters.getUsedRanges()).toEqual(["B1:D3"]);
      });

      test("after the end", () => {
        deleteRows(m, [5]);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("in another sheet", () => {
        createSheet(m, { sheetId: "42" });
        deleteRows(m, [0], "42");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and remove multiple rows", () => {
      beforeEach(() => {
        m = new Model({
          sheets: [
            { id: "s1", name: "s1" },
            { id: "s2", name: "s 2" },
          ],
        });
        m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["C3:F7"] });
      });

      test("in the middle", () => {
        deleteRows(m, [3, 4]);
        expect(m.getters.getUsedRanges()).toEqual(["C3:F5"]);
      });

      test("in the start", () => {
        deleteRows(m, [2, 3]);
        expect(m.getters.getUsedRanges()).toEqual(["C3:F5"]);
      });

      test("in the end", () => {
        deleteRows(m, [5, 6]);
        expect(m.getters.getUsedRanges()).toEqual(["C3:F5"]);
      });

      test("including one row before start and the first row", () => {
        deleteRows(m, [1, 2]);
        expect(m.getters.getUsedRanges()).toEqual(["C2:F5"]);
      });

      test("including one row after end and the last row", () => {
        deleteRows(m, [6, 7]);
        expect(m.getters.getUsedRanges()).toEqual(["C3:F6"]);
      });

      test("before the start", () => {
        deleteRows(m, [0, 1]);
        expect(m.getters.getUsedRanges()).toEqual(["C1:F5"]);
      });

      test("after the end", () => {
        deleteRows(m, [7, 8]);
        expect(m.getters.getUsedRanges()).toEqual(["C3:F7"]);
      });

      test("delete rows causing invalid reference will be marked as #REF", () => {
        m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["C3"] });
        deleteRows(m, [1, 2]);
        expect(m.getters.getUsedRanges().length).toEqual(2);
        expect(m.getters.getUsedRanges()[0]).toEqual("C2:F5");
        expect(m.getters.getUsedRanges()[1]).toEqual("#REF");
      });
    });

    describe("create a range and add a column", () => {
      test("after, in the middle", () => {
        addColumns(m, "after", "C", 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("after, in the start", () => {
        addColumns(m, "after", "B", 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("after, in the end", () => {
        addColumns(m, "after", "D", 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("after, before the start", () => {
        addColumns(m, "after", "A", 1);
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("after, after the end", () => {
        addColumns(m, "after", "E", 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("before, in the middle", () => {
        addColumns(m, "before", "C", 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("before, in the start", () => {
        addColumns(m, "before", "B", 1);
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("before, in the end", () => {
        addColumns(m, "before", "D", 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("before, before the start", () => {
        addColumns(m, "before", "A", 1);
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("before, before the end", () => {
        addColumns(m, "before", "E", 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("in another sheet", () => {
        createSheet(m, { sheetId: "42" });
        addColumns(m, "before", "A", 1, "42");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and add a row", () => {
      test("after, in the middle", () => {
        addRows(m, "after", 2, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("after, in the start", () => {
        addRows(m, "after", 1, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("after, in the end", () => {
        addRows(m, "after", 3, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("after, before the start", () => {
        addRows(m, "after", 0, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("after, after the end", () => {
        addRows(m, "after", 4, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("before, in the middle", () => {
        addRows(m, "before", 2, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("before, in the start", () => {
        addRows(m, "before", 1, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("before, in the end", () => {
        addRows(m, "before", 3, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("before, before the start", () => {
        addRows(m, "before", 0, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("before, before the end", () => {
        addRows(m, "before", 5, 1);
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("in another sheet", () => {
        createSheet(m, { sheetId: "42" });
        addRows(m, "before", 1, 1, "42");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and delete a sheet", () => {
      test("delete sheet does not delete ranges from other sheets", () => {
        deleteSheet(m, "s2");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("delete sheet delete ranges in the same sheet", () => {
        m.dispatch("USE_RANGE", { rangesXC: ["A1"], sheetId: "s2" });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4", "'s 2'!A1"]);
        deleteSheet(m, "s2");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4", "#REF"]);
      });
    });

    describe("create a range and delete a sheet", () => {
      test("delete sheet does not delete ranges from other sheets", () => {
        deleteSheet(m, "s2");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("delete sheet delete ranges in the same sheet", () => {
        m.dispatch("USE_RANGE", { rangesXC: ["A1"], sheetId: "s2" });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4", "'s 2'!A1"]);
        deleteSheet(m, "s2");
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4", "#REF"]);
      });
    });
  });

  describe("restoring a range as string", () => {
    test("range created from right to left have correct left (smaller) and right (bigger)", () => {
      let r = m.getters.getRangeFromSheetXC("s2", "c1:a1");
      expect(m.getters.getRangeString(r, "s1")).toBe("'s 2'!A1:C1");
    });
    test("range created from bottom to top have correct top (smaller) and bottom (bigger)", () => {
      let r = m.getters.getRangeFromSheetXC("s2", "a10:a1");
      expect(m.getters.getRangeString(r, "s1")).toBe("'s 2'!A1:A10");
    });
    test("test withing a sheet that has a space", () => {
      let r = m.getters.getRangeFromSheetXC("s2", "a1");
      expect(m.getters.getRangeString(r, "s1")).toBe("'s 2'!A1");
    });

    test.each([["A:B"], ["1:2"], ["A2:B"], ["B2:3"]])("test full column/row", (range) => {
      let r = m.getters.getRangeFromSheetXC("s1", range);
      expect(m.getters.getRangeString(r, "s1")).toBe(range);
    });

    test("test full column/row (2)", () => {
      let r = m.getters.getRangeFromSheetXC("s1", "A:B2");
      expect(m.getters.getRangeString(r, "s1")).toBe("A2:B");

      r = m.getters.getRangeFromSheetXC("s1", "1:B2");
      expect(m.getters.getRangeString(r, "s1")).toBe("B1:2");
    });

    test.each([
      ["$A1"],
      ["$A$1"],
      ["A$1"],
      ["$A1:B1"],
      ["A$1:B1"],
      ["$A$1:B1"],
      ["A1:$B1"],
      ["A1:B$1"],
      ["A1:$B$1"],
      ["$A1:$B1"],
      ["A$1:B$1"],
      ["$A$1:$B$1"],
      ["s1!$A1"],
      ["s1!$A$1"],
      ["s1!A$1"],
      ["s1!$A1:B1"],
      ["s1!A$1:B1"],
      ["s1!$A$1:B1"],
      ["s1!A1:$B1"],
      ["s1!A1:B$1"],
      ["s1!A1:$B$1"],
      ["s1!$A1:$B1"],
      ["s1!A$1:B$1"],
      ["s1!$A$1:$B$1"],
      ["A:$B"],
      ["$A:B"],
      ["$A:$B"],
      ["s1!A:B"],
      ["s1!A:$B"],
      ["s1!A2:$B"],
      ["s1!$A:B"],
      ["s1!$A:$B"],
      ["#REF"],
      ["invalid xc"],
    ])("test withing a fixed row", (range) => {
      let r = m.getters.getRangeFromSheetXC("s1", range);
      expect(m.getters.getRangeString(r, "s1")).toBe(range);
    });

    test.each([
      ["$A1", "s1!$A1"],
      ["$A$1", "s1!$A$1"],
      ["A$1", "s1!A$1"],
      ["$A1:B1", "s1!$A1:B1"],
      ["A$1:B1", "s1!A$1:B1"],
      ["$A$1:B1", "s1!$A$1:B1"],
      ["A1:$B1", "s1!A1:$B1"],
      ["A1:B$1", "s1!A1:B$1"],
      ["A1:$B$1", "s1!A1:$B$1"],
      ["$A1:$B1", "s1!$A1:$B1"],
      ["A$1:B$1", "s1!A$1:B$1"],
      ["$A$1:$B$1", "s1!$A$1:$B$1"],
      ["s1!$A1", "s1!$A1"],
      ["s1!$A$1", "s1!$A$1"],
      ["s1!A$1", "s1!A$1"],
      ["s1!$A1:B1", "s1!$A1:B1"],
      ["s1!A$1:B1", "s1!A$1:B1"],
      ["s1!$A$1:B1", "s1!$A$1:B1"],
      ["s1!A1:$B1", "s1!A1:$B1"],
      ["s1!A1:B$1", "s1!A1:B$1"],
      ["s1!A1:$B$1", "s1!A1:$B$1"],
      ["s1!$A1:$B1", "s1!$A1:$B1"],
      ["s1!A$1:B$1", "s1!A$1:B$1"],
      ["s1!$A$1:$B$1", "s1!$A$1:$B$1"],
      ["A:$B", "s1!A:$B"],
      ["A:$B2", "s1!A2:$B"],
      ["$A:B", "s1!$A:B"],
      ["$A:$B", "s1!$A:$B"],
      ["s1!A:B", "s1!A:B"],
      ["s1!A:$B", "s1!A:$B"],
      ["s1!$A:B", "s1!$A:B"],
      ["s1!$A2:B", "s1!$A2:B"],
      ["s1!$A:$B", "s1!$A:$B"],
      ["#REF", "#REF"],
      ["invalid xc", "invalid xc"],
    ])("test withing a fixed row, displayed for another sheet", (range, expectedString) => {
      let r = m.getters.getRangeFromSheetXC("s1", range);
      expect(m.getters.getRangeString(r, "s2")).toBe(expectedString);
    });

    test("can create a range from a sheet that doesn't exist", () => {
      let r = m.getters.getRangeFromSheetXC("s2", "NOTTHERE!a1");
      expect(m.getters.getRangeString(r, "s1")).toBe("NOTTHERE!A1");
    });

    test("requesting a range that doesn't exist", () => {
      expect(m.getters.getRangeString(undefined, "not there")).toBe(INCORRECT_RANGE_STRING);
    });

    test("requesting a range without parts", () => {
      const r = m.getters.getRangeFromSheetXC("s1", "A1");
      const rNoParts = r.clone({ parts: [] });
      expect(m.getters.getRangeString(rNoParts, "forceSheetName")).toBe("s1!A1");
    });

    test.each(["Sheet 0", "<Sheet1>", "&Sheet2", "Sheet4;", "Sheet5🐻"])(
      "sheet name with special character %s",
      (name) => {
        renameSheet(m, "s1", name);
        const range = m.getters.getRangeFromSheetXC("s1", "A1");
        expect(m.getters.getRangeString(range, "tao")).toBe(`'${name}'!A1`);
      }
    );

    test.each([
      ["s1!!!A1:A9", "'s1!!'!A1:A9"],
      ["'s1!!'!A1:A9", "'s1!!'!A1:A9"],
      ["s1!!!A1:s1!!!A9", "s1!!!A1:s1!!!A9"],
      ["s1!!!A1:s1!!!A9", "s1!!!A1:s1!!!A9"],
    ])(
      "xc with more than one exclamation mark does not throw error",
      (rangeString, expectedString) => {
        const range = m.getters.getRangeFromSheetXC("s1!!", rangeString);
        expect(m.getters.getRangeString(range)).toBe(expectedString);
      }
    );
  });
});

describe("Helpers", () => {
  test.each([
    ["A1:B1", "s1", "s2", "s2"],
    ["Sheet1!A1:B1", "s1", "s2", "s2"],
    ["Sheet2!A1:B1", "s1", "s2", "s2"],
  ])("copyRangeWithNewSheetId", (xc, sheetIdFrom, sheetIdTo, result) => {
    const model = new Model({
      sheets: [
        { id: "s1", name: "Sheet1" },
        { id: "s2", name: "Sheet2" },
      ],
    });
    const range = model.getters.getRangeFromSheetXC(sheetIdFrom, xc);
    const updated = copyRangeWithNewSheetId(sheetIdFrom, sheetIdTo, range);
    expect(updated.sheetId).toBe(result);
  });
});
describe("full column range", () => {
  beforeEach(() => {
    m = new Model({ sheets: [{ id: "s1", name: "s1", rows: 10, cols: 10 }] });
    m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["B:C"] });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  test("delete col before range", () => {
    deleteColumns(m, ["A"]);
    expect(m.getters.getUsedRanges()).toEqual(["A:B"]);
  });
  test("delete col inside range", () => {
    deleteColumns(m, ["C"]);
    expect(m.getters.getUsedRanges()).toEqual(["B:B"]);
  });
  test("delete col after range", () => {
    deleteColumns(m, ["D"]);
    expect(m.getters.getUsedRanges()).toEqual(["B:C"]);
  });
  test("delete row", () => {
    deleteRows(m, [3, 4, 5, 6]);
    expect(m.getters.getUsedRanges()).toEqual(["B:C"]);
  });
  test("insert col before range", () => {
    addColumns(m, "before", "B", 1);
    expect(m.getters.getUsedRanges()).toEqual(["C:D"]);
  });
  test("insert col inside range", () => {
    addColumns(m, "before", "C", 1);
    expect(m.getters.getUsedRanges()).toEqual(["B:D"]);
  });
  test("insert col after range", () => {
    addColumns(m, "after", "C", 1);
    expect(m.getters.getUsedRanges()).toEqual(["B:C"]);
  });
  test("insert row inside", () => {
    addRows(m, "after", 1, 5);
    expect(m.getters.getUsedRanges()).toEqual(["B:C"]);
  });
  test("insert row before'", () => {
    addRows(m, "before", 0, 1);
    expect(m.getters.getUsedRanges()).toEqual(["B:C"]);
  });
  test("insert row before (2)", () => {
    m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["B1:C"] });
    addRows(m, "before", 0, 1);
    expect(m.getters.getUsedRanges()[1]).toEqual("B2:C");
  });
});

describe("full row range", () => {
  beforeEach(() => {
    m = new Model({ sheets: [{ id: "s1", name: "s1", rows: 10, cols: 10 }] });
    m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["2:3"] });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  test("delete row before range", () => {
    deleteRows(m, [0]);
    expect(m.getters.getUsedRanges()).toEqual(["1:2"]);
  });
  test("delete row inside range", () => {
    deleteRows(m, [1]);
    expect(m.getters.getUsedRanges()).toEqual(["2:2"]);
  });
  test("delete row after range", () => {
    deleteRows(m, [4]);
    expect(m.getters.getUsedRanges()).toEqual(["2:3"]);
  });
  test("delete col", () => {
    deleteColumns(m, ["A", "B", "C"]);
    expect(m.getters.getUsedRanges()).toEqual(["2:3"]);
  });
  test("insert row before range", () => {
    addRows(m, "before", 0, 1);
    expect(m.getters.getUsedRanges()).toEqual(["3:4"]);
  });
  test("insert row inside range", () => {
    addRows(m, "after", 1, 1);
    expect(m.getters.getUsedRanges()).toEqual(["2:4"]);
  });
  test("insert row after range", () => {
    addRows(m, "after", 5, 1);
    expect(m.getters.getUsedRanges()).toEqual(["2:3"]);
  });
  test("insert col in range", () => {
    addColumns(m, "after", "C", 5);
    expect(m.getters.getUsedRanges()).toEqual(["2:3"]);
  });
  test("insert col before range", () => {
    addColumns(m, "before", "A", 1);
    expect(m.getters.getUsedRanges()).toEqual(["2:3"]);
  });
  test("insert col before range (1)", () => {
    m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["A2:3"] });
    addColumns(m, "before", "A", 1);
    expect(m.getters.getUsedRanges()[1]).toEqual("B2:3");
  });
});

test.each([
  ["A1:B2", "B2:C3"],
  ["A$1:$B2", "B$1:$B3"],
  ["$A1:B2", "$A2:C3"],
  ["$A$1:$B$2", "$A$1:$B$2"],
  ["1:1", "2:2"],
  ["$1:1", "$1:2"],
  ["1:$1", "$1:2"],
  ["A1:2", "B2:3"],
  ["$A1:1", "$A2:2"],
  ["1:A$2", "B2:$2"],
  ["1:1", "2:2"],
  ["A:A", "B:B"],
  ["$A:A", "$A:B"],
  ["A:$A", "$A:B"],
  ["A1:B", "B2:C"],
  ["$A1:B", "$A2:C"],
  ["A:A$1", "B$1:B"],
])("adapt ranges", (value, expected) => {
  const model = new Model();
  const sheetId = model.getters.getActiveSheetId();
  const range = model.getters.getRangeFromSheetXC(sheetId, value);
  const adaptedRange = model.getters.createAdaptedRanges([range], 1, 1, sheetId);
  expect(model.getters.getRangeString(adaptedRange[0], sheetId)).toBe(expected);
});
