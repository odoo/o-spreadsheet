import { Model } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import {
  DEFAULT_CELL_WIDTH,
  GRAY_200,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  MIN_CELL_TEXT_MARGIN,
} from "../../src/constants";
import { toZone } from "../../src/helpers";
import { IsValueInListCriterion, SpreadsheetChildEnv, UID } from "../../src/types";
import {
  addDataValidation,
  createTableWithFilter,
  setCellContent,
  setFormat,
  setSelection,
  setStyle,
} from "../test_helpers/commands_helpers";
import {
  changeRoundColorPickerColor,
  click,
  clickGridIcon,
  getElComputedStyle,
  keyDown,
  setInputValueAndTrigger,
} from "../test_helpers/dom_helper";
import { getCellContent, getCellIcons } from "../test_helpers/getters_helpers";
import {
  ComposerWrapper,
  getDataValidationRules,
  mountComposerWrapper,
  mountSpreadsheet,
  nextTick,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let sheetId: UID;
let env: SpreadsheetChildEnv;

beforeEach(async () => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

describe("Edit criterion in side panel", () => {
  describe("Value in list", () => {
    beforeEach(async () => {
      addDataValidation(model, "A1", "id", {
        type: "isValueInList",
        values: ["ok", "hello", "okay"],
        displayStyle: "arrow",
      });
      ({ fixture, env } = await mountSpreadsheet({ model }));
      env.openSidePanel("DataValidationEditor", { id: "id" });
      await nextTick();
    });

    test("Side panel is correctly pre-filled for isValueInList criterion", () => {
      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(3);
      expect(inputs[0].value).toBe("ok");
      expect(inputs[1].value).toBe("hello");
      expect(inputs[2].value).toBe("okay");

      const displayStyleInput = fixture.querySelector<HTMLInputElement>(".o-dv-display-style");
      expect(displayStyleInput?.value).toBe("arrow");
    });

    test("Side panel is correctly pre-filled for composer criterion", async () => {
      addDataValidation(model, "A1", "dv1", {
        type: "containsText",
        values: ["hola"],
      });
      env.openSidePanel("DataValidationEditor", { id: "dv1" });
      await nextTick();
      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-input .o-composer");
      expect(inputs).toHaveLength(1);
      expect(inputs[0].innerText).toBe("hola");
    });

    test("Can add a new value", async () => {
      await click(fixture, ".o-dv-list-add-value");
      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(4);

      setInputValueAndTrigger(inputs[3], "new value");
      await click(fixture, ".o-dv-save");

      expect(getDataValidationRules(model)[0].criterion.values).toEqual([
        "ok",
        "hello",
        "okay",
        "new value",
      ]);
    });

    test("Can navigate values with keyboard", async () => {
      let inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      inputs[0].focus();
      await keyDown({ key: "Enter" });
      expect(document.activeElement).toBe(inputs[1]);

      await keyDown({ key: "Enter" }); // Can also use Tab (native behaviour), but Tab does not work in jsdom
      expect(document.activeElement).toBe(inputs[2]);

      await keyDown({ key: "Enter" });
      inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(4);
      expect(document.activeElement).toBe(inputs[3]);

      await keyDown({ key: "Tab" });
      inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(5);
      expect(document.activeElement).toBe(inputs[4]);
    });

    test("Can remove a value", async () => {
      const deleteButtons = fixture.querySelectorAll(".o-dv-list-item-delete");
      await click(deleteButtons[0]);
      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(2);
      expect(inputs[0].value).toBe("hello");
      expect(inputs[1].value).toBe("okay");

      click(fixture, ".o-dv-save");
      expect(getDataValidationRules(model)[0].criterion.values).toEqual(["hello", "okay"]);
    });

    test.each(["plainText", "chip", "arrow"])("Can change display style to %s", (displayStyle) => {
      const displayStyleInput = fixture.querySelector<HTMLInputElement>(".o-dv-display-style");
      setInputValueAndTrigger(displayStyleInput, displayStyle);
      click(fixture, ".o-dv-save");
      expect(
        (getDataValidationRules(model)[0].criterion as IsValueInListCriterion).displayStyle
      ).toEqual(displayStyle);
    });

    test("can set a color", async () => {
      expect(getElComputedStyle(".o-round-color-picker-button", "background")).toBeSameColorAs(
        GRAY_200
      );
      await click(fixture.querySelector(".o-round-color-picker-button")!);
      await click(fixture, ".o-color-picker-line-item[data-color='#CFE2F3'");
      expect(getElComputedStyle(".o-round-color-picker-button", "background")).toBeSameColorAs(
        "#CFE2F3"
      );
      await click(fixture, ".o-dv-save");
      const criterion = getDataValidationRules(model)[0].criterion as IsValueInListCriterion;
      expect(criterion.colors).toEqual({ [criterion.values[0]]: "#CFE2F3" });
    });

    test("can remove a color", async () => {
      await click(fixture.querySelector(".o-round-color-picker-button")!);
      await click(fixture, ".o-color-picker-line-item[data-color='#CFE2F3'");
      await click(fixture.querySelector(".o-round-color-picker-button")!);
      await click(fixture, ".o-color-picker .o-cancel");
      expect(getElComputedStyle(".o-round-color-picker-button", "background")).toBeSameColorAs(
        GRAY_200
      );
      await click(fixture, ".o-dv-save");
      expect((getDataValidationRules(model)[0].criterion as IsValueInListCriterion).colors).toEqual(
        {}
      );
    });
  });

  describe("Value in range", () => {
    beforeEach(async () => {
      addDataValidation(model, "A1", "id", {
        type: "isValueInRange",
        values: ["B1:B5"],
        displayStyle: "arrow",
      });
      ({ fixture, env } = await mountSpreadsheet({ model }));
      env.openSidePanel("DataValidationEditor", { id: "id" });
      await nextTick();
    });

    test("Side panel is correctly pre-filled", () => {
      const rangeInput = fixture.querySelector<HTMLInputElement>(
        ".o-dv-settings .o-selection-input input"
      )!;
      expect(rangeInput.value).toBe("B1:B5");

      const displayStyleInput = fixture.querySelector<HTMLInputElement>(".o-dv-display-style");
      expect(displayStyleInput?.value).toBe("arrow");
    });

    test("Can change the range", () => {
      const rangeInput = fixture.querySelector<HTMLInputElement>(
        ".o-dv-settings .o-selection-input input"
      )!;
      setInputValueAndTrigger(rangeInput, "B1:B9");
      click(fixture, ".o-dv-save");
      expect(getDataValidationRules(model)[0].criterion.values).toEqual(["B1:B9"]);
    });

    test("Can change display style", () => {
      const displayStyleInput = fixture.querySelector<HTMLInputElement>(".o-dv-display-style");
      setInputValueAndTrigger(displayStyleInput, "plainText");
      click(fixture, ".o-dv-save");
      expect(
        (getDataValidationRules(model)[0].criterion as IsValueInListCriterion).displayStyle
      ).toEqual("plainText");
    });

    test("can set a color", async () => {
      setCellContent(model, "B1", "hello");
      setCellContent(model, "B2", "world");
      await nextTick();
      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveValue("hello");
      expect(inputs[1]).toHaveValue("world");

      expect(getElComputedStyle(".o-round-color-picker-button", "background")).toBeSameColorAs(
        GRAY_200
      );
      await click(fixture.querySelector(".o-round-color-picker-button")!);
      await click(fixture, ".o-color-picker-line-item[data-color='#CFE2F3'");
      expect(getElComputedStyle(".o-round-color-picker-button", "background")).toBeSameColorAs(
        "#CFE2F3"
      );
      await click(fixture, ".o-dv-save");
      const criterion = getDataValidationRules(model)[0].criterion as IsValueInListCriterion;
      expect(criterion.colors).toEqual({ hello: "#CFE2F3" });
    });

    test("do not show colored value missing from the range", async () => {
      setCellContent(model, "B1", "hello");
      setCellContent(model, "B2", "world");
      await nextTick();
      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveValue("hello");
      expect(inputs[1]).toHaveValue("world");
      await click(fixture.querySelector(".o-round-color-picker-button")!);
      await click(fixture, ".o-color-picker-line-item[data-color='#CFE2F3'");
      await click(fixture, ".o-dv-save");
      setCellContent(model, "B1", "something else");
      await click(fixture, ".o-dv-preview");
      const newInputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(newInputs).toHaveLength(2);
      expect(newInputs[0]).toHaveValue("something else");
      expect(newInputs[1]).toHaveValue("world");
    });

    test("can remove a color", async () => {
      setCellContent(model, "B1", "hello");
      setCellContent(model, "B2", "world");
      await nextTick();
      await click(fixture.querySelector(".o-round-color-picker-button")!);
      await click(fixture, ".o-color-picker-line-item[data-color='#CFE2F3'");
      await click(fixture.querySelector(".o-round-color-picker-button")!);
      await click(fixture, ".o-color-picker .o-cancel");
      expect(getElComputedStyle(".o-round-color-picker-button", "background")).toBeSameColorAs(
        GRAY_200
      );
      await click(fixture, ".o-dv-save");
      expect((getDataValidationRules(model)[0].criterion as IsValueInListCriterion).colors).toEqual(
        {}
      );
    });

    test("formatted value is displayed instead of raw value", async () => {
      setCellContent(model, "B1", "5");
      setFormat(model, "B1", "0.00$");
      await nextTick();

      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(1);
      expect(inputs[0]).toHaveValue("5.00$");
      await changeRoundColorPickerColor(".o-dv-list-values", "#CFE2F3");
      await click(fixture, ".o-dv-save");
      const criterion = getDataValidationRules(model)[0].criterion as IsValueInListCriterion;
      expect(criterion.colors).toEqual({ "5": "#CFE2F3" });
    });
  });
});

describe("autocomplete in composer", () => {
  let parent: ComposerWrapper;
  async function typeInComposer(text: string) {
    parent.startComposition();
    await typeInComposerHelper("div.o-composer", text, false);
  }

  describe("Value in list", () => {
    beforeEach(async () => {
      addDataValidation(model, "A1", "id", {
        type: "isValueInList",
        values: ["ok", "hello", "okay"],
        displayStyle: "arrow",
      });
    });

    test("Autocomplete appears with data validation values", async () => {
      ({ fixture, parent } = await mountComposerWrapper(model));
      await typeInComposer("");
      const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value");
      expect(values).toHaveLength(3);
      expect(values[0].textContent).toBe("ok");
      expect(values[1].textContent).toBe("hello");
      expect(values[2].textContent).toBe("okay");
    });

    test("Data validation autocomplete is not shown when editing formula", async () => {
      ({ fixture, parent } = await mountComposerWrapper(model));
      await typeInComposer("=S");
      const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value");
      expect(values.length).toBeGreaterThan(3);
      expect(values[0].textContent).not.toBe("ok");
    });

    test("Data validation autocomplete is not shown with only =", async () => {
      ({ fixture, parent } = await mountComposerWrapper(model));
      await typeInComposer("=");
      const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value");
      expect(values.length).toBe(0);
    });

    test("Values displayed are filtered based on composer content", async () => {
      ({ fixture, parent } = await mountComposerWrapper(model));
      await typeInComposer("k");
      const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value");
      expect(values).toHaveLength(2);
      expect(values[0].textContent).toBe("ok");
      expect(values[1].textContent).toBe("okay");
    });

    test("Values displayed are not filtered when the user opens the composer with a valid value", async () => {
      setCellContent(model, "A1", "hello");
      ({ fixture, parent } = await mountComposerWrapper(model));
      const composerStore = parent.env.getStore(CellComposerStore);
      await typeInComposer("");
      expect(composerStore.currentContent).toBe("hello");
      expect(fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value")).toHaveLength(3);
    });

    test("Values displayed are filtered when the input has no match in valid values", async () => {
      ({ fixture, parent } = await mountComposerWrapper(model));
      await typeInComposer("this is not a valid value");
      expect(fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value")).toHaveLength(0);
    });

    test("Can select values with arrows", async () => {
      ({ fixture, parent } = await mountComposerWrapper(model, { focus: "cellFocus" }));
      await typeInComposer("hel");
      expect(fixture.querySelector(".o-autocomplete-value-focus")).toBeNull();

      await keyDown({ key: "ArrowDown" });
      expect(fixture.querySelector(".o-autocomplete-value-focus")?.textContent).toBe("hello");
    });

    test("Enter overwrite composer content with selected value and stops edition", async () => {
      ({ fixture, parent } = await mountComposerWrapper(model));
      const composerStore = parent.env.getStore(CellComposerStore);
      await typeInComposer("hel");
      await keyDown({ key: "ArrowDown" });
      await keyDown({ key: "Enter" });
      expect(fixture.querySelector(".o-autocomplete-value")).toBeNull();
      expect(getCellContent(model, "A1")).toBe("hello");
      expect(composerStore.editionMode).toBe("inactive");
    });
  });

  test("Value in range autocomplete values", async () => {
    setCellContent(model, "B1", "hello");
    setCellContent(model, "B2", "=D1");
    setCellContent(model, "D1", "ok");
    setCellContent(model, "C2", "thing");
    addDataValidation(model, "A1", "id", {
      type: "isValueInRange",
      values: ["B1:C2"],
      displayStyle: "arrow",
    });

    ({ fixture, parent } = await mountComposerWrapper(model));
    await typeInComposer("");
    const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value");
    expect(values).toHaveLength(3);
    expect(values[0].textContent).toBe("hello");
    expect(values[1].textContent).toBe("ok");
    expect(values[2].textContent).toBe("thing");
  });

  test("Duplicate values will be removed before sending proposals to the autocomplete dropdown in data validation with range", async () => {
    setCellContent(model, "A2", "ok");
    setCellContent(model, "A3", "hello");
    setCellContent(model, "A4", "ok");
    addDataValidation(model, "A1", "id", {
      type: "isValueInRange",
      values: ["A2:A4"],
      displayStyle: "arrow",
    });

    ({ fixture, parent } = await mountComposerWrapper(model));
    await typeInComposer("");

    const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value");
    expect(values).toHaveLength(2);
    expect(values[0].textContent).toBe("ok");
    expect(values[1].textContent).toBe("hello");
  });

  test("Duplicate values will be removed before sending proposals to the autocomplete dropdown in data validation with list", async () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "ok", "hello"],
      displayStyle: "arrow",
    });

    ({ fixture, parent } = await mountComposerWrapper(model));
    await typeInComposer("");

    const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value");
    expect(values).toHaveLength(2);
    expect(values[0].textContent).toBe("ok");
    expect(values[1].textContent).toBe("hello");
  });

  test("Autocomplete dropdown text should be black by default", async () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["hello"],
      displayStyle: "arrow",
    });
    setStyle(model, "A1", {
      textColor: "#FFFF00",
      fillColor: "#000000",
    });
    ({ fixture, parent } = await mountComposerWrapper(model));
    await typeInComposer("");
    const values = fixture.querySelectorAll<HTMLElement>(".o-autocomplete-value span");
    expect(values).toHaveLength(1);
    expect(values[0].textContent).toBe("hello");
    expect(values[0].style.color).toBe("rgb(0, 0, 0)");
  });
});

describe("Selection arrow icon in grid", () => {
  beforeEach(async () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "arrow",
    });
  });

  test("Icon is displayed in the grid at the correct position", () => {
    const icon = getCellIcons(model, "A1")[0];
    expect(icon.type).toEqual("data_validation_list_icon");
    const rect = model.getters.getCellIconRect(icon, model.getters.getRect(toZone("A1")));
    expect(rect.x).toEqual(DEFAULT_CELL_WIDTH - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH);
    expect(rect.y).toEqual(1 + MIN_CELL_TEXT_MARGIN); // +1 to skip grid lines
  });

  test("Clicking on the icon opens the composer with suggestions", async () => {
    setSelection(model, ["B2"]);
    ({ fixture, env } = await mountSpreadsheet({ model }));
    const composerStore = env.getStore(CellComposerStore);
    await clickGridIcon(model, "A1");
    expect(composerStore.editionMode).toBe("editing");
    expect(composerStore.currentEditedCell).toEqual({ sheetId, col: 0, row: 0 });
    const suggestions = fixture.querySelectorAll(".o-autocomplete-dropdown .o-autocomplete-value");
    expect(suggestions.length).toBe(3);
    expect(suggestions[0].textContent).toBe("ok");
    expect(suggestions[1].textContent).toBe("hello");
    expect(suggestions[2].textContent).toBe("okay");
  });

  test("Icon is not displayed when display style is plainText", () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "plainText",
    });
    expect(getCellIcons(model, "A1")).toHaveLength(0);
  });

  test("Icon is not displayed in dashboard", () => {
    model.updateMode("dashboard");
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "arrow",
    });
    expect(getCellIcons(model, "A1")).toHaveLength(0);
  });

  test("Icon is not displayed if there is a filter icon", () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "arrow",
    });
    createTableWithFilter(model, "A1:A4");

    const icons = getCellIcons(model, "A1");
    expect(icons.length).toBe(1);
    expect(icons[0].type).toBe("filter_icon");
  });

  test("chip color isn't taken into account in composer", async () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["hello"],
      displayStyle: "chip",
      colors: { hello: "#CFE2F3" },
    });
    setCellContent(model, "A1", "hello");
    setStyle(model, "A1", {
      fillColor: "#123456",
      textColor: "#654321",
    });
    ({ fixture } = await mountSpreadsheet({ model }));
    await clickGridIcon(model, "A1");
    expect(getElComputedStyle(".o-grid-composer", "background")).toBeSameColorAs("#123456");
    expect(getElComputedStyle(".o-grid-composer", "color")).toBeSameColorAs("#654321");
  });
});
