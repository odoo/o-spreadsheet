import { Model, SpreadsheetChildEnv, UID } from "../../src";
import { cellMenuRegistry, figureRegistry } from "../../src/registries";
import {
  createChart,
  createImage,
  createSheet,
  selectCell,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { getCellText } from "../test_helpers/getters_helpers";
import { makeTestEnv } from "../test_helpers/helpers";

let model: Model;
let sheetId: UID;
let env: SpreadsheetChildEnv;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
  createSheet(model, { name: "Sheet3", sheetId: "Sheet3" });
  createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
  env = makeTestEnv({ model });
});

describe("Send figure to sheet menu item", () => {
  test("Send chart to sheet", () => {
    createChart(model, { type: "bar" }, "chartId");
    const menuItems = figureRegistry.get("chart").menuBuilder("chartId", () => {}, env);

    const sendToSheetItem = menuItems.find((item) => item.id === "send_to_sheet");
    expect(sendToSheetItem).toBeDefined();

    const children = sendToSheetItem?.children(env)!;
    expect(children.map((item) => item.name(env))).toEqual(["Sheet2", "Sheet3", "New sheet"]);

    children[1].execute!(env);
    expect(model.getters.getChartIds(sheetId)).toHaveLength(0);
    expect(model.getters.getChartIds("Sheet3")).toHaveLength(1);
  });

  test("Send chart to new sheet", () => {
    createChart(model, { type: "bar" }, "chartId");
    const menuItems = figureRegistry.get("chart").menuBuilder("chartId", () => {}, env);
    const sendToSheetItem = menuItems.find((item) => item.id === "send_to_sheet");
    const children = sendToSheetItem?.children(env)!;

    children[2].execute!(env);
    expect(model.getters.getChartIds(sheetId)).toHaveLength(0);

    const sheetIds = model.getters.getSheetIds();
    expect(sheetIds).toHaveLength(4);
    const newSheetId = sheetIds.find((id) => id !== sheetId && id !== "Sheet2" && id !== "Sheet3")!;
    expect(model.getters.getChartIds(newSheetId)).toHaveLength(1);
  });

  test("Image also have the send_to_sheet menu items", () => {
    createImage(model, { figureId: "imageId" });
    const menuItems = figureRegistry.get("image").menuBuilder("imageId", () => {}, env);

    const sendToSheetItem = menuItems.find((item) => item.id === "send_to_sheet");
    expect(sendToSheetItem).toBeDefined();

    const children = sendToSheetItem?.children(env)!;
    expect(children.map((item) => item.name(env))).toEqual(["Sheet2", "Sheet3", "New sheet"]);
  });
});

describe("Send range to sheet menu item", () => {
  test("Can send a range to a sheet", () => {
    setCellContent(model, "A1", "A");
    setCellContent(model, "A2", "A");
    setCellContent(model, "B2", "B");
    setSelection(model, ["A1:B2"]);

    const menuItem = cellMenuRegistry.getMenuItems().find((item) => item.id === "send_to_sheet")!;

    expect(menuItem).toBeDefined();
    expect(menuItem.isVisible?.(env)).toBe(true);

    const children = menuItem.children?.(env)!;
    expect(children.map((item) => item.name(env))).toEqual(["Sheet2", "Sheet3", "New sheet"]);

    children[1].execute!(env);
    expect(getCellText(model, "A1", sheetId)).toBe("");
    expect(getCellText(model, "B2", sheetId)).toBe("");
    expect(getCellText(model, "A1", "Sheet3")).toBe("A");
    expect(getCellText(model, "B2", "Sheet3")).toBe("B");
    expect(model.getters.getTables("Sheet3")).toHaveLength(1);
  });

  test("Cannot send sing cell to another sheet", () => {
    selectCell(model, "A1");
    const menuItem = cellMenuRegistry.getMenuItems().find((item) => item.id === "send_to_sheet")!;
    expect(menuItem.isVisible?.(env)).toBe(false);
  });
});
