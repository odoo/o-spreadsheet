import "../canvas.mock";
import { BasePlugin, Model } from "../../src";
import { pluginRegistry } from "../../src/plugins";
import { BaseCommand, Command, UID } from "../../src/types";

let m;

export interface UseRange extends BaseCommand {
  type: "USE_RANGE";
  sheetId: string;
  rangesXC: string[];
}

type TestCommands = Command | UseRange;

class PluginTestRange extends BasePlugin {
  static getters = ["getUsedRanges"];

  ranges: UID[] = [];

  handle(cmd: TestCommands) {
    switch (cmd.type) {
      case "USE_RANGE":
        for (let r of cmd.rangesXC) {
          this.ranges.push(this.getters.getRangeFromXC(cmd.sheetId, r));
        }
        break;
    }
  }

  getUsedRanges() {
    return this.ranges.map((rangeId) =>
      this.getters.getRangeString(rangeId, this.getters.getActiveSheetId())
    );
  }
}

pluginRegistry.add("testRange", PluginTestRange);

describe("range plugin", () => {
  beforeEach(() => {
    m = new Model();
    m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["B2:D4"] });
  });

  test("create a range and remove a column in the middle", () => {
    m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [2] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
  });

  test("create a range and remove a column in the start", () => {
    m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [2] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
  });

  test("create a range and remove a column in the end", () => {
    m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [3] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:C4"]);
  });

  test("create a range and remove a column before the start", () => {
    m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [0] });
    expect(m.getters.getUsedRanges()).toEqual(["A2:C4"]);
  });

  test("create a range and remove a column after the end", () => {
    m.dispatch("REMOVE_COLUMNS", { sheet: m.getters.getActiveSheetId(), columns: [5] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
  });

  test("create a range and remove a row in the middle", () => {
    m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [2] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
  });

  test("create a range and remove a row in the start", () => {
    m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [2] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
  });

  test("create a range and remove a row in the end", () => {
    m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [3] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:D3"]);
  });

  test("create a range and remove a row before the start", () => {
    m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [0] });
    expect(m.getters.getUsedRanges()).toEqual(["B1:D3"]);
  });

  test("create a range and remove a row after the end", () => {
    m.dispatch("REMOVE_ROWS", { sheet: m.getters.getActiveSheetId(), rows: [5] });
    expect(m.getters.getUsedRanges()).toEqual(["B2:D4"]);
  });

  test("test withing a different sheet", () => {});
  test("test withing a sheet that has a space", () => {});
  test("test withing a fixed row", () => {});
  test("test withing a fixed col", () => {});
});
