import { Model } from "../../src";
import {
  addDataValidation,
  createTableWithFilter,
  setCellContent,
  setSelection,
  setStyle,
} from "../test_helpers/commands_helpers";
import { click, keyDown } from "../test_helpers/dom_helper";
import { getCellContent, getStyle } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";

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
});

describe("Checkbox component", () => {
  test("can check and uncheck", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    const { fixture } = await mountSpreadsheet({ model });
    await nextTick();
    const checkbox = fixture.querySelector(".o-dv-checkbox input") as HTMLInputElement;
    expect(checkbox?.checked).toBe(false);
    await click(checkbox);
    expect(getCellContent(model, "A1")).toBe("TRUE");
    expect(checkbox?.checked).toBe(true);
    await click(checkbox);
    expect(getCellContent(model, "A1")).toBe("FALSE");
    expect(checkbox?.checked).toBe(false);
  });

  test("can check and uncheck with space key", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    const { fixture } = await mountSpreadsheet({ model });
    await nextTick();
    const checkbox = fixture.querySelector(".o-dv-checkbox input") as HTMLInputElement;
    expect(checkbox?.checked).toBe(false);
    await keyDown({ key: " " });
    expect(getCellContent(model, "A1")).toBe("TRUE");
    expect(checkbox?.checked).toBe(true);
    await keyDown({ key: " " });
    expect(getCellContent(model, "A1")).toBe("FALSE");
    expect(checkbox?.checked).toBe(false);
  });

  test("Can toggle checkbox in selection with space key", async () => {
    const model = new Model();
    addDataValidation(model, "B2:B3", "id", { type: "isBoolean", values: [] });
    const { fixture } = await mountSpreadsheet({ model });
    await nextTick();
    const checkboxB2 = fixture.querySelectorAll(".o-dv-checkbox input")[0] as HTMLInputElement;
    const checkboxB3 = fixture.querySelectorAll(".o-dv-checkbox input")[1] as HTMLInputElement;
    setSelection(model, ["A1:B2"]);
    expect(checkboxB2?.checked).toBe(false);
    expect(checkboxB3?.checked).toBe(false);

    await keyDown({ key: " " });
    expect(getCellContent(model, "B2")).toBe("TRUE");
    expect(getCellContent(model, "B3")).toBe("FALSE");
    expect(checkboxB2?.checked).toBe(true);
    expect(checkboxB3?.checked).toBe(false);
    setSelection(model, ["A1:B3"]);

    await keyDown({ key: " " });
    expect(getCellContent(model, "B2")).toBe("FALSE");
    expect(getCellContent(model, "B3")).toBe("TRUE");
    expect(checkboxB2?.checked).toBe(false);
    expect(checkboxB3?.checked).toBe(true);
    setSelection(model, ["A1"]);

    await keyDown({ key: " " });
    expect(getCellContent(model, "B2")).toBe("FALSE");
    expect(getCellContent(model, "B3")).toBe("TRUE");
    expect(checkboxB2?.checked).toBe(false);
    expect(checkboxB3?.checked).toBe(true);
  });

  test("Data validation checkbox on formula is disabled", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    const { fixture } = await mountSpreadsheet({ model });
    await nextTick();

    expect(fixture.querySelector(".o-dv-checkbox")?.classList).not.toContain("pe-none");
    setCellContent(model, "A1", "=TRUE");
    await nextTick();
    expect(fixture.querySelector(".o-dv-checkbox")?.classList).toContain("pe-none");
  });

  test("Data validation checkbox is disabled in readonly mode", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    model.updateMode("readonly");
    const { fixture } = await mountSpreadsheet({ model });

    expect(fixture.querySelector(".o-dv-checkbox")?.classList).toContain("pe-none");
  });

  test("Icon is not displayed if there is a filter icon", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    createTableWithFilter(model, "A1:A4");

    const { fixture } = await mountSpreadsheet({ model });
    expect(fixture.querySelector(".o-dv-checkbox")).toBeNull();
    expect(fixture.querySelector(".o-filter-icon")).not.toBeNull();
  });
});
