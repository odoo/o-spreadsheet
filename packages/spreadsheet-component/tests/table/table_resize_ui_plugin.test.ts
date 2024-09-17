import { CommandResult, Model, UID } from "../../src";
import { toZone } from "../../src/helpers";
import {
  createDynamicTable,
  createTable,
  resizeTable,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getCell } from "../test_helpers/getters_helpers";

let model: Model;
let sheetId: UID;

describe("Table resize", () => {
  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("dispatch result", () => {
    test("Cannot resize a table zone to a wrong zone", () => {
      createTable(model, "A1:A5");

      expect(resizeTable(model, "A1", "A1:A600")).toBeCancelledBecause(
        CommandResult.TargetOutOfSheet
      );

      createTable(model, "B1:B5");
      expect(resizeTable(model, "A1", "A1:B5")).toBeCancelledBecause(CommandResult.TableOverlap);
    });

    test("Cannot resize a table while changing it's top-left", () => {
      createTable(model, "A1:A5");
      expect(resizeTable(model, "A1", "B1:B5")).toBeCancelledBecause(
        CommandResult.InvalidTableResize
      );
    });
  });

  test("Can resize a table", () => {
    createTable(model, "A1:A5");
    resizeTable(model, "A1", "A1:B10");
    expect(model.getters.getTables(sheetId)).toMatchObject([{ range: { zone: toZone("A1:B10") } }]);
  });

  test("Can resize a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(4)");
    createDynamicTable(model, "A1");
    resizeTable(model, "A1", "A1:B10", "static");
    expect(model.getters.getCoreTables(sheetId)).toMatchObject([
      { range: { zone: toZone("A1:B10") }, type: "static" },
    ]);
  });

  test("Resize a table also autofills", () => {
    createTable(model, "A1:A5");
    setCellContent(model, "A5", "=B5");
    resizeTable(model, "A1", "A1:A6");
    expect(getCell(model, "A6")?.content).toBe("=B6");
  });
});
