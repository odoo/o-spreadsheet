import { Model, Spreadsheet } from "../../src";
import { DEFAULT_BORDER_DESC } from "../../src/constants";
import {
  addDataValidation,
  click,
  getBorder,
  getCellContent,
  getCellText,
  getStyle,
  setCellContent,
  setFormatting,
  setSelection,
  setZoneBorders,
} from "../test_helpers";
import {
  doAction,
  getDataValidationRules,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";

const selectors = {
  valuesCheckbox: ".o-sidePanel input[name=asValue]",
  formatCheckbox: ".o-sidePanel input[name=onlyFormat]",
  formulaCheckbox: ".o-sidePanel input[name=onlyFormula]",
  bordersCheckbox: ".o-sidePanel input[name=onlyBorders]",
  conditionalFormatCheckbox: ".o-sidePanel input[name=onlyConditionalFormat]",
  dataValidationCheckbox: ".o-sidePanel input[name=onlyDataValidation]",
  transposeCheckbox: ".o-sidePanel input[name=transpose]",
  confirmButton: ".o-sidePanel .o-confirm",
  cancelButton: ".o-sidePanel .o-cancel",
};

describe("special paste side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let parent: Spreadsheet;

  test("can combine several paste options at the same time (values + transpose)", async () => {
    model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "=A1*10");
    ({ parent, fixture } = await mountSpreadsheet({ model }));

    setSelection(model, ["A1:A2"]);
    await doAction(["edit", "copy"], parent.env);

    setSelection(model, ["B1"]);
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.valuesCheckbox);
    await click(fixture, selectors.transposeCheckbox);
    await click(fixture, selectors.confirmButton);

    // pasted as value: the formula in A2 is pasted as its evaluated result
    // pasted transposed: the vertical A1:A2 zone becomes the horizontal B1:C1 zone
    expect(getCellContent(model, "B1")).toBe("1");
    expect(getCellContent(model, "C1")).toBe("10");
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
  });

  test("values and formulas options are mutually exclusive", async () => {
    model = new Model();
    ({ parent, fixture } = await mountSpreadsheet({ model }));
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.valuesCheckbox);
    expect(fixture.querySelector<HTMLInputElement>(selectors.valuesCheckbox)!.checked).toBe(true);

    await click(fixture, selectors.formulaCheckbox);
    expect(fixture.querySelector<HTMLInputElement>(selectors.valuesCheckbox)!.checked).toBe(false);
    expect(fixture.querySelector<HTMLInputElement>(selectors.formulaCheckbox)!.checked).toBe(true);
  });

  test("the format option is independent and can be combined with values or formulas", async () => {
    model = new Model();
    ({ parent, fixture } = await mountSpreadsheet({ model }));
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.valuesCheckbox);
    await click(fixture, selectors.formatCheckbox);
    expect(fixture.querySelector<HTMLInputElement>(selectors.valuesCheckbox)!.checked).toBe(true);
    expect(fixture.querySelector<HTMLInputElement>(selectors.formatCheckbox)!.checked).toBe(true);

    // switching to "formulas" doesn't uncheck "format"
    await click(fixture, selectors.formulaCheckbox);
    expect(fixture.querySelector<HTMLInputElement>(selectors.valuesCheckbox)!.checked).toBe(false);
    expect(fixture.querySelector<HTMLInputElement>(selectors.formulaCheckbox)!.checked).toBe(true);
    expect(fixture.querySelector<HTMLInputElement>(selectors.formatCheckbox)!.checked).toBe(true);
  });

  test("transpose can be combined with any of the other options", async () => {
    model = new Model();
    ({ parent, fixture } = await mountSpreadsheet({ model }));
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.formulaCheckbox);
    await click(fixture, selectors.transposeCheckbox);
    expect(fixture.querySelector<HTMLInputElement>(selectors.formulaCheckbox)!.checked).toBe(true);
    expect(fixture.querySelector<HTMLInputElement>(selectors.transposeCheckbox)!.checked).toBe(
      true
    );
  });

  test("can paste the value together with the format, without the formula", async () => {
    model = new Model();
    setCellContent(model, "A1", "=1+1");
    setFormatting(model, "A1", { bold: true });
    ({ parent, fixture } = await mountSpreadsheet({ model }));

    setSelection(model, ["A1"]);
    await doAction(["edit", "copy"], parent.env);

    setSelection(model, ["B1"]);
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.valuesCheckbox);
    await click(fixture, selectors.formatCheckbox);
    await click(fixture, selectors.confirmButton);

    expect(getCellText(model, "B1")).toBe("2");
    expect(getStyle(model, "B1")).toEqual({ bold: true });
  });

  test("borders, conditional formats and data validation are independent from every other option", async () => {
    model = new Model();
    ({ parent, fixture } = await mountSpreadsheet({ model }));
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.valuesCheckbox);
    await click(fixture, selectors.bordersCheckbox);
    await click(fixture, selectors.conditionalFormatCheckbox);
    await click(fixture, selectors.dataValidationCheckbox);

    expect(fixture.querySelector<HTMLInputElement>(selectors.valuesCheckbox)!.checked).toBe(true);
    expect(fixture.querySelector<HTMLInputElement>(selectors.bordersCheckbox)!.checked).toBe(true);
    expect(
      fixture.querySelector<HTMLInputElement>(selectors.conditionalFormatCheckbox)!.checked
    ).toBe(true);
    expect(fixture.querySelector<HTMLInputElement>(selectors.dataValidationCheckbox)!.checked).toBe(
      true
    );
  });

  test("can paste borders, conditional formats and data validation together, without the cell format", async () => {
    model = new Model();
    setCellContent(model, "A1", "1");
    setFormatting(model, "A1", { bold: true });
    setZoneBorders(model, { position: "bottom" }, ["A1"]);
    addDataValidation(model, "A1", "id", { type: "containsText", values: ["1"] });
    ({ parent, fixture } = await mountSpreadsheet({ model }));

    setSelection(model, ["A1"]);
    await doAction(["edit", "copy"], parent.env);

    setSelection(model, ["C1"]);
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.bordersCheckbox);
    await click(fixture, selectors.dataValidationCheckbox);
    await click(fixture, selectors.confirmButton);

    expect(getCellContent(model, "C1")).toBe("");
    expect(getStyle(model, "C1")).toEqual({});
    expect(getBorder(model, "C1")).toEqual({ bottom: DEFAULT_BORDER_DESC });
    expect(getDataValidationRules(model, model.getters.getActiveSheetId())).toMatchObject([
      { id: "id", ranges: ["A1", "C1"] },
    ]);
  });

  test("can discard the panel without pasting anything", async () => {
    model = new Model();
    setCellContent(model, "A1", "1");
    ({ parent, fixture } = await mountSpreadsheet({ model }));
    setSelection(model, ["A1"]);
    await doAction(["edit", "copy"], parent.env);
    setSelection(model, ["B1"]);
    parent.env.openSidePanel("PasteSpecial");
    await nextTick();

    await click(fixture, selectors.valuesCheckbox);
    await click(fixture, selectors.cancelButton);

    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
    expect(getCellContent(model, "B1")).toBe("");
  });
});
