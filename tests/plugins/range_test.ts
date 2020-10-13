import "../canvas.mock";
import { BasePlugin, Model } from "../../src";
import { pluginRegistry } from "../../src/plugins";
import { BaseCommand, Command } from "../../src/types";
import { Range } from "../../src/plugins/range";

let m;
let notificationSpy;

export interface UseRange extends BaseCommand {
  type: "USE_RANGE";
  sheetId: string;
  rangesXC: string[];
}

type TestCommands = Command | UseRange;

class PluginTestRange extends BasePlugin {
  static getters = ["getUsedRanges"];

  ranges: Range[] = [];

  handle(cmd: TestCommands) {
    switch (cmd.type) {
      case "USE_RANGE":
        for (let r of cmd.rangesXC) {
          this.ranges.push(this.getters.getRangeFromXC(cmd.sheetId, r, this.rangeChanged));
        }
        break;
    }
  }

  getUsedRanges() {
    return this.ranges.map((range) =>
      this.getters.getRangeString(range.id, this.getters.getActiveSheetId())
    );
  }

  rangeChanged() {
    console.log("called");
  }
}

pluginRegistry.add("testRange", PluginTestRange);

describe("range plugin", () => {
  beforeEach(() => {
    m = new Model();
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
        m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("in the start", () => {
        m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("in the end", () => {
        m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [3] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
      });

      test("before the start", () => {
        m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [0] });
        expect(m.getters.getUsedRanges()).toEqual(["A2:C4"]);
      });

      test("after the end", () => {
        m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [5] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and remove a row", () => {
      test("in the middle", () => {
        m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("in the start", () => {
        m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [2] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("in the end", () => {
        m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [3] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
      });

      test("before the start", () => {
        m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [0] });
        expect(m.getters.getUsedRanges()).toEqual(["B1:D3"]);
      });

      test("after the end", () => {
        m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [5] });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });
    });

    describe("create a range and add a column", () => {
      test("after, in the middle", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 2,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("after, in the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 1,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("after, in the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 3,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("after, before the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 0,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("after, after the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 4,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("before, in the middle", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 2,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("before, in the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 1,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("before, in the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 3,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:E4"]);
      });

      test("before, before the start", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
          column: 0,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["C2:E4"]);
      });

      test("before, before the end", () => {
        m.dispatch("ADD_COLUMNS", {
          sheet: m.getters.getActiveSheetId(),
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
          sheet: m.getters.getActiveSheetId(),
          row: 2,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("after, in the start", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 1,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("after, in the end", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 3,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("after, before the start", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 0,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("after, after the end", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 4,
          quantity: 1,
          position: "after",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
      });

      test("before, in the middle", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 2,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("before, in the start", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 1,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("before, in the end", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 3,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B2:D5"]);
      });

      test("before, before the start", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
          row: 0,
          quantity: 1,
          position: "before",
        });
        expect(m.getters.getUsedRanges()).toEqual(["B3:D5"]);
      });

      test("before, before the end", () => {
        m.dispatch("ADD_ROWS", {
          sheet: m.getters.getActiveSheetId(),
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
      m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [2] });
      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy).toHaveBeenCalledWith("RESIZE");
    });
    test("multiple changes of the same range should get notified only once", () => {
      m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [1, 2] });
      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy).toHaveBeenCalledWith("RESIZE");
    });
    test("multiple changes that results in the range disappearing should be notified only once", () => {
      m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [1, 2, 3] });
      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy).toHaveBeenCalledWith("REMOVE");
    });
  });

  test("test withing a different sheet", () => {});
  test("test withing a sheet that has a space", () => {});
  test("test withing a fixed row", () => {});
  test("test withing a fixed col", () => {});
  test("a range in 0 width or 0 height", () => {});
});
