import { CommandResult } from "../../src/types";
import { triggerMouseEvent, setInputValueAndTrigger } from "../dom_helper";
import {
  GridParent,
  makeTestFixture,
  createEqualCF,
  createColorScale,
  mockUuidV4To,
  target,
  nextTick,
} from "../helpers";
import "../canvas.mock";
import { Model } from "../../src";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;

beforeEach(() => {
  model = new Model();
});

describe("UI of conditional formats", () => {
  let fixture: HTMLElement;
  let parent: GridParent;

  beforeEach(async () => {
    fixture = makeTestFixture();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["A1:A2"], "2", { fillColor: "#FF0000" }, "1"),
      sheetId: model.getters.getActiveSheetId(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createColorScale(
        "2",
        ["B1:B5"],
        { type: "value", color: 0xff00ff },
        { type: "value", color: 0x123456 }
      ),
      sheetId: model.getters.getActiveSheetId(),
    });
    parent = new GridParent(model);
    await parent.mount(fixture);

    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
  });

  afterEach(() => {
    fixture.remove();
    parent.destroy();
  });

  const selectors = {
    listPreview: ".o-cf .o-cf-preview",
    ruleEditor: {
      range: ".o-cf .o-cf-ruleEditor .o-cf-range input",
      editor: {
        operatorInput: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-cell-is-operator",
        valueInput: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-cell-is-value",
        bold: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools div.o-tool[title='Bold']",
        italic: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools div.o-tool[title='Italic']",
        strikethrough:
          ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools div.o-tool[title='Strikethrough']",
        colorDropdown:
          ".o-cf .o-cf-ruleEditor .o-cf-editor .o-tools .o-tool.o-dropdown.o-with-color span",
      },
    },
    previewImage: ".o-cf-preview-image",
    description: {
      ruletype: {
        rule: ".o-cf-preview-description-rule",
        values: ".o-cf-preview-description-values",
      },
      range: ".o-cf-preview-range",
    },
    colorScaleEditor: {
      minColor: ".o-threshold-minimum .o-tool.o-dropdown.o-with-color span",
      minType: ".o-threshold-minimum > select",
      minValue: ".o-threshold-minimum .o-threshold-value",
      maxColor: ".o-threshold-maximum .o-tool.o-dropdown.o-with-color span",
      maxType: ".o-threshold-maximum > select",
      maxValue: ".o-threshold-maximum .o-threshold-value",
      colorPickerBlue: ".o-color-picker div[data-color='#0000ff']",
      colorPickerYellow: ".o-color-picker div[data-color='#ffff00']",
    },
    cfTabSelector: ".o-cf-type-selector .o-cf-type-tab",
    buttonSave: ".o-sidePanelButtons .o-cf-save",
    buttonDelete: ".o-cf-delete-button",
    buttonAdd: ".o-cf-add",
    closePanel: ".o-sidePanelClose",
  };

  test("simple snapshot", () => {
    expect(fixture.querySelector(".o-sidePanel")!).toMatchSnapshot();
  });

  test("the list of CF has a correct preview", () => {
    // check the html of the list (especially the colors)
    let previews = document.querySelectorAll(selectors.listPreview);
    expect(previews).toHaveLength(2);

    // --> should be the style for CellIsRule
    expect(previews[0].querySelector(selectors.description.ruletype.rule)!.textContent).toBe(
      "Is equal to"
    );
    expect(previews[0].querySelector(selectors.description.ruletype.values)!.textContent).toBe("2");
    expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2");
    expect(
      window.getComputedStyle(previews[0].querySelector(selectors.previewImage)!).backgroundColor
    ).toBe("rgb(255, 0, 0)");

    // --> should be a nothing of color gradient for ColorScaleRule
    expect(previews[1].querySelector(selectors.description.range)!.textContent).toBe("B1:B5");
    expect(
      window.getComputedStyle(previews[1].querySelector(selectors.previewImage)!).backgroundColor
    ).toBe("");
    // TODO VSC: see how we can test the gradient background image
  });

  test("can edit an existing CellIsRule", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[0], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "change");
    setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "input");
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
    setInputValueAndTrigger(selectors.ruleEditor.editor.valueInput, "3", "input");

    triggerMouseEvent(selectors.ruleEditor.editor.bold, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.italic, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.strikethrough, "click");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "1",
        ranges: ["A1:A3"],
        rule: {
          operator: "BeginsWith",
          stopIfTrue: false,
          style: { bold: true, fillColor: "#FF0000", italic: true, strikethrough: true },
          type: "CellIsRule",
          values: ["3", ""],
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("the preview should be bold when the rule is bold", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));

    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF(["C1:C5"], "2", { bold: true, fillColor: "#ff0000" }, "99"),
      sheetId: model.getters.getActiveSheetId(),
    });

    await nextTick();

    let previews = document.querySelectorAll(selectors.listPreview);
    let line = previews[2].querySelector(selectors.previewImage);
    expect(line!.getAttribute("style")).toMatch("font-weight:bold;");
  });

  test("can edit an existing ColorScaleRule", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[1], "click");
    await nextTick();
    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");

    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "33", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "2",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "value",
          },
          midpoint: undefined,
          minimum: {
            color: 0x0000ff,
            type: "value",
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("toggle color-picker", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[0], "click");
    await nextTick();
    triggerMouseEvent(selectors.ruleEditor.editor.colorDropdown, "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
    triggerMouseEvent(selectors.ruleEditor.editor.colorDropdown, "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
  });

  test("color-picker closes when click elsewhere", async () => {
    triggerMouseEvent(document.querySelectorAll(selectors.listPreview)[0], "click");
    await nextTick();
    triggerMouseEvent(selectors.ruleEditor.editor.colorDropdown, "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
    triggerMouseEvent(".o-cf-preview-line", "click");
    await nextTick();
    expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
  });

  test("can create a new CellIsRule", async () => {
    mockUuidV4To("42");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "change");
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
    setInputValueAndTrigger(selectors.ruleEditor.editor.valueInput, "3", "input");

    triggerMouseEvent(selectors.ruleEditor.editor.bold, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.italic, "click");
    triggerMouseEvent(selectors.ruleEditor.editor.strikethrough, "click");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "47",
        ranges: ["A1:A3"],
        rule: {
          operator: "BeginsWith",
          stopIfTrue: false,
          style: { bold: true, fillColor: "#FF0000", italic: true, strikethrough: true },
          type: "CellIsRule",
          values: ["3", ""],
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("displayed range is updated if range changes", async () => {
    const previews = document.querySelectorAll(selectors.listPreview);
    expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2");
    model.dispatch("COPY", { target: target("A1:A2") });
    model.dispatch("PASTE", { target: target("C1") });
    await nextTick();
    expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2,C1:C2");
  });

  test("can delete Rule", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    const previews = document.querySelectorAll(selectors.listPreview);
    triggerMouseEvent(previews[0].querySelector(selectors.buttonDelete), "click");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("REMOVE_CONDITIONAL_FORMAT", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can create a new ColorScaleRule", async () => {
    mockUuidV4To("43");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");

    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "33", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "51",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "value",
          },
          midpoint: undefined,
          minimum: {
            color: 0x0000ff,
            type: "value",
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("Make a multiple selection, open CF panel, create a rule => Should create one line per selection", async () => {
    triggerMouseEvent(selectors.closePanel, "click");
    await nextTick();
    const zone1 = { bottom: 1, left: 1, right: 1, top: 1 };
    const zone2 = { bottom: 2, left: 2, right: 2, top: 2 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1, zone2],
    });
    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();
    const ranges = document.querySelectorAll(selectors.ruleEditor.range);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]["value"]).toBe("B2");
    expect(ranges[1]["value"]).toBe("C3");
  });

  test("Open CF panel, make a multiple selection, open CF panel, create a rule => Should create one line per selection", async () => {
    const zone1 = { bottom: 1, left: 1, right: 1, top: 1 };
    const zone2 = { bottom: 2, left: 2, right: 2, top: 2 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1, zone2],
    });
    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();
    const ranges = document.querySelectorAll(selectors.ruleEditor.range);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]["value"]).toBe("B2");
    expect(ranges[1]["value"]).toBe("C3");
  });

  test("switching sheet changes the content of CF and cancels the edition", async () => {});
});
