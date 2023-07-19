import { Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { UID } from "../../src/types";
import { addDataValidation, setCellContent, setStyle } from "../test_helpers/commands_helpers";
import { click, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getStyle } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { MockGridRenderingContext } from "../test_helpers/renderer_helpers";

describe("Checkbox overlay", () => {
  let fixture: HTMLElement;
  let model: Model;
  let sheetId: UID;

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    ({ fixture, model } = await mountSpreadsheet({ model }));
  });

  test("Clicking on the checkbox changes the cell content", async () => {
    addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
    await nextTick();

    const checkbox = fixture.querySelector<HTMLInputElement>(".o-dv-checkbox")!;
    expect(model.getters.getCell({ sheetId, col: 1, row: 1 })?.content).toBe("");
    expect(checkbox.checked).toBe(false);

    await click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(model.getters.getCell({ sheetId, col: 1, row: 1 })?.content).toBe("true");

    await click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(model.getters.getCell({ sheetId, col: 1, row: 1 })?.content).toBe("false");
  });

  test("Checkboxes on formula cells have the right value but are disabled", async () => {
    addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
    setCellContent(model, "A1", "TRUE");
    setCellContent(model, "B2", "=A1");
    await nextTick();

    const checkbox = fixture.querySelector<HTMLInputElement>(".o-dv-checkbox")!;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.classList).toContain("pe-none");
  });

  test("Clicking on the checkbox also selects the cell", async () => {
    addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
    await nextTick();

    const checkbox = fixture.querySelector<HTMLInputElement>(".o-dv-checkbox")!;
    triggerMouseEvent(checkbox, "mousedown", DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);

    expect(model.getters.getSelectedZone()).toEqual(toZone("B2"));
  });
});

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

  describe("renderer", () => {
    let renderedTexts: string[];
    let ctx: MockGridRenderingContext;

    beforeEach(() => {
      renderedTexts = [];
      ctx = new MockGridRenderingContext(model, 1000, 1000, {
        onFunctionCall: (fn, args) => {
          if (fn === "fillText") {
            renderedTexts.push(args[0]);
          }
        },
      });
    });

    test("Valid checkbox value is not rendered", () => {
      addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
      setCellContent(model, "B2", "TRUE");
      model.drawGrid(ctx);
      expect(renderedTexts).not.toContain("TRUE");
    });

    test("Invalid checkbox value is rendered", () => {
      addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
      setCellContent(model, "B2", "hello");
      model.drawGrid(ctx);
      expect(renderedTexts).toContain("hello");
    });
  });
});
