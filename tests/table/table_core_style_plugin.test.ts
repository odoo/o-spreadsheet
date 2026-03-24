import { DEFAULT_TABLE_CONFIG } from "@odoo/o-spreadsheet-engine/helpers/table_presets";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { CommandResult, TableStyle, TableStyleTemplateName, UID } from "../../src";
import {
  createTable,
  createTableStyle,
  redo,
  removeTableStyle,
  undo,
} from "../test_helpers/commands_helpers";
import { getStyle } from "../test_helpers/getters_helpers";
import { createModel } from "../test_helpers/helpers";

const customStyle: Omit<TableStyle, "category"> = {
  displayName: "MyStyle",
  templateName: "mediumBandedBorders",
  primaryColor: "#FF0000",
};

describe("Table core style plugin", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can add a table style", async () => {
    await createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });

  test("Cannot add invalid table style", async () => {
    let result = await createTableStyle(model, "MyStyle", {
      templateName: "notAValidTemplate" as TableStyleTemplateName,
    });
    expect(result).toBeCancelledBecause(CommandResult.InvalidTableStyle);

    result = await createTableStyle(model, "MyStyle", { primaryColor: "notAValidColor" });
    expect(result).toBeCancelledBecause(CommandResult.InvalidTableStyle);
  });

  test("Can edit an existing table style", async () => {
    await createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    await createTableStyle(model, "MyStyle", {
      templateName: "lightWithHeader",
      primaryColor: "#0f0",
    });
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject({
      templateName: "lightWithHeader",
      primaryColor: "#0f0",
    });
  });

  test("Can remove a table style", async () => {
    await createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyles()["MyStyle"]).toMatchObject(customStyle);

    await removeTableStyle(model, "MyStyle");
    expect(model.getters.getTableStyles()["MyStyle"]).toBeUndefined();
  });

  test("Editing or removing a table style edit the cell style", async () => {
    await createTableStyle(model, "MyStyle");
    await createTable(model, "A1", { styleId: "MyStyle" });
    expect(getStyle(model, "A1")).toMatchObject({ fillColor: "#FF0000" });

    await createTableStyle(model, "MyStyle", {
      templateName: "mediumBandedBorders",
      primaryColor: "#00FF00",
    });
    expect(getStyle(model, "A1")).toMatchObject({ fillColor: "#00FF00" });

    await removeTableStyle(model, "MyStyle");
    expect(getStyle(model, "A1")).toMatchObject({ fillColor: "#346B90" }); // default table style
  });

  test("Table config is updated if its style is removed", async () => {
    await createTableStyle(model, "MyStyle");

    await createTable(model, "A1", { styleId: "MyStyle" });
    expect(model.getters.getTables(sheetId)[0].config.styleId).toEqual("MyStyle");

    await removeTableStyle(model, "MyStyle");
    expect(model.getters.getTables(sheetId)[0].config.styleId).toEqual(
      DEFAULT_TABLE_CONFIG.styleId
    );
  });

  test("Can undo/redo add a table style", async () => {
    await createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    await undo(model);
    expect(() => model.getters.getTableStyle("MyStyle")).toThrow();

    await redo(model);
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });

  test("Can import/export a table style", async () => {
    await createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    const exportedData = model.exportData();
    expect(exportedData.customTableStyles).toMatchObject({ MyStyle: customStyle });

    const importedModel = await createModel(exportedData);
    expect(importedModel.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });
});
