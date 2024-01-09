import { Model, Spreadsheet } from "../../src";
import { toZone } from "../../src/helpers/zones";
import { ConditionalFormatPlugin } from "../../src/plugins/core/conditional_format";
import { CommandResult } from "../../src/types";
import {
  activateSheet,
  copy,
  createSheet,
  paste,
  setSelection,
} from "../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import {
  createColorScale,
  createEqualCF,
  getPlugin,
  mockUuidV4To,
  mountSpreadsheet,
  nextTick,
  spyDispatch,
  textContentAll,
  toRangesData,
} from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;

describe("UI of conditional formats", () => {
  let fixture: HTMLElement;
  let parent: Spreadsheet;

  beforeEach(async () => {
    ({ parent, model, fixture } = await mountSpreadsheet());
    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
  });

  function errorMessages(): string[] {
    return textContentAll(selectors.error);
  }

  const selectors = {
    listPreview: ".o-cf .o-cf-preview",
    ruleEditor: {
      range: ".o-cf .o-cf-ruleEditor .o-cf-range .o-range input",
      editor: {
        operatorInput: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-cell-is-operator",
        valueInput: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-cell-is-value",
        bold: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-tool[title='Bold']",
        italic: ".o-cf .o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-tool[title='Italic']",
        underline:
          ".o-cf .o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-tool[title='Underline']",
        strikethrough:
          ".o-cf .o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-tool[title='Strikethrough']",
        colorDropdown:
          ".o-cf .o-cf-ruleEditor .o-cf-editor .o-color-picker-widget .o-color-picker-button",
        iconSetRule: {
          container: ".o-cf .o-cf-iconset-rule",
          iconsets: ".o-cf .o-cf-iconset-rule .o-cf-iconsets .o-cf-iconset",
          inflextion: ".o-cf .o-cf-iconset-rule .o-inflection",
          icons: ".o-cf .o-cf-iconset-rule .o-inflection .o-cf-icon",
          reverse: ".o-cf .o-cf-iconset-rule .o-cf-iconset-reverse",
          rows: ".o-cf .o-cf-iconset-rule .o-inflection tr",
        },
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
      minColor: ".o-threshold-minimum .o-color-picker-widget .o-color-picker-button",
      minType: ".o-threshold-minimum > select",
      minValue: ".o-threshold-minimum .o-threshold-value",

      midColor: ".o-threshold-midpoint .o-color-picker-widget .o-color-picker-button",
      midType: ".o-threshold-midpoint > select",
      midValue: ".o-threshold-midpoint .o-threshold-value",

      maxColor: ".o-threshold-maximum .o-color-picker-widget .o-color-picker-button",
      maxType: ".o-threshold-maximum > select",
      maxValue: ".o-threshold-maximum .o-threshold-value",

      colorPickerBlue: ".o-color-picker div[data-color='#0000FF']",
      colorPickerOrange: ".o-color-picker div[data-color='#FF9900']",
      colorPickerYellow: ".o-color-picker div[data-color='#FFFF00']",
    },
    cfReorder: {
      buttonUp: ".o-cf-reorder-button-up",
      buttonDown: ".o-cf-reorder-button-down",
    },
    cfTabSelector: ".o-cf-type-selector .o_form_label",
    buttonSave: ".o-sidePanelButtons .o-cf-save",
    buttonDelete: ".o-cf-delete-button",
    buttonCancel: ".o-sidePanelButtons .o-cf-cancel",
    buttonAdd: ".o-cf-add",
    buttonReoder: ".o-cf-reorder",
    buttonExitReorder: ".o-cf-exit-reorder",
    error: ".o-cf-error",
    closePanel: ".o-sidePanelClose",
  };

  describe("Conditional format list", () => {
    beforeEach(async () => {
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
        sheetId: model.getters.getActiveSheetId(),
        ranges: toRangesData(sheetId, "A1:A2"),
      });
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createColorScale(
          "2",
          { type: "value", color: 0xff00ff, value: "" },
          { type: "value", color: 0x123456, value: "" }
        ),
        ranges: toRangesData(sheetId, "B1:B5"),
        sheetId,
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
        "Is equal to 2"
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
      await click(fixture.querySelectorAll(selectors.listPreview)[0]);
      await nextTick();

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "change");
      setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "input");
      setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
      setInputValueAndTrigger(selectors.ruleEditor.editor.valueInput, "3", "input");

      await click(fixture, selectors.ruleEditor.editor.bold);
      await click(fixture, selectors.ruleEditor.editor.italic);
      await click(fixture, selectors.ruleEditor.editor.underline);
      await click(fixture, selectors.ruleEditor.editor.strikethrough);

      const dispatch = spyDispatch(parent);
      //  click save
      await click(fixture, selectors.buttonSave);

      const sheetId = model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenNthCalledWith(1, "ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "1",
          rule: {
            operator: "BeginsWith",
            style: {
              bold: true,
              fillColor: "#FF0000",
              italic: true,
              strikethrough: true,
              underline: true,
            },
            type: "CellIsRule",
            values: ["3"],
          },
        },
        ranges: toRangesData(sheetId, "A1:A3"),
        sheetId,
      });
    });

    test("CellIsRule editor displays the right preview", async () => {
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF(
          "2",
          {
            fillColor: "#FFA500",
            textColor: "#ffff00",
            italic: true,
            bold: true,
            strikethrough: true,
          },
          "1"
        ),
        sheetId: model.getters.getActiveSheetId(),
        ranges: toRangesData(sheetId, "A1:A2"),
      });
      // let the sidePanel reload the CF values
      await nextTick();
      await click(fixture.querySelectorAll(selectors.listPreview)[0]);
      await nextTick();

      const previewLine = document.querySelector(".o-cf-preview-line")! as HTMLDivElement;
      const style = window.getComputedStyle(previewLine);
      expect(previewLine.textContent).toBe("Preview text");
      expect(style.color).toBe("rgb(255, 255, 0)");
      expect(style.backgroundColor).toBe("rgb(255, 165, 0)");
      expect(style.fontWeight).toBe("bold");
      expect(style.fontStyle).toBe("italic");
      expect(style.textDecoration).toBe("line-through");
    });

    test("the list preview should be bold when the rule is bold", async () => {
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("2", { bold: true, fillColor: "#ff0000" }, "99"),
        ranges: toRangesData(sheetId, "C1:C5"),
        sheetId,
      });

      await nextTick();

      let previews = document.querySelectorAll(selectors.listPreview);
      let line = previews[2].querySelector(selectors.previewImage);
      expect(line!.getAttribute("style")).toMatch("font-weight:bold;");
    });

    test("can edit an existing ColorScaleRule", async () => {
      await click(fixture.querySelectorAll(selectors.listPreview)[1]);
      await nextTick();
      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "input");

      await click(fixture, selectors.colorScaleEditor.minColor);
      await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
      await click(fixture, selectors.colorScaleEditor.maxColor);
      await click(fixture, selectors.colorScaleEditor.colorPickerYellow);

      const dispatch = spyDispatch(parent);
      //  click save
      await click(fixture, selectors.buttonSave);

      const sheetId = model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenNthCalledWith(1, "ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "2",
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
        ranges: toRangesData(sheetId, "B2:B5"),
        sheetId,
      });
    });

    test("toggle color-picker", async () => {
      await click(fixture.querySelectorAll(selectors.listPreview)[0]);
      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.colorDropdown)[0]);
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.colorDropdown)[0]);
      expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
    });

    test("color-picker closes when click elsewhere", async () => {
      await click(fixture.querySelectorAll(selectors.listPreview)[0]);
      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.colorDropdown)[0]);
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
      await click(fixture, ".o-cf-preview-line");
      expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
    });

    test("can create a new CellIsRule", async () => {
      mockUuidV4To(model, "42");
      await click(fixture, selectors.buttonAdd);
      await nextTick();

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3", "input");
      setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.ruleEditor.editor.valueInput, "3", "input");

      await click(fixture, selectors.ruleEditor.editor.bold);
      await click(fixture, selectors.ruleEditor.editor.italic);
      await click(fixture, selectors.ruleEditor.editor.underline);
      await click(fixture, selectors.ruleEditor.editor.strikethrough);

      const dispatch = spyDispatch(parent);
      //  click save
      await click(fixture, selectors.buttonSave);
      const sheetId = model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenNthCalledWith(1, "ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "43",
          rule: {
            operator: "BeginsWith",
            style: {
              bold: true,
              fillColor: "#b6d7a8",
              italic: true,
              strikethrough: true,
              underline: true,
            },
            type: "CellIsRule",
            values: ["3"],
          },
        },
        ranges: toRangesData(sheetId, "A1:A3"),
        sheetId,
      });
    });

    test("cannot create a new CF with invalid range", async () => {
      await click(fixture, selectors.buttonAdd);
      await nextTick();

      setInputValueAndTrigger(selectors.ruleEditor.range, "hello", "input");

      const dispatch = spyDispatch(parent);
      //  click save
      await click(fixture, selectors.buttonSave);
      expect(dispatch).not.toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT");
      const errorString = document.querySelector(selectors.error);
      expect(errorString!.textContent).toBe("The range is invalid");

      setInputValueAndTrigger(selectors.ruleEditor.range, "s!A1", "change");
      await click(fixture, selectors.buttonSave);
      expect(dispatch).not.toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT");
      const errorString2 = document.querySelector(selectors.error);
      expect(errorString2!.textContent).toBe("The range is invalid");
    });

    test("display error message if and only if invalid range", async () => {
      await click(fixture, selectors.buttonAdd);
      await nextTick();
      const dispatch = spyDispatch(parent);

      setInputValueAndTrigger(selectors.ruleEditor.range, "", "input");
      await click(fixture, selectors.buttonSave);
      expect(dispatch).not.toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT");
      const errorString = document.querySelector(selectors.error);
      expect(errorString!.textContent).toBe("A range needs to be defined");

      setInputValueAndTrigger(selectors.ruleEditor.range, "A1", "input");
      await nextTick();
      expect(document.querySelector(selectors.error)).toBe(null);

      setInputValueAndTrigger(selectors.ruleEditor.range, "s!A1", "input");
      await click(fixture, selectors.buttonSave);
      expect(dispatch).not.toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT");
      const errorString1 = document.querySelector(selectors.error);
      expect(errorString1!.textContent).toBe("The range is invalid");
    });

    test("displayed range is updated if range changes", async () => {
      const previews = document.querySelectorAll(selectors.listPreview);
      expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2");
      copy(model, "A1:A2");
      paste(model, "C1");
      await nextTick();
      expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe(
        "A1:A2,C1:C2"
      );
    });

    test("can delete Rule", async () => {
      const dispatch = spyDispatch(parent);
      const previews = document.querySelectorAll(selectors.listPreview);
      await click(previews[0], selectors.buttonDelete);
      expect(dispatch).toHaveBeenCalledWith("REMOVE_CONDITIONAL_FORMAT", {
        id: "1",
        sheetId: model.getters.getActiveSheetId(),
      });
    });

    test("can the reordering CF Rules menu be opened/closed", async () => {
      const previews = document.querySelectorAll(selectors.listPreview);

      expect(document.querySelector(selectors.buttonExitReorder)).toBeFalsy();
      expect(document.querySelector(selectors.cfReorder.buttonUp)).toBeFalsy();
      expect(document.querySelector(selectors.cfReorder.buttonDown)).toBeFalsy();

      await click(fixture, selectors.buttonReoder);

      expect(document.querySelector(selectors.buttonExitReorder)).toBeTruthy();
      // Minus one because top rule has no up button, bottom rule no down button
      expect(document.querySelectorAll(selectors.cfReorder.buttonUp).length).toEqual(
        previews.length - 1
      );
      expect(document.querySelectorAll(selectors.cfReorder.buttonDown).length).toEqual(
        previews.length - 1
      );

      await click(fixture, selectors.buttonExitReorder);

      expect(document.querySelector(selectors.buttonExitReorder)).toBeFalsy();
      expect(document.querySelector(selectors.cfReorder.buttonUp)).toBeFalsy();
      expect(document.querySelector(selectors.cfReorder.buttonDown)).toBeFalsy();
    });

    test("can reorder CF rules with up/down buttons", async () => {
      const sheetId = model.getters.getActiveSheetId();

      await click(fixture, selectors.buttonReoder);

      let previews = document.querySelectorAll(selectors.listPreview);
      await click(previews[0], selectors.cfReorder.buttonDown);
      expect(model.getters.getConditionalFormats(sheetId)[0].id).toEqual("2");

      previews = document.querySelectorAll(selectors.listPreview);
      await click(previews[1], selectors.cfReorder.buttonUp);
      expect(model.getters.getConditionalFormats(sheetId)[0].id).toEqual("1");
    });
  });

  test("can create a new ColorScaleRule with cell values", async () => {
    mockUuidV4To(model, "43");
    await click(fixture, selectors.buttonAdd);
    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "input");
    await click(fixture, selectors.colorScaleEditor.minColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
    await click(fixture, selectors.colorScaleEditor.maxColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerYellow);

    const dispatch = spyDispatch(parent);
    //  click save
    await click(fixture, selectors.buttonSave);

    expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "44",
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
      ranges: toRangesData(model.getters.getActiveSheetId(), "B2:B5"),
      sheetId: model.getters.getActiveSheetId(),
    });
  });

  test("can create a new ColorScaleRule with fixed values", async () => {
    mockUuidV4To(model, "44");
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "input");

    await click(fixture, selectors.colorScaleEditor.minColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10", "input");
    await click(fixture, selectors.colorScaleEditor.maxColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "20", "input");

    const dispatch = spyDispatch(parent);
    //  click save
    await click(fixture, selectors.buttonSave);

    const sheetId = model.getters.getActiveSheetId();
    expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "45",
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
      ranges: toRangesData(sheetId, "B2:B5"),
      sheetId,
    });
  });

  test("can create a new ColorScaleRule with percent values", async () => {
    mockUuidV4To(model, "44");
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "input");

    await click(fixture, selectors.colorScaleEditor.minColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "percentage", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10", "input");
    await click(fixture, selectors.colorScaleEditor.maxColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentage", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "90", "input");

    const dispatch = spyDispatch(parent);
    //  click save
    await click(fixture, selectors.buttonSave);

    const sheetId = model.getters.getActiveSheetId();
    expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "45",
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
      ranges: toRangesData(sheetId, "B2:B5"),
      sheetId,
    });
  });

  test("can create a new ColorScaleRule with percentile values", async () => {
    mockUuidV4To(model, "44");
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "input");

    await click(fixture, selectors.colorScaleEditor.minColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "percentile", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10", "input");
    await click(fixture, selectors.colorScaleEditor.maxColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentile", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "90", "input");

    const dispatch = spyDispatch(parent);
    //  click save
    await click(fixture, selectors.buttonSave);

    const sheetId = model.getters.getActiveSheetId();
    expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "45",
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
      ranges: toRangesData(sheetId, "B2:B5"),
      sheetId,
    });
  });

  test("can create a new ColorScaleRule with a midpoint", async () => {
    mockUuidV4To(model, "44");
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "input");

    await click(fixture, selectors.colorScaleEditor.minColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "0", "input");

    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number", "change");
    await nextTick();
    await click(fixture, selectors.colorScaleEditor.midColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerOrange);
    setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "50", "input");

    await click(fixture, selectors.colorScaleEditor.maxColor);
    await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "100", "input");

    const dispatch = spyDispatch(parent);
    //  click save
    await click(fixture, selectors.buttonSave);

    const sheetId = model.getters.getActiveSheetId();
    expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "45",
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
      ranges: toRangesData(sheetId, "B2:B5"),
      sheetId,
    });
  });

  test("Make a multiple selection, open CF panel, create a rule => Should create one line per selection", async () => {
    await click(fixture, selectors.closePanel);
    setSelection(model, ["B2", "C3"]);
    parent.env.openSidePanel("ConditionalFormatting");
    await nextTick();
    await click(fixture, selectors.buttonAdd);
    await nextTick();
    const ranges = document.querySelectorAll(selectors.ruleEditor.range);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]["value"]).toBe("B2");
    expect(ranges[1]["value"]).toBe("C3");
  });

  test("Open CF panel, make a multiple selection, open CF panel, create a rule => Should create one line per selection", async () => {
    setSelection(model, ["B2", "C3"]);
    await click(fixture, selectors.buttonAdd);
    const ranges = document.querySelectorAll(selectors.ruleEditor.range);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]["value"]).toBe("B2");
    expect(ranges[1]["value"]).toBe("C3");
  });

  test("switching sheet resets CF Editor to list", async () => {
    const sheetId = model.getters.getActiveSheetId();
    await click(fixture, selectors.closePanel);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("2", { bold: true, fillColor: "#ff0000" }, "99"),
      ranges: toRangesData(sheetId, "A1:A2"),
      sheetId,
    });
    createSheet(model, { sheetId: "42" });
    await nextTick();
    const zone = toZone("A1:A2");
    parent.env.openSidePanel("ConditionalFormatting", { selection: [zone] });
    await nextTick();
    expect(fixture.querySelector(selectors.listPreview)).toBeNull();
    expect(fixture.querySelector(selectors.ruleEditor.range! as "input")!.value).toBe("A1:A2");
    activateSheet(model, "42");
    await nextTick();
    expect(fixture.querySelector(selectors.ruleEditor.range)).toBeNull();
    expect(fixture.querySelector(selectors.listPreview)).toBeDefined();
  });
  test("error if range is empty", async () => {
    await click(fixture, selectors.buttonAdd);
    await nextTick();
    setInputValueAndTrigger(selectors.ruleEditor.range, "", "input");
    await nextTick();
    expect(errorMessages()).toEqual(["A range needs to be defined"]);
    expect(fixture.querySelector(selectors.ruleEditor.range)?.className).toContain("o-invalid");
  });

  test("will not dispatch if minvalue > maxvalue", async () => {
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "20", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "10", "input");

    expect(errorMessages()).toHaveLength(0);

    await click(fixture, selectors.buttonSave);

    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    expect(errorMessages()).toEqual(["Minimum must be smaller then Maximum"]);
    expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).not.toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
      "o-invalid"
    );
  });

  test("will show error if minvalue > midvalue", async () => {
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

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

    expect(errorMessages()).toHaveLength(0);

    //  click save
    await click(fixture, selectors.buttonSave);

    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    expect(errorMessages()).toEqual([
      "Minimum must be smaller then Maximum",
      "Minimum must be smaller then Midpoint",
      "Midpoint must be smaller then Maximum",
    ]);
    expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
      "o-invalid"
    );
  });

  test("will show error if midvalue > maxvalue", async () => {
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

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

    expect(errorMessages()).toHaveLength(0);

    //  click save
    await click(fixture, selectors.buttonSave);

    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    expect(errorMessages()).toEqual(["Midpoint must be smaller then Maximum"]);
    expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).not.toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
      "o-invalid"
    );
  });

  test.each(["", "aaaa", "=SUM(1, 2)"])(
    "will display error if wrong minValue",
    async (invalidValue) => {
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, invalidValue, "input");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "25", "input");
      await nextTick();

      expect(errorMessages()).toHaveLength(0);

      await click(fixture, selectors.buttonSave);
      expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
      expect(errorMessages()).toEqual(["The minpoint must be a number"]);
      expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).toContain(
        "o-invalid"
      );
      expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).not.toContain(
        "o-invalid"
      );
      expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
        "o-invalid"
      );
    }
  );

  test.each(["", "aaaa", "=SUM(1, 2)"])(
    "will display error if wrong midValue",
    async (invalidValue) => {
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

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

      expect(errorMessages()).toHaveLength(0);

      await click(fixture, selectors.buttonSave);
      expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
      expect(errorMessages()).toEqual(["The midpoint must be a number"]);
      expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).not.toContain(
        "o-invalid"
      );
      expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).toContain(
        "o-invalid"
      );
      expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
        "o-invalid"
      );
    }
  );

  test.each(["", "aaaa", "=SUM(1, 2)"])(
    "will display error if wrong maxValue",
    async (invalidValue) => {
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "1", "input");
      setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, invalidValue, "input");
      await nextTick();

      expect(errorMessages()).toHaveLength(0);

      await click(fixture, selectors.buttonSave);
      expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
      expect(errorMessages()).toEqual(["The maxpoint must be a number"]);
      expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).not.toContain(
        "o-invalid"
      );
      expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).not.toContain(
        "o-invalid"
      );
      expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).toContain(
        "o-invalid"
      );
    }
  );

  test("will display error if there is an invalid formula for the min", async () => {
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "formula", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "formula", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "=SUM(1", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "=SUM(1,2)", "input");
    await nextTick();

    expect(errorMessages()).toHaveLength(0);

    await click(fixture, selectors.buttonSave);
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    expect(errorMessages()).toEqual(["Invalid Minpoint formula"]);
    expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).not.toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
      "o-invalid"
    );
  });

  test("will display error if there is an invalid formula for the mid", async () => {
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

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

    expect(errorMessages()).toHaveLength(0);

    await click(fixture, selectors.buttonSave);
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    expect(errorMessages()).toEqual(["Invalid Midpoint formula"]);
    expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).not.toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.midValue)?.className).toContain(
      "o-invalid"
    );
    expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
      "o-invalid"
    );
  });

  test("single color missing a single value", async () => {
    await click(fixture, selectors.buttonAdd);
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "GreaterThan", "change");
    expect(fixture.querySelector(".o-invalid")).toBeNull();
    await click(fixture, selectors.buttonSave);
    expect(fixture.querySelector(".o-invalid")).not.toBeNull();
    expect(errorMessages()).toEqual(["The argument is missing. Please provide a value"]);
  });

  test("single color missing two values", async () => {
    await click(fixture, selectors.buttonAdd);
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "Between", "change");
    expect(fixture.querySelector(".o-invalid")).toBeNull();
    await click(fixture, selectors.buttonSave);
    expect([...fixture.querySelectorAll(".o-invalid")]).toHaveLength(2);
    expect(errorMessages()).toEqual([
      "The argument is missing. Please provide a value",
      "The second argument is missing. Please provide a value",
    ]);
    setInputValueAndTrigger(selectors.ruleEditor.editor.valueInput, "25", "input");
    await click(fixture, selectors.buttonSave);
    expect([...fixture.querySelectorAll(".o-invalid")]).toHaveLength(1);
    expect(errorMessages()).toEqual(["The second argument is missing. Please provide a value"]);
  });

  test("changing rule type resets errors", async () => {
    await click(fixture, selectors.buttonAdd);
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "GreaterThan", "change");
    await click(fixture, selectors.buttonSave);
    expect(errorMessages()).not.toHaveLength(0);
    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);
    expect(errorMessages()).toHaveLength(0);
    expect([...fixture.querySelectorAll(".o-invalid")]).toHaveLength(0);
  });

  test("will display error if there is an invalid formula for the max", async () => {
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    // change every value
    setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "change");

    setInputValueAndTrigger(selectors.colorScaleEditor.minType, "formula", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none", "change");
    setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "formula", "change");
    await nextTick();
    setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "=SUM(1", "input");
    setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "=SUM(1,2)", "input");
    await nextTick();

    expect(errorMessages()).toHaveLength(0);

    await click(fixture, selectors.buttonSave);
    expect(model.getters.getConditionalFormats(model.getters.getActiveSheetId())).toHaveLength(0);
    expect(errorMessages()).toEqual(["Invalid Maxpoint formula"]);
  });

  describe("Icon set CF", () => {
    test("can select the Icon set tab", async () => {
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
      expect(
        document.querySelector(selectors.ruleEditor.editor.iconSetRule.container)
      ).toBeDefined();
    });

    test("can apply different iconSet", async () => {
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
      let icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList.value).toBe("o-cf-icon arrow-up");
      expect(icons[1].classList.value).toBe("o-cf-icon arrow-right");
      expect(icons[2].classList.value).toBe("o-cf-icon arrow-down");

      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.iconsets)[1]);
      icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList.value).toBe("o-cf-icon smile");
      expect(icons[1].classList.value).toBe("o-cf-icon meh");
      expect(icons[2].classList.value).toBe("o-cf-icon frown");

      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.iconsets)[2]);
      icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList.value).toBe("o-cf-icon green-dot");
      expect(icons[1].classList.value).toBe("o-cf-icon yellow-dot");
      expect(icons[2].classList.value).toBe("o-cf-icon red-dot");
    });

    test("inverse checkbox will inverse icons", async () => {
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

      let icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList.value).toBe("o-cf-icon arrow-up");
      expect(icons[1].classList.value).toBe("o-cf-icon arrow-right");
      expect(icons[2].classList.value).toBe("o-cf-icon arrow-down");

      await click(fixture, selectors.ruleEditor.editor.iconSetRule.reverse);
      icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[2].classList.value).toBe("o-cf-icon arrow-up");
      expect(icons[1].classList.value).toBe("o-cf-icon arrow-right");
      expect(icons[0].classList.value).toBe("o-cf-icon arrow-down");
    });

    test("can create a new IconsetRule", async () => {
      mockUuidV4To(model, "44");
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5", "input");

      const dispatch = spyDispatch(parent);
      //  click save
      await click(fixture, selectors.buttonSave);

      const sheetId = model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "45",
          rule: {
            type: "IconSetRule",
            icons: {
              lower: "arrowBad",
              middle: "arrowNeutral",
              upper: "arrowGood",
            },
            lowerInflectionPoint: {
              operator: "gt",
              type: "percentage",
              value: "33",
            },
            upperInflectionPoint: {
              operator: "gt",
              type: "percentage",
              value: "66",
            },
          },
        },
        ranges: toRangesData(sheetId, "B2:B5"),
        sheetId,
      });
    });

    test("can change inputs", async () => {
      mockUuidV4To(model, "44");
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
      const rows = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.rows);
      const typeinflectionLower = rows[1].querySelectorAll("select")[1];
      const operatorinflectionLower = rows[1].querySelectorAll("select")[0];
      const inputinflectionLower = rows[1].querySelectorAll("input")[0];
      const typeinflectionUpper = rows[2].querySelectorAll("select")[1];
      const operatorinflectionUpper = rows[2].querySelectorAll("select")[0];
      const inputinflectionUpper = rows[2].querySelectorAll("input")[0];

      setInputValueAndTrigger(typeinflectionLower, "number", "change");
      await nextTick();
      setInputValueAndTrigger(operatorinflectionLower, "ge", "change");
      await nextTick();
      setInputValueAndTrigger(inputinflectionLower, "10", "input");
      await nextTick();

      setInputValueAndTrigger(typeinflectionUpper, "number", "change");
      await nextTick();
      setInputValueAndTrigger(operatorinflectionUpper, "ge", "change");
      await nextTick();
      setInputValueAndTrigger(inputinflectionUpper, "0", "input");
      await nextTick();

      const dispatch = spyDispatch(parent);
      //  click save
      await click(fixture, selectors.buttonSave);

      const sheetId = model.getters.getActiveSheetId();
      expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
        cf: {
          id: "45",
          rule: {
            type: "IconSetRule",
            icons: {
              lower: "arrowBad",
              middle: "arrowNeutral",
              upper: "arrowGood",
            },
            lowerInflectionPoint: {
              operator: "ge",
              type: "number",
              value: "0",
            },
            upperInflectionPoint: {
              operator: "ge",
              type: "number",
              value: "10",
            },
          },
        },
        ranges: toRangesData(sheetId, "A1"),
        sheetId,
      });
    });
  });

  test.each([
    [0, { lower: "arrowBad", middle: "arrowNeutral", upper: "dotNeutral" }],
    [1, { lower: "arrowBad", middle: "dotNeutral", upper: "arrowGood" }],
    [2, { lower: "dotNeutral", middle: "arrowNeutral", upper: "arrowGood" }],
  ])("can change each icon individually", async (iconIndex, expectedIcons) => {
    mockUuidV4To(model, "44");
    await click(fixture, selectors.buttonAdd);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

    const row = document.querySelectorAll(".o-inflection tr")[1 + iconIndex]; // +1 for the <table> headers
    const iconElement = row.querySelectorAll("div")[0];
    await click(iconElement);

    const newIcon = document.querySelectorAll(".o-icon-picker-item")[7];
    await click(newIcon);

    const dispatch = spyDispatch(parent);
    //  click save
    await click(fixture, selectors.buttonSave);

    const sheetId = model.getters.getActiveSheetId();
    expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: "45",
        rule: {
          type: "IconSetRule",
          icons: expectedIcons,
          lowerInflectionPoint: {
            operator: "gt",
            type: "percentage",
            value: "33",
          },
          upperInflectionPoint: {
            operator: "gt",
            type: "percentage",
            value: "66",
          },
        },
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
  });

  test.each([
    [CommandResult.ValueLowerInflectionNaN, "The second value must be a number"],
    [CommandResult.ValueLowerInvalidFormula, "Invalid lower inflection point formula"],
    [CommandResult.ValueLowerInvalidFormula, "Invalid lower inflection point formula"],
  ])(
    "Show right lowerInflection point error message (Command result: %s , Message: %s)",
    async (error: CommandResult, errorMessage: string) => {
      await click(fixture, selectors.buttonAdd);
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

      const cfPlugin = getPlugin(parent.props.model, ConditionalFormatPlugin);
      cfPlugin.allowDispatch = jest.fn(() => error);

      await click(fixture, selectors.buttonSave);
      const rows = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.rows);
      const inputInflectionLower = rows[1].querySelectorAll("input")[0];
      const inputInflectionUpper = rows[2].querySelectorAll("input")[0];
      expect(inputInflectionUpper.classList).toContain("o-invalid");
      expect(inputInflectionLower.classList).not.toContain("o-invalid");
      expect(errorMessages()).toEqual([errorMessage]);
    }
  );
  test.each([
    [CommandResult.ValueUpperInflectionNaN, "The first value must be a number"],
    [CommandResult.ValueUpperInvalidFormula, "Invalid upper inflection point formula"],
  ])(
    "Show right upperInflection point error message (Command result: %s , Message: %s)",
    async (error: CommandResult, errorMessage: string) => {
      await click(fixture, selectors.buttonAdd);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

      const cfPlugin = getPlugin(parent.props.model, ConditionalFormatPlugin);
      cfPlugin.allowDispatch = jest.fn(() => error);

      await click(fixture, selectors.buttonSave);
      const rows = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.rows);
      const inputInflectionLower = rows[1].querySelectorAll("input")[0];
      const inputInflectionUpper = rows[2].querySelectorAll("input")[0];
      expect(inputInflectionUpper.classList).not.toContain("o-invalid");
      expect(inputInflectionLower.classList).toContain("o-invalid");
      expect(errorMessages()).toEqual([errorMessage]);
    }
  );

  test("display both inflection point errors", async () => {
    await click(fixture, selectors.buttonAdd);
    await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
    const rows = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.rows);
    const inputInflectionLower = rows[1].querySelectorAll("input")[0];
    const inputInflectionUpper = rows[2].querySelectorAll("input")[0];
    setInputValueAndTrigger(inputInflectionLower, "hello", "input");
    await click(fixture, selectors.buttonSave);
    expect(inputInflectionLower.classList).toContain("o-invalid");
    expect(inputInflectionUpper.classList).not.toContain("o-invalid");
    expect(errorMessages()).toEqual(["The first value must be a number"]);

    setInputValueAndTrigger(inputInflectionUpper, "hello", "input");
    await click(fixture, selectors.buttonSave);
    expect(inputInflectionLower.classList).toContain("o-invalid");
    expect(inputInflectionUpper.classList).toContain("o-invalid");
    expect(errorMessages()).toEqual([
      "The second value must be a number",
      "The first value must be a number",
    ]);
  });

  test("lower point bigger than upper displays both input as invalid", async () => {
    await click(fixture, selectors.buttonAdd);
    await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
    const rows = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.rows);
    const inputInflectionLower = rows[1].querySelectorAll("input")[0];
    const inputInflectionUpper = rows[2].querySelectorAll("input")[0];
    setInputValueAndTrigger(inputInflectionUpper, "10", "input");
    await nextTick();
    setInputValueAndTrigger(inputInflectionLower, "1", "input");
    await nextTick();
    await click(fixture, selectors.buttonSave);
    expect(inputInflectionLower.classList).toContain("o-invalid");
    expect(inputInflectionUpper.classList).toContain("o-invalid");
    expect(errorMessages()).toEqual([
      "Lower inflection point must be smaller than upper inflection point",
    ]);
  });

  test("Configuration is locally saved when switching cf type", async () => {
    await click(fixture, selectors.buttonAdd);

    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
    await nextTick();
    expect(
      (
        document.querySelector(
          `${selectors.ruleEditor.editor.operatorInput} option:checked`
        ) as HTMLInputElement
      ).value
    ).toBe("BeginsWith");

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

    await click(fixture.querySelectorAll(selectors.cfTabSelector)[0]);
    expect(
      (
        document.querySelector(
          `${selectors.ruleEditor.editor.operatorInput} option:checked`
        ) as HTMLInputElement
      ).value
    ).toBe("BeginsWith");
  });

  test("switching to list resets the rules to their default value", async () => {
    await click(fixture, selectors.buttonAdd);
    setInputValueAndTrigger(selectors.ruleEditor.range, "B5:C7", "change");
    setInputValueAndTrigger(selectors.ruleEditor.range, "B5:C7", "input");
    setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith", "change");
    await nextTick();
    await click(fixture, selectors.buttonCancel);
    await click(fixture, selectors.buttonAdd);
    expect((document.querySelector(selectors.ruleEditor.range) as HTMLInputElement).value).toBe(
      "A1"
    );
    expect(
      (document.querySelector(selectors.ruleEditor.editor.operatorInput) as HTMLSelectElement).value
    ).toBe("IsNotEmpty");
  });
});
