import { CommandResult, Model, UID } from "../../src";
import { toZone } from "../../src/helpers";
import {
  createDynamicTable,
  createTable,
  resizeTable,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getActivePosition, getCellRawContent } from "../test_helpers/getters_helpers";
import { createModel } from "../test_helpers/helpers";

let model: Model;
let sheetId: UID;

describe("Table resize", () => {
  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("dispatch result", () => {
    test("Cannot resize a table zone to a wrong zone", async () => {
      await createTable(model, "A1:A5");

      expect(await resizeTable(model, "A1", "A1:A600")).toBeCancelledBecause(
        CommandResult.TargetOutOfSheet
      );

      await createTable(model, "B1:B5");
      expect(await resizeTable(model, "A1", "A1:B5")).toBeCancelledBecause(
        CommandResult.TableOverlap
      );
    });

    test("Cannot resize a table while changing it's top-left", async () => {
      await createTable(model, "A1:A5");
      expect(await resizeTable(model, "A1", "B1:B5")).toBeCancelledBecause(
        CommandResult.InvalidTableResize
      );
    });
  });

  test("Can resize a table", async () => {
    await createTable(model, "A1:A5");
    await resizeTable(model, "A1", "A1:B10");
    expect(model.getters.getTables(sheetId)).toMatchObject([{ range: { zone: toZone("A1:B10") } }]);
  });

  test("Can resize a dynamic table", async () => {
    await setCellContent(model, "A1", "=MUNIT(4)");
    await createDynamicTable(model, "A1");
    await resizeTable(model, "A1", "A1:B10", "static");
    expect(model.getters.getCoreTables(sheetId)).toMatchObject([
      { range: { zone: toZone("A1:B10") }, type: "static" },
    ]);
  });

  test("Resize a table also autofills", async () => {
    await createTable(model, "A1:A5");
    await setCellContent(model, "A5", "=B5");
    await resizeTable(model, "A1", "A1:A6");
    expect(getCellRawContent(model, "A6")).toBe("=B6");
  });

  test("Resize a table change selection to bottom right corner", async () => {
    await createTable(model, "A1:B4");
    await resizeTable(model, "A1", "A1:C6");
    expect(getActivePosition(model)).toBe("C6");
    await resizeTable(model, "A1", "A1:B2");
    expect(getActivePosition(model)).toBe("B2");
  });
});
