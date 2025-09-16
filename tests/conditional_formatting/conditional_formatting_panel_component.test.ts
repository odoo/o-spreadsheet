import { Model } from "../../src";
import { ConditionalFormattingEditor } from "../../src/components/side_panel/conditional_formatting/cf_editor/cf_editor";
import { ConditionalFormattingPanel } from "../../src/components/side_panel/conditional_formatting/conditional_formatting";
import { toHex, toZone } from "../../src/helpers";
import { ConditionalFormatPlugin } from "../../src/plugins/core/conditional_format";
import {
  CellIsRule,
  CommandResult,
  ConditionalFormattingOperatorValues,
  SpreadsheetChildEnv,
  UID,
} from "../../src/types";
import {
  activateSheet,
  copy,
  createSheet,
  paste,
  setSelection,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import {
  DOMTarget,
  click,
  clickAndDrag,
  getTarget,
  keyDown,
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
  triggerWheelEvent,
} from "../test_helpers/dom_helper";
import {
  createColorScale,
  createEqualCF,
  editStandaloneComposer,
  getHighlightsFromStore,
  getPlugin,
  mountComponentWithPortalTarget,
  mountSpreadsheet,
  nextTick,
  spyModelDispatch,
  textContentAll,
  toRangesData,
} from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";
import { FR_LOCALE } from "./../test_helpers/constants";

function errorMessages(): string[] {
  return textContentAll(selectors.error);
}

const selectors = {
  listPreviewPanel: ".o-cf",
  listPreview: ".o-cf .o-cf-preview",
  ruleEditor: {
    range: ".o-cf-ruleEditor .o-cf-range .o-range input",
    editor: {
      operatorInput: ".o-cf-ruleEditor .o-cf-editor .o-cell-is-operator",
      valueInput: ".o-cf-ruleEditor .o-cf-editor .o-cf-cell-is-rule .o-composer",
      bold: ".o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-menu-item-button[title='Bold']",
      italic:
        ".o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-menu-item-button[title='Italic']",
      underline:
        ".o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-menu-item-button[title='Underline']",
      strikethrough:
        ".o-cf-ruleEditor .o-cf-editor .o-sidePanel-tools div.o-menu-item-button[title='Strikethrough']",
      colorDropdown: ".o-cf-ruleEditor .o-cf-editor .o-color-picker-widget .o-color-picker-button",
      iconSetRule: {
        container: ".o-cf-iconset-rule",
        iconsets: ".o-cf-iconset-rule .o-cf-iconsets .o-cf-iconset",
        inflextion: ".o-cf-iconset-rule .o-inflection",
        icons: ".o-cf-iconset-rule .o-inflection .o-icon",
        reverse: ".o-cf-iconset-rule .o-button-link",
        rows: ".o-cf-iconset-rule .o-inflection tr",
      },
    },
  },
  previewImage: ".o-cf-preview-icon",
  description: {
    ruletype: {
      rule: ".o-cf-preview-description-rule",
    },
    range: ".o-cf-preview-range",
  },
  colorScaleEditor: {
    minColor: ".o-threshold-minimum .o-round-color-picker-button",
    minType: ".o-threshold-minimum > select",
    minValue: ".o-threshold-minimum .o-threshold-value input",
    minValueComposer: ".o-threshold-minimum .o-threshold-value .o-composer",

    midColor: ".o-threshold-midpoint .o-round-color-picker-button",
    midType: ".o-threshold-midpoint > select",
    midValue: ".o-threshold-midpoint .o-threshold-value input",
    midValueComposer: ".o-threshold-midpoint .o-threshold-value .o-composer",

    maxColor: ".o-threshold-maximum .o-round-color-picker-button",
    maxType: ".o-threshold-maximum > select",
    maxValue: ".o-threshold-maximum .o-threshold-value input",
    maxValueComposer: ".o-threshold-maximum .o-threshold-value .o-composer",

    colorPickerBlue: ".o-color-picker div[data-color='#0000FF']",
    colorPickerOrange: ".o-color-picker div[data-color='#FF9900']",
    colorPickerYellow: ".o-color-picker div[data-color='#FFFF00']",
  },
  cfTabSelector: ".o-cf-type-selector .o-badge-selection button",
  buttonSave: ".o-sidePanelButtons .o-cf-save",
  buttonDelete: ".o-cf-delete-button",
  buttonCancel: ".o-sidePanelButtons .o-cf-cancel",
  buttonAdd: ".o-cf-add",
  buttonReoder: ".o-cf-reorder",
  buttonExitReorder: ".o-cf-exit-reorder",
  error: ".o-validation-error",
  closePanel: ".o-sidePanelClose",
};

function isInputInvalid(target: DOMTarget): boolean {
  const el = getTarget(target) as HTMLElement;
  if (el.className.includes("o-composer")) {
    const standaloneComposer = el.closest<HTMLElement>(".o-standalone-composer")!;
    return standaloneComposer.className.includes("o-invalid");
  }
  return el.className.includes("o-invalid");
}

async function changeRuleOperatorType(
  fixture: HTMLElement,
  type: ConditionalFormattingOperatorValues
) {
  await click(fixture, selectors.ruleEditor.editor.operatorInput);
  await click(fixture, `.o-menu-item[data-name="${type}"]`);
}

describe("UI of conditional formats", () => {
  let fixture: HTMLElement;
  let model: Model;
  let sheetId: UID;
  let env: SpreadsheetChildEnv;

  describe("Conditional formatting list panel", () => {
    extendMockGetBoundingClientRect({
      "o-cf-preview-container": (el: HTMLElement) => ({
        y:
          model.getters
            .getConditionalFormats(sheetId)
            .findIndex((cf) => cf.id === (el.firstChild as HTMLElement).dataset.id) * 100,
        height: 100,
      }),
      "o-cf": () => ({
        y: 0,
        height: model.getters.getConditionalFormats(sheetId).length * 100,
      }),
    });

    beforeEach(async () => {
      ({ model, fixture, env } = await mountComponentWithPortalTarget(ConditionalFormattingPanel, {
        props: { onCloseSidePanel: () => {} },
      }));
      sheetId = model.getters.getActiveSheetId();
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
      expect(fixture.querySelector(".o-spreadsheet")!).toMatchSnapshot();
    });
    test("the list of CF has a correct preview", () => {
      // check the html of the list (especially the colors)
      const previews = document.querySelectorAll(selectors.listPreview);
      expect(previews).toHaveLength(2);

      // --> should be the style for CellIsRule
      expect(previews[0].querySelector(selectors.description.ruletype.rule)!.textContent).toBe(
        "Value is equal to 2"
      );
      expect(previews[0].querySelector(selectors.description.range)!.textContent).toBe("A1:A2");
      expect(
        window.getComputedStyle(previews[0].querySelector(selectors.previewImage)!).backgroundColor
      ).toBe("rgb(255, 0, 0)");

      // --> should be a nothing of color gradient for ColorScaleRule
      expect(previews[1].querySelector(selectors.description.range)!.textContent).toBe("B1:B5");
      // TODO VSC: see how we can test the gradient background image
    });

    test("previews are localized", async () => {
      updateLocale(model, FR_LOCALE);
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("1.5", { fillColor: "#FF0000" }, "3"),
        sheetId: model.getters.getActiveSheetId(),
        ranges: toRangesData(sheetId, "A1:A2"),
      });
      await nextTick();

      const previews = document.querySelectorAll(selectors.listPreview);
      expect(previews[2].querySelector(selectors.description.ruletype.rule)!.textContent).toBe(
        "Value is equal to 1,5"
      );
    });

    test("Ranges of hovered previews are highlighted", async () => {
      expect(getHighlightsFromStore(env)).toEqual([]);
      triggerMouseEvent(selectors.listPreview, "mouseenter");
      expect(getHighlightsFromStore(env)).toMatchObject([
        { range: model.getters.getRangeFromZone(sheetId, toZone("A1:A2")) },
      ]);
      triggerMouseEvent(selectors.listPreview, "mouseleave");
      expect(getHighlightsFromStore(env)).toEqual([]);
    });

    test("the list preview should be bold when the rule is bold", async () => {
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("2", { bold: true, fillColor: "#ff0000" }, "99"),
        ranges: toRangesData(sheetId, "C1:C5"),
        sheetId,
      });

      await nextTick();

      const previews = document.querySelectorAll(selectors.listPreview);
      const line = previews[2].querySelector(selectors.previewImage);
      expect(line!.getAttribute("style")).toMatch("font-weight:bold;");
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
      const dispatch = spyModelDispatch(model);
      const previews = document.querySelectorAll(selectors.listPreview);
      await click(previews[0], selectors.buttonDelete);
      expect(dispatch).toHaveBeenCalledWith("REMOVE_CONDITIONAL_FORMAT", {
        id: "1",
        sheetId: model.getters.getActiveSheetId(),
      });
    });

    test("can reorder CF rules with drag & drop", async () => {
      await clickAndDrag(`.o-cf-preview[data-id="1"]`, { x: 0, y: 200 }, undefined, true);
      expect(model.getters.getConditionalFormats(sheetId)).toMatchObject([
        { id: "2" },
        { id: "1" },
      ]);
    });

    test("Drag & drop is canceled when a CF is modified", async () => {
      const previewEl = fixture.querySelector<HTMLElement>(`.o-cf-preview[data-id="1"]`)!;
      await clickAndDrag(previewEl, { x: 0, y: 200 });

      expect(previewEl.parentElement!.style.transition).toBe("top 0s");
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("2", { bold: true, fillColor: "#ff0000" }, "99"),
        ranges: toRangesData(sheetId, "C1:C5"),
        sheetId,
      });
      await nextTick();

      expect(previewEl.style.transition).toBe("");
    });

    test("Drag & drop is not canceled on wheel event", async () => {
      const previewEl = fixture.querySelector<HTMLElement>(`.o-cf-preview[data-id="1"]`)!;
      await clickAndDrag(previewEl, { x: 0, y: 200 });

      expect(previewEl!.classList).toContain("o-cf-dragging");
      triggerWheelEvent(previewEl, { deltaY: 100 });
      await nextTick();

      expect(previewEl!.classList).toContain("o-cf-dragging");
    });

    test("Drag & drop is canceled on right click", async () => {
      const previewEl = fixture.querySelector<HTMLElement>(`.o-cf-preview[data-id="1"]`)!;
      await clickAndDrag(previewEl, { x: 0, y: 200 });

      expect(previewEl!.classList).toContain("o-cf-dragging");
      triggerMouseEvent(previewEl.parentElement, "pointermove", 0, 0, { button: 2 });
      await nextTick();
      expect(previewEl!.classList).not.toContain("o-cf-dragging");

      triggerMouseEvent(previewEl.parentElement, "pointermove", 0, 200);
      await nextTick();
      expect(previewEl!.classList).not.toContain("o-cf-dragging");
    });
  });

  describe("Conditional formatting editor panel", () => {
    beforeEach(async () => {
      const cf = createEqualCF("2", { fillColor: "#FF0000" }, "1");
      const ranges = ["A1:A2"];

      ({ model, fixture } = await mountComponentWithPortalTarget(ConditionalFormattingEditor, {
        props: { cf: { ...cf, ranges }, isNewCf: false, onCloseSidePanel: () => {} },
      }));
      sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf,
        sheetId: model.getters.getActiveSheetId(),
        ranges: toRangesData(sheetId, "A1:A2"),
      });
      await nextTick();
    });

    test("Can cycle on reference (with F4) in a CellIsRule editor input", async () => {
      await changeRuleOperatorType(fixture, "beginsWithText");

      const input = fixture.querySelector<HTMLDivElement>(selectors.ruleEditor.editor.valueInput)!;
      await editStandaloneComposer(input, "=A2", { confirm: false });
      await keyDown({ key: "F4" });
      expect(input.textContent).toBe("=$A$2");
      await keyDown({ key: "F4" });
      expect(input.textContent).toBe("=A$2");
      await keyDown({ key: "F4" });
      expect(input.textContent).toBe("=$A2");
    });

    test("toggle color-picker", async () => {
      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.colorDropdown)[0]);
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.colorDropdown)[0]);
      expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
    });

    test("color-picker closes when click elsewhere", async () => {
      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.colorDropdown)[0]);
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
      await click(fixture, ".o-cf-preview-display");
      expect(fixture.querySelector(".o-color-picker")).toBeFalsy();
    });

    test("will not dispatch if minvalue > maxvalue", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

      await setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "20");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "10");

      expect(errorMessages()).toEqual(["Minimum must be smaller then Maximum"]);
      expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).toContain(
        "o-invalid"
      );
      expect(fixture.querySelector(selectors.colorScaleEditor.midValue)).toBe(null);
      expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
        "o-invalid"
      );
    });

    test("will show error if minvalue > midvalue", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

      await setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "60");

      await setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number");
      setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "50");

      await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "10");

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
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "0");
      setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "50");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "25");

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
        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none");
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.minValue, invalidValue);
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "25");

        expect(errorMessages()).toEqual(["The minpoint must be a number"]);
        expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).toContain(
          "o-invalid"
        );
        expect(fixture.querySelector(selectors.colorScaleEditor.midValue)).toBe(null);
        expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).not.toContain(
          "o-invalid"
        );
      }
    );

    test.each(["", "aaaa", "=SUM(1, 2)"])(
      "will display error if wrong midValue",
      async (invalidValue) => {
        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number");
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10");
        setInputValueAndTrigger(selectors.colorScaleEditor.midValue, invalidValue);
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "25");

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
        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none");
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "1");
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, invalidValue);

        expect(errorMessages()).toEqual(["The maxpoint must be a number"]);
        expect(fixture.querySelector(selectors.colorScaleEditor.minValue)?.className).not.toContain(
          "o-invalid"
        );
        expect(fixture.querySelector(selectors.colorScaleEditor.midValue)).toBe(null);
        expect(fixture.querySelector(selectors.colorScaleEditor.maxValue)?.className).toContain(
          "o-invalid"
        );
      }
    );

    test("will display error if there is an invalid formula for the min", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "formula");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "formula");
      await editStandaloneComposer(selectors.colorScaleEditor.minValueComposer, "=hello()");
      await editStandaloneComposer(selectors.colorScaleEditor.maxValueComposer, "=SUM(1,2)");

      expect(errorMessages()).toEqual(["Invalid Minpoint formula"]);
      expect(isInputInvalid(selectors.colorScaleEditor.minValueComposer)).toBe(true);
      expect(fixture.querySelector(selectors.colorScaleEditor.midValue)).toBe(null);
      expect(isInputInvalid(selectors.colorScaleEditor.maxValueComposer)).toBe(false);
    });

    test("will display error if there is an invalid formula for the mid", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "formula");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
      setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "1");
      editStandaloneComposer(selectors.colorScaleEditor.midValueComposer, "=hello()");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "3");

      expect(errorMessages()).toEqual(["Invalid Midpoint formula"]);
      expect(isInputInvalid(selectors.colorScaleEditor.minValue)).toBe(false);
      expect(isInputInvalid(selectors.colorScaleEditor.midValueComposer)).toBe(true);
      expect(isInputInvalid(selectors.colorScaleEditor.maxValue)).toBe(false);
    });

    test("Panel is not in error if dispatch is refused because there were no changes", async () => {
      await changeRuleOperatorType(fixture, "isNotEmpty");
      await nextTick();
      expect(errorMessages()).toHaveLength(0);

      await changeRuleOperatorType(fixture, "isNotEmpty");
      await nextTick();
      expect(errorMessages()).toHaveLength(0);
    });

    test("will display error if there is an invalid formula for the max", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      // change every value
      setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

      setInputValueAndTrigger(selectors.colorScaleEditor.minType, "formula");
      setInputValueAndTrigger(selectors.colorScaleEditor.midType, "none");
      await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "formula");
      await editStandaloneComposer(selectors.colorScaleEditor.maxValueComposer, "=hello()");
      await editStandaloneComposer(selectors.colorScaleEditor.minValueComposer, "=SUM(1,2)");

      expect(errorMessages()).toEqual(["Invalid Maxpoint formula"]);
    });

    test("Hides the 'No Color' button when the color picker is opened for the color scale", async () => {
      await simulateClick(document.querySelectorAll(selectors.cfTabSelector)[1]);
      await simulateClick(selectors.colorScaleEditor.minColor);

      expect(fixture.querySelector(".o-buttons .o-cancel")).toBeNull();
    });

    test("If there is no midpoint in a color scale, the color picker is invisible", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);
      expect(
        fixture.querySelector(selectors.colorScaleEditor.midColor)?.parentElement?.classList
      ).toContain("invisible");
    });

    test("can select the Icon set tab", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
      expect(
        document.querySelector(selectors.ruleEditor.editor.iconSetRule.container)
      ).toBeDefined();
    });

    test("can apply different iconSet", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
      let icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList).toContain("arrow-up");
      expect(icons[1].classList).toContain("arrow-right");
      expect(icons[2].classList).toContain("arrow-down");

      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.iconsets)[1]);
      icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList).toContain("smile");
      expect(icons[1].classList).toContain("meh");
      expect(icons[2].classList).toContain("frown");

      await click(fixture.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.iconsets)[2]);
      icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList).toContain("green-dot");
      expect(icons[1].classList).toContain("yellow-dot");
      expect(icons[2].classList).toContain("red-dot");
    });

    test("inverse checkbox will inverse icons", async () => {
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

      let icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[0].classList).toContain("arrow-up");
      expect(icons[1].classList).toContain("arrow-right");
      expect(icons[2].classList).toContain("arrow-down");

      await click(fixture, selectors.ruleEditor.editor.iconSetRule.reverse);
      icons = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.icons);
      expect(icons[2].classList).toContain("arrow-up");
      expect(icons[1].classList).toContain("arrow-right");
      expect(icons[0].classList).toContain("arrow-down");
    });

    test("Configuration is locally saved when switching cf type", async () => {
      await changeRuleOperatorType(fixture, "beginsWithText");
      expect(selectors.ruleEditor.editor.operatorInput).toHaveValue("Text begins with");

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

      await click(fixture.querySelectorAll(selectors.cfTabSelector)[0]);
      expect(selectors.ruleEditor.editor.operatorInput).toHaveValue("Text begins with");
    });
  });

  describe("Conditional Formatting panel changes auto-apply to model", () => {
    beforeEach(async () => {
      model = new Model();
      ({ fixture, env } = await mountSpreadsheet({ model }));
      sheetId = model.getters.getActiveSheetId();
      env.openSidePanel("ConditionalFormatting");
      await nextTick();
    });

    test("Can create and save a new CF", async () => {
      await click(fixture, selectors.buttonAdd);
      expect(model.getters.getConditionalFormats(sheetId)).toHaveLength(1);

      await changeRuleOperatorType(fixture, "isEmpty");
      expect(model.getters.getConditionalFormats(sheetId)[0].rule).toMatchObject({
        operator: "isEmpty",
      });

      await click(fixture, selectors.buttonSave);
      expect(selectors.listPreviewPanel).toHaveCount(1);
    });

    test("Can create and cancel the creation of a CF", async () => {
      await click(fixture, selectors.buttonAdd);
      expect(model.getters.getConditionalFormats(sheetId)).toHaveLength(1);

      await click(fixture, selectors.buttonCancel);
      expect(selectors.listPreviewPanel).toHaveCount(1);
      expect(model.getters.getConditionalFormats(sheetId)).toHaveLength(0);
    });

    test("Can edit a CF and cancel its edition", async () => {
      await click(fixture, selectors.buttonAdd);
      await click(fixture, selectors.buttonSave);

      await click(fixture, selectors.listPreview);
      await changeRuleOperatorType(fixture, "isEmpty");
      expect(model.getters.getConditionalFormats(sheetId)[0].rule).toMatchObject({
        operator: "isEmpty",
      });

      click(fixture, selectors.buttonCancel);
      expect(model.getters.getConditionalFormats(sheetId)[0].rule).toMatchObject({
        operator: "isNotEmpty",
      });
    });

    test("Pressing cancel after doing nothing in the panel does not override changes from another user", async () => {
      await click(fixture, selectors.buttonAdd);
      await click(fixture, selectors.buttonSave);
      const cfId = model.getters.getConditionalFormats(sheetId)[0].id;

      // Open the panel
      await click(fixture, selectors.listPreview);
      // Someone else changes the CF in the meantime
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("2", { fillColor: "#ff0000" }, cfId),
        ranges: toRangesData(sheetId, "A1:A2"),
        sheetId,
      });
      // Press cancel
      await click(fixture, selectors.buttonCancel);
      expect(model.getters.getConditionalFormats(sheetId)[0].rule).toMatchObject({
        operator: "isEqual",
        style: { fillColor: "#ff0000" },
      });
    });

    test("The error messages only appear when clicking save, not when changing the operator type", async () => {
      await click(fixture, selectors.buttonAdd);

      await changeRuleOperatorType(fixture, "isEqual");
      expect(errorMessages()).toHaveLength(0);

      await click(fixture, selectors.buttonSave);
      expect(errorMessages()).toHaveLength(1);
      expect(selectors.listPreviewPanel).toHaveCount(0); // We stayed on the edit CF panel
    });
  });

  describe("Conditional Formatting panel interactions", () => {
    beforeEach(async () => {
      model = new Model();
      ({ fixture, env } = await mountSpreadsheet({ model }));
      sheetId = model.getters.getActiveSheetId();
      env.openSidePanel("ConditionalFormatting");
      await nextTick();
    });

    test("cannot create a new CF with invalid range", async () => {
      await click(fixture, selectors.buttonAdd);
      await nextTick();

      setInputValueAndTrigger(selectors.ruleEditor.range, "hello");

      const dispatch = spyModelDispatch(model);
      //  click save
      await click(fixture, selectors.buttonSave);
      expect(dispatch).not.toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT");
      const errorString = document.querySelector(selectors.error);
      expect(errorString!.textContent).toBe("The range is invalid");
    });

    test("error if range is empty", async () => {
      await click(fixture, selectors.buttonAdd);
      await nextTick();
      await setInputValueAndTrigger(selectors.ruleEditor.range, "");
      await click(fixture, selectors.buttonSave);
      expect(errorMessages()).toEqual(["A range needs to be defined"]);
      expect(fixture.querySelector(selectors.ruleEditor.range)?.className).toContain("o-invalid");
    });

    test("changing rule type resets errors", async () => {
      await click(fixture, selectors.buttonAdd);
      await changeRuleOperatorType(fixture, "isGreaterThan");
      await click(fixture, selectors.buttonSave);
      expect(errorMessages()).not.toHaveLength(0);
      await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);
      expect(errorMessages()).toHaveLength(0);
      expect([...fixture.querySelectorAll(".o-invalid")]).toHaveLength(0);
    });

    test("Save button is disabled if there are errors", async () => {
      await click(fixture, selectors.buttonAdd);
      await changeRuleOperatorType(fixture, "isGreaterThan");
      await click(fixture, selectors.buttonSave);
      expect(errorMessages()).toHaveLength(1);
      expect(fixture.querySelector<HTMLButtonElement>(selectors.buttonSave)?.disabled).toBe(true);
    });

    test("Can remove a valid, invalid or empty range", async () => {
      await click(fixture, selectors.buttonAdd);
      await nextTick();

      await setInputValueAndTrigger(selectors.ruleEditor.editor.operatorInput, "BeginsWith");
      setInputValueAndTrigger(".o-selection-input input", "A1:A4");
      expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(1);

      // Add & remove a valid range
      await simulateClick(".o-add-selection");
      const range1 = document.querySelectorAll(".o-selection-input input")[1];
      await setInputValueAndTrigger(range1, "B1:B4");
      const remove1 = document.querySelectorAll(".o-remove-selection")[1];
      await simulateClick(remove1);
      expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(1);

      // Add & remove an invalid range
      await simulateClick(".o-add-selection");
      const range2 = document.querySelectorAll(".o-selection-input input")[1];
      await setInputValueAndTrigger(range2, "MERA");
      const remove2 = document.querySelectorAll(".o-remove-selection")[1];
      await simulateClick(remove2);
      expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(1);

      // Add & remove an empty range
      await simulateClick(".o-add-selection");
      const remove3 = document.querySelectorAll(".o-remove-selection")[1];
      await simulateClick(remove3);
      expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(1);

      // Add & remove a valid range positioned before an empty range
      await simulateClick(".o-add-selection");
      const range4 = document.querySelectorAll(".o-selection-input input")[1];
      await setInputValueAndTrigger(range4, "B1:B4");
      await simulateClick(".o-add-selection");
      const remove4 = document.querySelectorAll(".o-remove-selection")[1];
      await simulateClick(remove4);
      expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(2);

      await changeRuleOperatorType(fixture, "isGreaterThan");
      editStandaloneComposer(selectors.ruleEditor.editor.valueInput, "ABC");

      // The CF rule should be saved with the one range only
      await click(fixture, selectors.buttonSave);
      expect(model.getters.getConditionalFormats(sheetId)[0]).toMatchObject({
        ranges: ["A1:A4"],
      });
    });

    test("Undo the creation of a new CF will switch the panel to the list mode", async () => {
      await click(fixture, selectors.buttonAdd);
      undo(model);
      await nextTick();
      await nextTick();
      expect(selectors.listPreviewPanel).toHaveCount(1);
    });

    test("Highlights are removed when cf preview is unmounted", async () => {
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
        sheetId,
        ranges: toRangesData(sheetId, "A1:A2"),
      });
      await nextTick();

      triggerMouseEvent(selectors.listPreview, "mouseenter");
      expect(getHighlightsFromStore(env)).not.toEqual([]);
      await click(fixture.querySelectorAll(selectors.listPreview)[0]);
      expect(getHighlightsFromStore(env)).toEqual([]);
    });

    test("switching to list resets the rules to their default value", async () => {
      await click(fixture, selectors.buttonAdd);
      setInputValueAndTrigger(selectors.ruleEditor.range, "B5:C7");
      await changeRuleOperatorType(fixture, "beginsWithText");
      await click(fixture, selectors.buttonCancel);
      await click(fixture, selectors.buttonAdd);
      expect((document.querySelector(selectors.ruleEditor.range) as HTMLInputElement).value).toBe(
        "A1"
      );
      expect(
        (document.querySelector(selectors.ruleEditor.editor.operatorInput) as HTMLSelectElement)
          .value
      ).toBe("Is not empty");
    });

    describe("CellIsRule", () => {
      test("CellIsRule editor displays the right preview", async () => {
        model.dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: createEqualCF(
            "2",
            {
              fillColor: "#FF9900",
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

        const previewLine = document.querySelector(".o-cf-preview-display")! as HTMLDivElement;
        const style = window.getComputedStyle(previewLine);
        expect(previewLine.textContent).toBe("Preview text");
        expect(toHex(style.color)).toBe("#FFFF00");
        expect(toHex(style.backgroundColor)).toBe("#FF9900");
        expect(style.fontWeight).toBe("bold");
        expect(style.fontStyle).toBe("italic");
        expect(style.textDecoration).toBe("line-through");
      });

      test("can create a new CellIsRule", async () => {
        await click(fixture, selectors.buttonAdd);
        await nextTick();

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3");
        await changeRuleOperatorType(fixture, "beginsWithText");
        editStandaloneComposer(selectors.ruleEditor.editor.valueInput, "3");

        await click(fixture, selectors.ruleEditor.editor.bold);
        await click(fixture, selectors.ruleEditor.editor.italic);
        await click(fixture, selectors.ruleEditor.editor.underline);
        await click(fixture, selectors.ruleEditor.editor.strikethrough);

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);
        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenNthCalledWith(1, "ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
            rule: {
              operator: "beginsWithText",
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

      test("can edit an existing CellIsRule", async () => {
        model.dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: createEqualCF("2", { fillColor: "#FF0000" }, "1"),
          sheetId,
          ranges: toRangesData(sheetId, "A1:A2"),
        });
        await nextTick();
        await click(fixture.querySelectorAll(selectors.listPreview)[0]);
        await nextTick();

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3");
        await changeRuleOperatorType(fixture, "beginsWithText");
        editStandaloneComposer(selectors.ruleEditor.editor.valueInput, "3");

        await click(fixture, selectors.ruleEditor.editor.bold);
        await click(fixture, selectors.ruleEditor.editor.italic);
        await click(fixture, selectors.ruleEditor.editor.underline);
        await click(fixture, selectors.ruleEditor.editor.strikethrough);

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        expect(dispatch).toHaveBeenNthCalledWith(1, "ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: "1",
            rule: {
              operator: "beginsWithText",
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

      test("single color missing a single value", async () => {
        await click(fixture, selectors.buttonAdd);
        await changeRuleOperatorType(fixture, "isGreaterThan");
        expect(isInputInvalid(selectors.ruleEditor.editor.valueInput)).toBe(false);
        await click(fixture, selectors.buttonSave);
        expect(errorMessages()).toEqual(["The argument is missing. Please provide a value"]);
      });

      test("single color missing two values", async () => {
        await click(fixture, selectors.buttonAdd);
        await changeRuleOperatorType(fixture, "isBetween");
        await click(fixture, selectors.buttonSave);
        expect(errorMessages()).toEqual([
          "The argument is missing. Please provide a value",
          "The second argument is missing. Please provide a value",
        ]);
        await editStandaloneComposer(selectors.ruleEditor.editor.valueInput, "25");
        await click(fixture, selectors.buttonSave);
        expect(errorMessages()).toEqual(["The second argument is missing. Please provide a value"]);
      });

      test("single color with an invalid formula as value", async () => {
        await click(fixture, selectors.buttonAdd);
        setInputValueAndTrigger(selectors.ruleEditor.range, "A1:A3");
        await changeRuleOperatorType(fixture, "isGreaterThan");
        expect(fixture.querySelector(".o-invalid")).toBeNull();
        await editStandaloneComposer(selectors.ruleEditor.editor.valueInput, "=suùù(");
        await click(fixture, selectors.buttonSave);
        expect(fixture.querySelector(".o-invalid")).not.toBeNull();
        expect(errorMessages()).toEqual([
          "At least one of the provided values is an invalid formula",
        ]);
      });
    });

    describe("ColorScaleRule", () => {
      test("can create a new ColorScaleRule with cell values", async () => {
        await click(fixture, selectors.buttonAdd);
        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");
        await click(fixture, selectors.colorScaleEditor.minColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
        await click(fixture, selectors.colorScaleEditor.maxColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerYellow);

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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
        await click(fixture, selectors.buttonAdd);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        await click(fixture, selectors.colorScaleEditor.minColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
        await setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10");
        await click(fixture, selectors.colorScaleEditor.maxColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "20");

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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
        await click(fixture, selectors.buttonAdd);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        await click(fixture, selectors.colorScaleEditor.minColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
        await setInputValueAndTrigger(selectors.colorScaleEditor.minType, "percentage");
        setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10");
        await click(fixture, selectors.colorScaleEditor.maxColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentage");
        setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "90");

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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
        await click(fixture, selectors.buttonAdd);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        await click(fixture, selectors.colorScaleEditor.minColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
        await setInputValueAndTrigger(selectors.colorScaleEditor.minType, "percentile");
        setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "10");
        await click(fixture, selectors.colorScaleEditor.maxColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "percentile");
        setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "90");

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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
        await click(fixture, selectors.buttonAdd);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[1]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        await click(fixture, selectors.colorScaleEditor.minColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
        await setInputValueAndTrigger(selectors.colorScaleEditor.minType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.minValue, "0");

        await setInputValueAndTrigger(selectors.colorScaleEditor.midType, "number");
        await click(fixture, selectors.colorScaleEditor.midColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerOrange);
        setInputValueAndTrigger(selectors.colorScaleEditor.midValue, "50");

        await click(fixture, selectors.colorScaleEditor.maxColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerYellow);
        await setInputValueAndTrigger(selectors.colorScaleEditor.maxType, "number");
        setInputValueAndTrigger(selectors.colorScaleEditor.maxValue, "100");

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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

      test("can edit an existing ColorScaleRule", async () => {
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
        await click(fixture.querySelectorAll(selectors.listPreview)[0]);
        await nextTick();
        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        await click(fixture, selectors.colorScaleEditor.minColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerBlue);
        await click(fixture, selectors.colorScaleEditor.maxColor);
        await click(fixture, selectors.colorScaleEditor.colorPickerYellow);

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

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
    });

    describe("IconsetRule", () => {
      test("can create a new IconsetRule", async () => {
        await click(fixture, selectors.buttonAdd);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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
        await click(fixture, selectors.buttonAdd);
        const dispatch = spyModelDispatch(model);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);
        const rows = document.querySelectorAll(selectors.ruleEditor.editor.iconSetRule.rows);
        const typeinflectionLower = rows[1].querySelectorAll("select")[1];
        const operatorinflectionLower = rows[1].querySelectorAll("select")[0];
        const inputinflectionLower = rows[1].querySelectorAll("input")[0];
        const typeinflectionUpper = rows[2].querySelectorAll("select")[1];
        const operatorinflectionUpper = rows[2].querySelectorAll("select")[0];
        const inputinflectionUpper = rows[2].querySelectorAll("input")[0];

        await setInputValueAndTrigger(typeinflectionLower, "number");
        await setInputValueAndTrigger(operatorinflectionLower, "ge");
        await setInputValueAndTrigger(inputinflectionLower, "10");

        await setInputValueAndTrigger(typeinflectionUpper, "number");
        await setInputValueAndTrigger(operatorinflectionUpper, "ge");
        await setInputValueAndTrigger(inputinflectionUpper, "0");

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenLastCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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

      test.each([
        [0, { lower: "arrowBad", middle: "arrowNeutral", upper: "dotNeutral" }],
        [1, { lower: "arrowBad", middle: "dotNeutral", upper: "arrowGood" }],
        [2, { lower: "dotNeutral", middle: "arrowNeutral", upper: "arrowGood" }],
      ])("can change each icon individually", async (iconIndex, expectedIcons) => {
        await click(fixture, selectors.buttonAdd);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[2]);

        const row = document.querySelectorAll(".o-inflection tr")[1 + iconIndex]; // +1 for the <table> headers
        const iconElement = row.querySelectorAll("div")[0];
        await click(iconElement);

        const newIcon = document.querySelectorAll(".o-icon-picker-item")[7];
        await click(newIcon);

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
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

          const cfPlugin = getPlugin(model, ConditionalFormatPlugin);
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

          const cfPlugin = getPlugin(model, ConditionalFormatPlugin);
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
        setInputValueAndTrigger(inputInflectionLower, "hello");
        await click(fixture, selectors.buttonSave);
        expect(inputInflectionLower.classList).toContain("o-invalid");
        expect(inputInflectionUpper.classList).not.toContain("o-invalid");
        expect(errorMessages()).toEqual(["The first value must be a number"]);

        setInputValueAndTrigger(inputInflectionUpper, "hello");
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
        await setInputValueAndTrigger(inputInflectionUpper, "10");
        await setInputValueAndTrigger(inputInflectionLower, "1");
        await click(fixture, selectors.buttonSave);
        expect(inputInflectionLower.classList).toContain("o-invalid");
        expect(inputInflectionUpper.classList).toContain("o-invalid");
        expect(errorMessages()).toEqual([
          "Lower inflection point must be smaller than upper inflection point",
        ]);
      });
    });

    describe("DataBarRule", () => {
      test("Can create a data bar rule", async () => {
        await click(fixture, selectors.buttonAdd);

        await click(fixture.querySelectorAll(selectors.cfTabSelector)[3]);

        // change every value
        setInputValueAndTrigger(selectors.ruleEditor.range, "B2:B5");

        const dispatch = spyModelDispatch(model);
        //  click save
        await click(fixture, selectors.buttonSave);

        const sheetId = model.getters.getActiveSheetId();
        expect(dispatch).toHaveBeenCalledWith("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: expect.any(String),
            rule: {
              type: "DataBarRule",
              color: 0xd9ead3,
            },
          },
          ranges: toRangesData(sheetId, "B2:B5"),
          sheetId,
        });
      });
    });

    test("CF rule values are canonicalized when sending them to the model", async () => {
      updateLocale(model, FR_LOCALE);
      await click(fixture, selectors.buttonAdd);
      await nextTick();

      await changeRuleOperatorType(fixture, "isEqual");
      await editStandaloneComposer(selectors.ruleEditor.editor.valueInput, "3,59");

      await click(fixture, selectors.buttonSave);
      const sheetId = model.getters.getActiveSheetId();

      const lastCfIndex = model.getters.getConditionalFormats(sheetId).length - 1;
      expect(
        (model.getters.getConditionalFormats(sheetId)[lastCfIndex].rule as CellIsRule).values
      ).toEqual(["3.59"]);
    });

    test("CF date rule values are canonicalized when sending them to the model", async () => {
      updateLocale(model, FR_LOCALE);
      await click(fixture, selectors.buttonAdd);
      await nextTick();

      await changeRuleOperatorType(fixture, "isEqual");
      await editStandaloneComposer(selectors.ruleEditor.editor.valueInput, "01/05/2012");

      await click(fixture, selectors.buttonSave);
      const sheetId = model.getters.getActiveSheetId();

      const lastCfIndex = model.getters.getConditionalFormats(sheetId).length - 1;
      expect(
        (model.getters.getConditionalFormats(sheetId)[lastCfIndex].rule as CellIsRule).values
      ).toEqual(["5/1/2012"]);

      const description = fixture.querySelector(selectors.description.ruletype.rule);
      expect(description?.textContent).toContain("01/05/2012");
    });
  });
});

describe("Integration tests", () => {
  let fixture: HTMLElement;
  let model: Model;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    ({ model, fixture, env } = await mountSpreadsheet());
  });

  test("Make a multiple selection, open CF panel, create a rule => Should create one line per selection", async () => {
    setSelection(model, ["B2", "C3"]);
    env.openSidePanel("ConditionalFormatting");
    await nextTick();
    await click(fixture, selectors.buttonAdd);
    await nextTick();
    const ranges = document.querySelectorAll(selectors.ruleEditor.range);
    expect(ranges).toHaveLength(2);
    expect((ranges[0] as HTMLInputElement).value).toBe("B2");
    expect((ranges[1] as HTMLInputElement).value).toBe("C3");
  });

  test("switching sheet resets CF Editor to list", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const cf = createEqualCF("2", { bold: true, fillColor: "#ff0000" }, "99");
    const range = "A1:A2";
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      ranges: toRangesData(sheetId, range),
      sheetId,
    });
    createSheet(model, { sheetId: "42" });
    env.openSidePanel("ConditionalFormattingEditor", {
      cf: { ...cf, ranges: [range] },
      isNewCf: false,
    });
    await nextTick();
    expect(fixture.querySelector(selectors.listPreview)).toBeNull();
    expect(fixture.querySelector(selectors.ruleEditor.range! as "input")!.value).toBe("A1:A2");
    activateSheet(model, "42");
    await nextTick();
    expect(fixture.querySelector(selectors.ruleEditor.range)).toBeNull();
    expect(fixture.querySelector(selectors.listPreview)).toBeDefined();
  });
});
