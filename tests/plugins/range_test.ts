import { CorePlugin, Model } from "../../src";
import { INCORRECT_RANGE_STRING } from "../../src/constants";
import { corePluginRegistry } from "../../src/plugins";
import { ApplyRangeChange, BaseCommand, Command, Range, UID } from "../../src/types";
import "../canvas.mock";
import { mockUuidV4To } from "../helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let m;

export interface UseRange extends BaseCommand {
  type: "USE_RANGE";
  sheetId: string;
  rangesXC: string[];
}

export interface UseTransientRange extends BaseCommand {
  type: "USE_TRANSIENT_RANGE";
  sheetId: string;
  rangesXC: string[];
}

type TestCommands = Command | UseRange | UseTransientRange;

class PluginTestRange extends CorePlugin {
  static getters = ["getUsedRanges", "getRanges"];

  ranges: Range[] = [];

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (let i = 0; i < this.ranges.length; i++) {
      let range = this.ranges[i];
      const change = applyChange(range);
      switch (change.changeType) {
        case "REMOVE":
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

corePluginRegistry.add("testRange", PluginTestRange);

describe("range plugin", () => {
  beforeEach(() => {
    mockUuidV4To(1);
    m = new Model({
      sheets: [
        { id: "s1", name: "s1", rows: 10, cols: 10 },
        { id: "s2", name: "s 2", rows: 10, cols: 10 },
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
        m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("in the start", () => {
        m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("in the end", () => {
        m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [3] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("before the start", () => {
        m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [0] });
        expect(m.getters.getUsedRanges()).toEqual(["A2:C4"]);
      });

      test("after the end", () => {
        m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [5] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and remove a row", () => {
      test("in the middle", () => {
        m.dispatch("REMOVE_ROWS", { sheetId: m.getters.getActiveSheetId(), rows: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("in the start", () => {
        m.dispatch("REMOVE_ROWS", { sheetId: m.getters.getActiveSheetId(), rows: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("in the end", () => {
        m.dispatch("REMOVE_ROWS", { sheetId: m.getters.getActiveSheetId(), rows: [3] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("before the start", () => {
        m.dispatch("REMOVE_ROWS", { sheetId: m.getters.getActiveSheetId(), rows: [0] });
        expect(m.getters.getUsedRanges()).toEqual(["B1:D3"]);
      });

      test("after the end", () => {
        m.dispatch("REMOVE_ROWS", { sheetId: m.getters.getActiveSheetId(), rows: [5] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and add a column", () => {
      test("after, in the middle", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 2,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("after, in the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 1,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("after, in the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 3,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("after, before the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 0,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("after, after the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 4,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("before, in the middle", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 2,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("before, in the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 1,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("before, in the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 3,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("before, before the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 0,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("before, before the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheetId: m.getters.getActiveSheetId(),
          column: 4,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and add a row", () => {
      test("after, in the middle", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 2,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("after, in the start", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 1,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("after, in the end", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 3,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("after, before the start", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 0,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("after, after the end", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 4,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("before, in the middle", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 2,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("before, in the start", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 1,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("before, in the end", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 3,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("before, before the start", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 0,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("before, before the end", () => {
        m.dispatch("ADD_ROWS", {
          sheetId: m.getters.getActiveSheetId(),
          row: 5,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
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
  });
});
