import { TableStyle } from "../../src";
import { DEFAULT_TABLE_CONFIG, TABLE_PRESETS } from "../../src/helpers/table_presets";
import { Model } from "../../src/model";
import { redo, undo } from "../test_helpers/commands_helpers";

const customStyle: TableStyle = {
  category: "custom",
  wholeTable: { style: { fillColor: "#f00" } },
};

describe("Table core style plugin", () => {
  let model: Model;

  beforeEach(() => {
    model = new Model();
  });

  test("Can add a table style", () => {
    model.dispatch("CREATE_TABLE_STYLE", {
      tableStyleId: "MyStyle",
      tableStyle: customStyle,
    });
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });

  test("Can edit an existing table style", () => {
    model.dispatch("CREATE_TABLE_STYLE", {
      tableStyleId: "MyStyle",
      tableStyle: customStyle,
    });
    expect(model.getters.getTableStyle("MyStyle").wholeTable?.style?.fillColor).toEqual("#f00");

    model.dispatch("CREATE_TABLE_STYLE", {
      tableStyleId: "MyStyle",
      tableStyle: {
        category: "custom",
        wholeTable: { style: { fillColor: "#0f0" } },
      },
    });
    expect(model.getters.getTableStyle("MyStyle").wholeTable?.style?.fillColor).toEqual("#0f0");
  });

  test("Can undo/redo add a table style", () => {
    model.dispatch("CREATE_TABLE_STYLE", {
      tableStyleId: "MyStyle",
      tableStyle: customStyle,
    });
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    undo(model);
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(
      TABLE_PRESETS[DEFAULT_TABLE_CONFIG.styleId]
    );

    redo(model);
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });

  test("Can import/export a table style", () => {
    model.dispatch("CREATE_TABLE_STYLE", {
      tableStyleId: "MyStyle",
      tableStyle: customStyle,
    });
    expect(model.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);

    const exportedData = model.exportData();
    expect(exportedData.customTableStyles).toEqual({ MyStyle: customStyle });

    const importedModel = new Model(exportedData);
    expect(importedModel.getters.getTableStyle("MyStyle")).toMatchObject(customStyle);
  });
});
