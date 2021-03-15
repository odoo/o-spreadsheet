import { ModelConfig } from "../src/model";
import { RangeAdapter } from "../src/plugins/core/range";
import { SpreadsheetPlugin } from "../src/plugins/core/spreadsheet/spreadsheet";
import { StateObserver } from "../src/state_observer";
import { CellType, CommandDispatcher, Getters } from "../src/types";

describe("POC", () => {
  let spreadsheetPlugin: SpreadsheetPlugin;

  beforeEach(() => {
    spreadsheetPlugin = new SpreadsheetPlugin(
      {} as Getters,
      { addChange: () => {} } as StateObserver,
      // @ts-ignore
      { addRangeProvider: () => {} } as RangeAdapter,
      {} as CommandDispatcher["dispatch"],
      {} as ModelConfig
    );
  });

  test("1", () => {
    spreadsheetPlugin.handle({
      type: "UPDATE_CELL",
      sheetId: "1",
      col: 0,
      row: 0,
      content: "hello",
      style: { fillColor: "orange" },
    });
    expect(spreadsheetPlugin.getCell({ sheetId: "1", col: 0, row: 0 })).toMatchObject({
      content: "hello",
      style: { fillColor: "orange" },
      type: CellType.text,
    });
  });

  test("2", () => {
    spreadsheetPlugin.handle({
      type: "UPDATE_CELL",
      sheetId: "1",
      col: 0,
      row: 0,
      content: "hello",
      style: { fillColor: "orange" },
    });
    spreadsheetPlugin.handle({
      type: "UPDATE_CELL",
      sheetId: "1",
      col: 0,
      row: 0,
      content: "",
      format: "",
      style: null,
    });
    expect(spreadsheetPlugin.getCell({ sheetId: "1", col: 0, row: 0 })).toBeUndefined();
  });
});
