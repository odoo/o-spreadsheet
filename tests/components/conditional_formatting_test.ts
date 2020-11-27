import { Model } from "../../src";
import { toZone } from "../../src/helpers/zones";
import { CommandResult } from "../../src/types";
import "../canvas.mock";
import { setInputValueAndTrigger, triggerMouseEvent } from "../dom_helper";
import {
  createColorScale,
  createEqualCF,
  GridParent,
  makeTestFixture,
  mockUuidV4To,
  nextTick,
} from "../helpers";
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

      midColor: ".o-threshold-midpoint .o-tool.o-dropdown.o-with-color span",
      midType: ".o-threshold-midpoint > select",
      midValue: ".o-threshold-midpoint .o-threshold-value",

      maxColor: ".o-threshold-maximum .o-tool.o-dropdown.o-with-color span",
      maxType: ".o-threshold-maximum > select",
      maxValue: ".o-threshold-maximum .o-threshold-value",

      colorPickerBlue: ".o-color-picker div[data-color='#0000ff']",
      colorPickerOrange: ".o-color-picker div[data-color='#ff9900']",
      colorPickerYellow: ".o-color-picker div[data-color='#ffff00']",
      error: ".o-cf-error",
    },
    cfTabSelector: ".o-cf-type-selector .o-cf-type-tab",
    buttonSave: ".o-sidePanelButtons .o-cf-save",
    buttonDelete: ".o-cf-delete-button",
    buttonAdd: ".o-cf-add",
    closePanel: ".o-sidePanelClose",
  };

  describe("Conditional format list", () => {
    beforeEach(async () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF(["A1:A2"], "2", { fillColor: "#FF0000" }, "1"),
        sheetId: model.getters.getActiveSheetId(),
      });
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "2",
          ["B1:B5"],
          { type: "value", color: 0xff00ff, value: "" },
          { type: "value", color: 0x123456, value: "" }
        ),
        sheetId: model.getters.getActiveSheetId(),
      });
      await nextTick();
    });
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
      expect(previews[0].querySelector(selectors.description.ruletype.values)!.textContent).toBe(
        "2"
      );
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
              value: "",
            },
            minimum: {
              color: 0x0000ff,
              type: "value",
              value: "",
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
          id: "50",
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
      model.dispatch("COPY", { target: [toZone("A1:A2")] });
      model.dispatch("PASTE", { target: [toZone("C1")] });
      await nextTick();
      expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe(
        "A1:A2,C1:C2"
      );
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
  });
  test("can create a new ColorScaleRule with cell values", async () => {
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

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "57",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "value",
          },
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

  test("can create a new ColorScaleRule with fixed values", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10", "input");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "20", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "58",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "number",
            value: "20",
          },
          minimum: {
            color: 0x0000ff,
            type: "number",
            value: "10",
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can create a new ColorScaleRule with percent values", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "percentage", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10", "input");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentage", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "90", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "58",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "percentage",
            value: "90",
          },
          minimum: {
            color: 0x0000ff,
            type: "percentage",
            value: "10",
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can create a new ColorScaleRule with percentile values", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "percentile", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10", "input");
    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentile", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "90", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "58",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "percentile",
            value: "90",
          },
          minimum: {
            color: 0x0000ff,
            type: "percentile",
            value: "10",
          },
          type: "ColorScaleRule",
        },
      },
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can create a new ColorScaleRule with a midpoint", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    triggerMouseEvent(selectors.colorScaleEditor.minColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerBlue, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "0", "input");

    triggerMouseEvent(selectors.colorScaleEditor.midColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerOrange, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "50", "input");

    triggerMouseEvent(selectors.colorScaleEditor.maxColor, "click");
    await nextTick();
    triggerMouseEvent(selectors.colorScaleEditor.colorPickerYellow, "click");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "100", "input");

    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(parent.env.dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "58",
        ranges: ["B2:B5"],
        rule: {
          maximum: {
            color: 0xffff00,
            type: "number",
            value: "100",
          },
          midpoint: {
            color: 0xff9900,
            type: "number",
            value: "50",
          },
          minimum: {
            color: 0x0000ff,
            type: "number",
            value: "0",
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

  test("will not dispatch if minvalue > maxvalue", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "20", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "10", "input");

    let error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error).toBe(null);

    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error!.textContent).toBe("Minimum must be smaller then Maximum");
  });

  test("will show error if minvalue > midvalue", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "60", "input");

    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "50", "input");

    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "10", "input");

    let error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error).toBe(null);

    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error!.textContent).toBe("Minimum must be smaller then Maximum");
  });

  test("will show error if midvalue > maxvalue", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "0", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "50", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "25", "input");
    await nextTick();

    let error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error).toBe(null);

    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error!.textContent).toBe("Midpoint must be smaller then Maximum");
  });

  test("will show error if async formula used", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "formula", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "1", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "2", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "=WAIT(1000)", "input");
    await nextTick();

    let error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error).toBe(null);

    //  click save
    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();

    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error!.textContent).toBe("Some formulas are not supported for the Maxpoint");
  });

  test.each(["", "aaaa", "=SUM(1, 2)"])(
    "will display error if wrong minValue",
    async (invalidValue) => {
      mockUuidV4To("44");

      triggerMouseEvent(selectors.buttonAdd, "click");
      await nextTick();

      triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
      await nextTick();

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, invalidValue, "input");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "25", "input");
      await nextTick();

      let error = document.querySelector(selectors.colorScaleEditor.error);
      expect(error).toBe(null);

      triggerMouseEvent(selectors.buttonSave, "click");
      await nextTick();
      expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
      error = document.querySelector(selectors.colorScaleEditor.error);
      expect(error!.textContent).toBe("The minpoint must be a number");
    }
  );

  test.each(["", "aaaa", "=SUM(1, 2)"])(
    "will display error if wrong midValue",
    async (invalidValue) => {
      mockUuidV4To("44");

      triggerMouseEvent(selectors.buttonAdd, "click");
      await nextTick();

      triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
      await nextTick();

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10", "input");
      setInputValueAndTrigger(selectors.colorScaleEditor.midValue, invalidValue, "input");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "25", "input");
      await nextTick();

      let error = document.querySelector(selectors.colorScaleEditor.error);
      expect(error).toBe(null);

      triggerMouseEvent(selectors.buttonSave, "click");
      await nextTick();
      expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
      error = document.querySelector(selectors.colorScaleEditor.error);
      expect(error!.textContent).toBe("The midpoint must be a number");
    }
  );

  test.each(["", "aaaa", "=SUM(1, 2)"])(
    "will display error if wrong maxValue",
    async (invalidValue) => {
      mockUuidV4To("44");

      triggerMouseEvent(selectors.buttonAdd, "click");
      await nextTick();

      triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
      await nextTick();

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "1", "input");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, invalidValue, "input");
      await nextTick();

      let error = document.querySelector(selectors.colorScaleEditor.error);
      expect(error).toBe(null);

      triggerMouseEvent(selectors.buttonSave, "click");
      await nextTick();
      expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
      error = document.querySelector(selectors.colorScaleEditor.error);
      expect(error!.textContent).toBe("The maxpoint must be a number");
    }
  );

  test("will display error if there is an invalid formula for the min", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "formula", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "formula", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "=SUM(1", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "=SUM(1,2)", "input");
    await nextTick();

    let error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error).toBe(null);

    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error!.textContent).toBe("Invalid Minpoint formula");
  });

  test("will display error if there is an invalid formula for the mid", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "formula", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "1", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "=SUM(1", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "3", "input");
    await nextTick();

    let error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error).toBe(null);

    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error!.textContent).toBe("Invalid Midpoint formula");
  });

  test("will display error if there is an invalid formula for the max", async () => {
    mockUuidV4To("44");

    triggerMouseEvent(selectors.buttonAdd, "click");
    await nextTick();

    triggerMouseEvent(document.querySelectorAll(selectors.cfTabSelector)[1], "click");
    await nextTick();

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "formula", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "formula", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "=SUM(1", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "=SUM(1,2)", "input");
    await nextTick();

    let error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error).toBe(null);

    triggerMouseEvent(selectors.buttonSave, "click");
    await nextTick();
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    error = document.querySelector(selectors.colorScaleEditor.error);
    expect(error!.textContent).toBe("Invalid Maxpoint formula");
  });
});
