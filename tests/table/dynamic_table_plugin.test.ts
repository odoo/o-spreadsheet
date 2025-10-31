import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { UID } from "../../src/types";
import {
  copy,
  createDynamicTable,
  createTable,
  cut,
  deleteTable,
  duplicateSheet,
  paste,
  setCellContent,
  setFormat,
  updateFilter,
  updateTableConfig,
  updateTableZone,
} from "../test_helpers/commands_helpers";
import { getCellStyle, getTables } from "../test_helpers/getters_helpers";
import {
  getExportedExcelData,
  getFilterHiddenValues,
  setGrid,
  toCellPosition,
} from "../test_helpers/helpers";
import { addPivot, updatePivot } from "../test_helpers/pivot_helpers";

let model: Model;
let sheetId: UID;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

describe("Dynamic tables", () => {
  test("Can create a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(3)");
    createDynamicTable(model, "A1");

    expect(model.getters.getCoreTables(sheetId)[0]).toMatchObject({
      range: { zone: toZone("A1") },
      type: "dynamic",
    });
    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A1:C3" });
  });

  test("Can update a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(3)");
    createDynamicTable(model, "A1");
    updateTableConfig(model, "A1", { styleId: "TableStyleMedium12" });
    expect(getTables(model, sheetId)[0]).toMatchObject({
      config: { styleId: "TableStyleMedium12" },
    });
  });

  test("Can duplicate a sheet with a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(3)");
    createDynamicTable(model, "A1");
    duplicateSheet(model, sheetId, "Sheet2Id");

    expect(model.getters.getCoreTables("Sheet2Id")).toMatchObject([
      { range: { zone: toZone("A1") }, type: "dynamic" },
    ]);
    expect(getTables(model, "Sheet2Id")[0]).toMatchObject({ zone: "A1:C3" });
  });

  test("Can change a static table to a dynamic one", () => {
    setCellContent(model, "C1", "=MUNIT(2)");
    createTable(model, "A1:A3");

    const table = model.getters.getCoreTables(sheetId)[0];
    expect(table).toMatchObject({ range: { zone: toZone("A1:A3") }, type: "static" });

    updateTableZone(model, "A1:A3", "C1", "dynamic");
    expect(model.getters.getCoreTables(sheetId)).toHaveLength(1);
    expect(model.getters.getCoreTables(sheetId)[0]).toMatchObject({
      id: table.id,
      range: { zone: toZone("C1") },
      type: "dynamic",
    });
    expect(getTables(model, sheetId)).toHaveLength(1);
    expect(getTables(model, sheetId)[0]).toMatchObject({
      id: table.id,
      zone: "C1:D2",
    });
  });

  test("Can change a dynamic table to a static one", () => {
    setCellContent(model, "A1", "=MUNIT(2)");
    createDynamicTable(model, "A1");

    const table = model.getters.getCoreTables(sheetId)[0];
    expect(table).toMatchObject({ range: { zone: toZone("A1") }, type: "dynamic" });

    updateTableZone(model, "A1:B2", "C1:C3", "static");
    expect(model.getters.getCoreTables(sheetId)).toHaveLength(1);
    expect(model.getters.getCoreTables(sheetId)[0]).toMatchObject({
      id: table.id,
      range: { zone: toZone("C1:C3") },
      type: "static",
    });
    expect(getTables(model, sheetId)).toHaveLength(1);
    expect(getTables(model, sheetId)[0]).toMatchObject({
      id: table.id,
      zone: "C1:C3",
    });
  });

  test("Dynamic tables cannot overlap with static tables", () => {
    setCellContent(model, "A1", "=MUNIT(3)");
    createDynamicTable(model, "A1");
    createTable(model, "C2:C3");
    expect(getTables(model, sheetId)).toMatchObject([{ zone: "C2:C3" }, { zone: "A1:B3" }]);
  });

  test("Can delete a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(3)");
    createDynamicTable(model, "A1");
    expect(getTables(model, sheetId)).toHaveLength(1);
    deleteTable(model, "A1");
    expect(getTables(model, sheetId)).toHaveLength(0);
  });

  test("Can update the filter of a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(2)");
    createDynamicTable(model, "A1", { hasFilters: true });
    updateFilter(model, "A1", ["0"]);
    updateFilter(model, "B1", ["1"]);
    expect(getFilterHiddenValues(model)).toMatchObject([
      { value: ["0"], zone: "A1:A2" },
      { value: ["1"], zone: "B1:B2" },
    ]);
    expect(model.getters.isRowHidden(sheetId, 1)).toBe(true);
  });

  test("Dynamic table is updated when formula result changes", () => {
    setCellContent(model, "C10", "2");
    setCellContent(model, "A1", "=MUNIT(C10)");
    createDynamicTable(model, "A1");

    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A1:B2" });
    expect(model.getters.getCellTableStyle(toCellPosition(sheetId, "C3"))).toBeUndefined();

    setCellContent(model, "C10", "3");
    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A1:C3" });
    expect(model.getters.getCellTableStyle(toCellPosition(sheetId, "C3"))).not.toBeUndefined();
  });

  test("Dynamic table is updated when cell is in error", () => {
    setCellContent(model, "C10", "2");
    setCellContent(model, "A1", "=MUNIT(C10)");
    createDynamicTable(model, "A1");

    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A1:B2" });

    setCellContent(model, "A2", "this will prevent the array formula to be spread");
    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A1" });

    setCellContent(model, "A2", "");
    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A1:B2" });

    setCellContent(model, "C10", "=0/0");
    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A1" });
  });

  test("Dynamic tables are updated when format changes", () => {
    setCellContent(model, "A2", '=MUNIT(IF(CELL("format",A1)="0.00%",3,2))');
    createDynamicTable(model, "A2");
    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A2:B3" });

    setFormat(model, "A1", "0.00%");
    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A2:C4" });
  });

  test("Can copy/paste a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(2)");
    createDynamicTable(model, "A1");

    copy(model, "A1");
    paste(model, "D1");

    expect(getTables(model, sheetId)).toMatchObject([{ zone: "A1:B2" }, { zone: "D1:E2" }]);
  });

  test("Can cut/paste a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(2)");
    createDynamicTable(model, "A1");

    cut(model, "A1");
    paste(model, "D1");

    expect(getTables(model, sheetId)).toMatchObject([{ zone: "D1:E2" }]);
  });

  test("Can copy/paste a cell of a dynamic table", () => {
    setCellContent(model, "A1", "=MUNIT(2)");
    createDynamicTable(model, "A1");
    updateTableConfig(model, "A1", { styleId: "TableStyleDark11" });

    copy(model, "B1");
    paste(model, "D1");

    expect(model.getters.getTable({ sheetId, col: 3, row: 0 })).toBeUndefined();
    expect(getCellStyle(model, "D1")).toMatchObject(
      model.getters.getCellComputedStyle(toCellPosition(sheetId, "B1"))
    );
  });

  describe("Import/export", () => {
    test("Can export and import dynamic tables", () => {
      setCellContent(model, "A1", "=MUNIT(2)");
      createDynamicTable(model, "A1");

      const exported = model.exportData();
      expect(exported.sheets[0].tables).toMatchObject([{ range: "A1", type: "dynamic" }]);

      const newModel = new Model(exported);
      expect(newModel.getters.getCoreTables(sheetId)).toMatchObject([
        { range: { zone: toZone("A1") }, type: "dynamic" },
      ]);
      expect(getTables(model, sheetId)).toMatchObject([{ zone: "A1:B2" }]);
    });

    test("Dynamic tables are transformed into static tables when exporting for excel", async () => {
      setCellContent(model, "A1", "=MUNIT(3)");
      createDynamicTable(model, "A1");

      const exported = await getExportedExcelData(model);
      expect(exported.sheets[0].tables).toMatchObject([{ range: "A1:C3" }]);
    });
  });

  describe("Pivots", () => {
    beforeEach(() => {
      const grid = { A1: "Price", A2: "10", A3: "=PIVOT(1)" };
      setGrid(model, grid);
      addPivot(model, "A1:A2", {
        measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      });
    });

    test("A pivot formula with style does create a dynamic table", () => {
      expect(getTables(model, sheetId)).toHaveLength(0);

      updatePivot(model, "1", { style: { tableStyleId: "PivotTableStyleMedium9" } });
      expect(getTables(model, sheetId)).toHaveLength(1);
      expect(getTables(model, sheetId)[0]).toMatchObject({
        config: { styleId: "PivotTableStyleMedium9" },
        zone: "A3:B5",
      });
    });

    test("A single pivot can generate multiple tables", () => {
      expect(getTables(model, sheetId)).toHaveLength(0);

      updatePivot(model, "1", { style: { tableStyleId: "PivotTableStyleMedium9" } });
      setCellContent(model, "E25", "=PIVOT(1)");
      const tables = getTables(model, sheetId);
      expect(tables).toHaveLength(2);
      expect(tables[0]).toMatchObject({
        config: { styleId: "PivotTableStyleMedium9" },
        zone: "A3:B5",
      });
      expect(tables[1]).toMatchObject({
        config: { styleId: "PivotTableStyleMedium9" },
        zone: "E25:F27",
        id: expect.not.stringMatching(tables[0].id),
      });
    });

    test("Table from pivot takes precedence over standard dynamic table", () => {
      createDynamicTable(model, "A3", { styleId: "TableStyleMedium2" });
      expect(getTables(model, sheetId)[0]).toMatchObject({
        config: { styleId: "TableStyleMedium2" },
        zone: "A3:B5",
      });

      updatePivot(model, "1", { style: { tableStyleId: "PivotTableStyleMedium9" } });
      expect(getTables(model, sheetId)).toHaveLength(1);
      expect(getTables(model, sheetId)[0]).toMatchObject({
        config: { styleId: "PivotTableStyleMedium9" },
        zone: "A3:B5",
      });
    });

    test("Tables from pivots are not exported", async () => {
      updatePivot(model, "1", { style: { tableStyleId: "PivotTableStyleMedium9" } });
      expect(getTables(model, sheetId)).toHaveLength(1);

      expect(model.exportData().sheets[0].tables).toHaveLength(0);
      // TODO: pivot table style should somehow be exported to Excel
      expect((await getExportedExcelData(model)).sheets[0].tables).toHaveLength(0);
    });
  });
});
