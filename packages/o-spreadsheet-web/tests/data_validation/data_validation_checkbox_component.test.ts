import { Model } from "../../src";
import { CHECKBOX_CHECKED, CHECKBOX_UNCHECKED } from "../../src/components/icons/icons";
import {
  addDataValidation,
  createTableWithFilter,
  setCellContent,
  setSelection,
  setStyle,
} from "../test_helpers/commands_helpers";
import { clickGridIcon, keyDown } from "../test_helpers/dom_helper";
import { getCellContent, getCellIcons, getStyle } from "../test_helpers/getters_helpers";
import { mountSpreadsheet } from "../test_helpers/helpers";

describe("Checkbox in model", () => {
  let model: Model;

  beforeEach(async () => {
    model = new Model();
  });

  test("Adding a checkbox rule will make its cells align middle/center", () => {
    addDataValidation(model, "A1:A2", "id", { type: "isBoolean", values: [] });
    expect(getStyle(model, "A1")).toMatchObject({ align: "center", verticalAlign: "middle" });
    expect(getStyle(model, "A2")).toMatchObject({ align: "center", verticalAlign: "middle" });
  });

  test("Adding a checkbox rule no not overwrite the style of the cell", () => {
    setStyle(model, "A1", { align: "left", verticalAlign: "top" });
    setStyle(model, "A2", { fillColor: "#FF0000" });
    addDataValidation(model, "A1:A2", "id", { type: "isBoolean", values: [] });
    expect(getStyle(model, "A1")).toMatchObject({ align: "left", verticalAlign: "top" });
    expect(getStyle(model, "A2")).toMatchObject({
      fillColor: "#FF0000",
      align: "center",
      verticalAlign: "middle",
    });
  });

  test("Icon is not displayed if there is a filter icon", () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    createTableWithFilter(model, "A1:A4");

    const icons = getCellIcons(model, "A1");
    expect(icons).toHaveLength(1);
    expect(icons[0].type).toEqual("filter_icon");
  });
});

describe("Checkbox component", () => {
  test("can check and uncheck with click", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    await mountSpreadsheet({ model });
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_UNCHECKED);
    await clickGridIcon(model, "A1");
    expect(getCellContent(model, "A1")).toBe("TRUE");
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_CHECKED);
    await clickGridIcon(model, "A1");
    expect(getCellContent(model, "A1")).toBe("FALSE");
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_UNCHECKED);
  });

  test("can check and uncheck with space key", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    await mountSpreadsheet({ model });
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_UNCHECKED);
    await keyDown({ key: " " });
    expect(getCellContent(model, "A1")).toBe("TRUE");
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_CHECKED);
    await keyDown({ key: " " });
    expect(getCellContent(model, "A1")).toBe("FALSE");
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_UNCHECKED);
  });

  test("Can toggle checkbox in selection with space key", async () => {
    const model = new Model();
    addDataValidation(model, "B2:B3", "id", { type: "isBoolean", values: [] });
    await mountSpreadsheet({ model });
    setSelection(model, ["A1:B2"]);
    expect(getCellIcons(model, "B2")[0].svg).toEqual(CHECKBOX_UNCHECKED);
    expect(getCellIcons(model, "B3")[0].svg).toEqual(CHECKBOX_UNCHECKED);

    await keyDown({ key: " " });
    expect(getCellContent(model, "B2")).toBe("TRUE");
    expect(getCellContent(model, "B3")).toBe("FALSE");
    expect(getCellIcons(model, "B2")[0].svg).toEqual(CHECKBOX_CHECKED);
    expect(getCellIcons(model, "B3")[0].svg).toEqual(CHECKBOX_UNCHECKED);
    setSelection(model, ["A1:B3"]);

    await keyDown({ key: " " });
    expect(getCellContent(model, "B2")).toBe("FALSE");
    expect(getCellContent(model, "B3")).toBe("TRUE");
    expect(getCellIcons(model, "B2")[0].svg).toEqual(CHECKBOX_UNCHECKED);
    expect(getCellIcons(model, "B3")[0].svg).toEqual(CHECKBOX_CHECKED);
    setSelection(model, ["A1"]);

    await keyDown({ key: " " });
    expect(getCellContent(model, "B2")).toBe("FALSE");
    expect(getCellContent(model, "B3")).toBe("TRUE");
    expect(getCellIcons(model, "B2")[0].svg).toEqual(CHECKBOX_UNCHECKED);
    expect(getCellIcons(model, "B3")[0].svg).toEqual(CHECKBOX_CHECKED);
  });

  test("Data validation checkbox on formula is disabled", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    setCellContent(model, "A1", "=TRUE");
    await mountSpreadsheet({ model });

    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_CHECKED);
    await clickGridIcon(model, "A1");
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_CHECKED);
  });

  test("Data validation checkbox is disabled in readonly mode", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    model.updateMode("readonly");
    await mountSpreadsheet({ model });

    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_UNCHECKED);
    await clickGridIcon(model, "A1");
    expect(getCellIcons(model, "A1")[0].svg).toEqual(CHECKBOX_UNCHECKED);
  });
});
