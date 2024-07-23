import { CommandResult, TableStyle, TableStyleTemplateName, UID } from "../../src";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { Model } from "../../src/model";
import { createTable, createTableStyle, redo, undo } from "../test_helpers/commands_helpers";
import { getStyle } from "../test_helpers/getters_helpers";

const customStyle: Omit<TableStyle, "category"> = {
  displayName: "MyStyle",
  templateName: "mediumBandedBorders",
  primaryColor: "#FF0000",
};

describe("Table core style plugin", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = Model.BuildSync();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can add a table style", () => {
    createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });

  test("Cannot add invalid table style", () => {
    let result = createTableStyle(model, "MyStyle", {
      templateName: "notAValidTemplate" as TableStyleTemplateName,
    });
    expect(result).toBeCancelledBecause(CommandResult.InvalidTableStyle);

    result = createTableStyle(model, "MyStyle", { primaryColor: "notAValidColor" });
    expect(result).toBeCancelledBecause(CommandResult.InvalidTableStyle);
  });

  test("Can edit an existing table style", () => {
    createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    createTableStyle(model, "MyStyle", {
      templateName: "lightWithHeader",
      primaryColor: "#0f0",
    });
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject({
      templateName: "lightWithHeader",
      primaryColor: "#0f0",
    });
  });

  test("Can remove a table style", () => {
    createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyles()["MyStyle"]).toMatchObject(customStyle);

    model.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: "MyStyle" });
    expect(model.getters.getTableStyles()["MyStyle"]).toBeUndefined();
  });

  test("Editing or removing a table style edit the cell style", () => {
    createTableStyle(model, "MyStyle");
    createTable(model, "A1", { styleId: "MyStyle" });
    expect(getStyle(model, "A1")).toMatchObject({ fillColor: "#FF0000" });

    createTableStyle(model, "MyStyle", {
      templateName: "mediumBandedBorders",
      primaryColor: "#00FF00",
    });
    expect(getStyle(model, "A1")).toMatchObject({ fillColor: "#00FF00" });

    model.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: "MyStyle" });
    expect(getStyle(model, "A1")).toMatchObject({ fillColor: "#346B90" }); // default table style
  });

  test("Table config is updated if its style is removed", () => {
    createTableStyle(model, "MyStyle");

    createTable(model, "A1", { styleId: "MyStyle" });
    expect(model.getters.getTables(sheetId)[0].config.styleId).toEqual("MyStyle");

    model.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: "MyStyle" });
    expect(model.getters.getTables(sheetId)[0].config.styleId).toEqual(
      DEFAULT_TABLE_CONFIG.styleId
    );
  });

  test("Can undo/redo add a table style", () => {
    createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    undo(model);
    expect(() => model.getters.getTableStyle("MyStyle")).toThrow();

    redo(model);
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });

  test("Can import/export a table style", () => {
    createTableStyle(model, "MyStyle");

    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    const exportedData = model.exportData();
    expect(exportedData.customTableStyles).toMatchObject({ MyStyle: customStyle });

    const importedModel = Model.BuildSync(exportedData);
    expect(importedModel.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });
});
