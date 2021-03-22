import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { corePluginRegistry } from "../../src/plugins";
import { INCORRECT_RANGE_STRING } from "../../src/plugins/core/range";
import { CorePlugin } from "../../src/plugins/core_plugin";
import { BaseCommand, Command, Range } from "../../src/types";
import "../canvas.mock";

let m;
let notificationSpy;

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

  handle(cmd: TestCommands) {
    switch (cmd.type) {
      case "USE_RANGE":
        for (let r of cmd.rangesXC) {
          this.ranges.push(this.getters.getRangeFromSheetXC(cmd.sheetId, r, this.rangeChanged));
        }
        break;
      case "USE_TRANSIENT_RANGE":
        for (let r of cmd.rangesXC) {
          this.ranges.push(
            this.getters.getRangeFromSheetXC(cmd.sheetId, r, this.rangeChanged, true)
          );
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

  rangeChanged() {
    console.log("called");
  }
}

corePluginRegistry.add("testRange", PluginTestRange);

describe("range plugin", () => {
  beforeEach(() => {
    m = new Model({
      sheets: [
        { id: "s1", name: "s1", rows: 10, cols: 10 },
        { id: "s2", name: "s 2", rows: 10, cols: 10 },
      ],
    });
    notificationSpy = jest
      .spyOn(PluginTestRange.prototype, "rangeChanged")
      .mockImplementation(() => "Hello");
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

  describe("change notification", () => {
    test("a change should be notified", () => {
      m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [2] });
      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy).toHaveBeenCalledWith("RESIZE", "s1");
    });
    test("multiple changes of the same range should get notified only once", () => {
      m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [1, 2] });
      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy).toHaveBeenCalledWith("RESIZE", "s1");
    });
    test("multiple changes that results in the range disappearing should be notified only once", () => {
      m.dispatch("REMOVE_COLUMNS", { sheetId: m.getters.getActiveSheetId(), columns: [1, 2, 3] });
      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy).toHaveBeenCalledWith("REMOVE", "s1");
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
  });

  describe("history", () => {
    test("when a range is modified, undoing this restores the previous state", () => {
      m = new Model({
        sheets: [
          {
            id: "s1",
            name: "s1",
            rows: 10,
            cols: 10,
            cells: {
              A1: { content: "1" },
              A2: { content: "2" },
              A3: { content: "5" },
              A4: { content: "=sum(a1:a3)" },
            },
          },
        ],
      });
      expect(m.getters.getCell("s1", 0, 3)!.value).toBe(8);
      m.dispatch("REMOVE_ROWS", { rows: [1], sheetId: "s1" });
      expect(m.getters.getCell("s1", 0, 2)!.value).toBe(6);
      expect(m.getters.getFormulaCellContent("s1", m.getters.getCell("s1", 0, 2))).toBe(
        "=sum(A1:A2)"
      );
      m.dispatch("UNDO");
      expect(m.getters.getCell("s1", 0, 3)!.value).toBe(8);
      expect(m.getters.getFormulaCellContent("s1", m.getters.getCell("s1", 0, 3))).toBe(
        "=sum(A1:A3)"
      );
    });
  });

  describe("use transient ranges do not update the ranges", () => {
    beforeEach(() => {
      m.dispatch("USE_TRANSIENT_RANGE", {
        sheetId: m.getters.getActiveSheetId(),
        rangesXC: ["C3:D6"],
      });
    });
    test("before, before the end", () => {
      m.dispatch("ADD_ROWS", {
        sheetId: m.getters.getActiveSheetId(),
        row: 5,
        quantity: 1,
        position: "before",
      });
      expect(m.getters.getUsedRanges()).toEqual(["B2:D4", "C3:D6"]);
      expect(m.getters.getRanges()).toMatchObject([
        { zone: toZone("B2:D4") },
        { zone: toZone("C3:D6") },
      ]);
    });
  });
});
