import { PluginInstance } from "@odoo/owl";
import { CommandResult, Model, ResizeTableCommand, UID } from "../../src";
import { AutofillStore } from "../../src/components/autofill/autofill_store";
import { TableAutofillStore } from "../../src/components/autofill/table_autofill_store";
import { toZone } from "../../src/helpers/zones";
import { TableResizePlugin } from "../../src/owl_plugins/table_resize_plugin";
import {
  createDynamicTable,
  createTable,
  resizeTable,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getActivePosition, getCellRawContent, getTable } from "../test_helpers/getters_helpers";
import { toRangeData } from "../test_helpers/helpers";
import { makeOwlPluginManager } from "../test_helpers/owl_plugins_helpers";

let model: Model;
let sheetId: UID;
let tableResizePlugin: PluginInstance<typeof TableResizePlugin>;

describe("Table resize", () => {
  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    const { getPlugin, container } = makeOwlPluginManager([TableResizePlugin], { model });
    container.get(AutofillStore);
    container.get(TableAutofillStore);
    tableResizePlugin = getPlugin(TableResizePlugin);
  });

  describe("dispatch result", () => {
    test("Cannot resize a table zone to a wrong zone", () => {
      createTable(model, "A1:A5");

      let cmd: ResizeTableCommand = {
        type: "RESIZE_TABLE",
        sheetId,
        zone: getTable(model, "A1")!.range.zone,
        newTableRange: toRangeData(sheetId, "A1:A600"),
      };

      expect(tableResizePlugin.canResizeTable(cmd)).toBeCancelledBecause(
        CommandResult.TargetOutOfSheet
      );

      createTable(model, "B1:B5");
      cmd = {
        type: "RESIZE_TABLE",
        sheetId,
        zone: getTable(model, "A1")!.range.zone,
        newTableRange: toRangeData(sheetId, "A1:B5"),
      };
      expect(tableResizePlugin.canResizeTable(cmd)).toBeCancelledBecause(
        CommandResult.TableOverlap
      );
    });

    test("Cannot resize a table while changing it's top-left", () => {
      createTable(model, "A1:A5");
      const cmd: ResizeTableCommand = {
        type: "RESIZE_TABLE",
        sheetId,
        zone: getTable(model, "A1")!.range.zone,
        newTableRange: toRangeData(sheetId, "B1:B5"),
      };
      expect(tableResizePlugin.canResizeTable(cmd)).toBeCancelledBecause(
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
    expect(getCellRawContent(model, "A6")).toBe("=B6");
  });

  test("Resize a table change selection to bottom right corner", () => {
    createTable(model, "A1:B4");
    resizeTable(model, "A1", "A1:C6");
    expect(getActivePosition(model)).toBe("C6");
    resizeTable(model, "A1", "A1:B2");
    expect(getActivePosition(model)).toBe("B2");
  });
});
