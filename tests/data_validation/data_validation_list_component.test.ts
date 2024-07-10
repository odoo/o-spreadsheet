import { Model } from "../../src";
import { ComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
} from "../../src/constants";
import { IsValueInListCriterion, SpreadsheetChildEnv, UID } from "../../src/types";
import {
  addDataValidation,
  createTable,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { click, keyDown, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  ComposerWrapper,
  getDataValidationRules,
  getStylePropertyInPx,
  mountComposerWrapper,
  mountSpreadsheet,
  nextTick,
  typeInComposerHelper,
} from "../test_helpers/helpers";
import { mountDataValidationPanel } from "./data_validation_generics_side_panel_component.test";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("../__mocks__/content_editable_helper")
);

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
      ({ fixture } = await mountDataValidationPanel(model));
      await click(fixture, ".o-dv-preview");
    });

    test("Side panel is correctly pre-filled", () => {
      const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-dv-list-values .o-input");
      expect(inputs).toHaveLength(3);
      expect(inputs[0].value).toBe("ok");
      expect(inputs[1].value).toBe("hello");
      expect(inputs[2].value).toBe("okay");

      const displayStyleInput = fixture.querySelector<HTMLInputElement>(".o-dv-display-style");
      expect(displayStyleInput?.value).toBe("arrow");
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

    test("Can change display style", () => {
      const displayStyleInput = fixture.querySelector<HTMLInputElement>(".o-dv-display-style");
      setInputValueAndTrigger(displayStyleInput, "plainText");
      click(fixture, ".o-dv-save");
      expect(
        (getDataValidationRules(model)[0].criterion as IsValueInListCriterion).displayStyle
      ).toEqual("plainText");
    });
  });

  describe("Value in range", () => {
    beforeEach(async () => {
      addDataValidation(model, "A1", "id", {
        type: "isValueInRange",
        values: ["B1:B5"],
        displayStyle: "arrow",
      });
      ({ fixture } = await mountDataValidationPanel(model));
      await click(fixture, ".o-dv-preview");
      // TODO: nextTick needed because the SelectionInput component is bugged without it (changing the input tries to
      // update the range at id 0 but, the first range has id 1 in the SelectionInput plugin). Probably worth investigating
      // in another task
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

    test("Can change the range", async () => {
      const rangeInput = fixture.querySelector<HTMLInputElement>(
        ".o-dv-settings .o-selection-input input"
      )!;
      setInputValueAndTrigger(rangeInput, "B1:B9");
      await click(fixture, ".o-dv-save");
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
      const composerStore = parent.env.getStore(ComposerStore);
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
      const composerStore = parent.env.getStore(ComposerStore);
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
});

describe("Selection arrow icon in grid", () => {
  beforeEach(async () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "arrow",
    });
  });

  test("Icon is displayed in the grid at the correct position", async () => {
    ({ fixture } = await mountSpreadsheet({ model }));
    const icon = fixture.querySelector(".o-grid-cell-icon") as HTMLElement;

    expect(icon.querySelector(".o-dv-list-icon")).toBeTruthy();
    expect(getStylePropertyInPx(icon, "left")).toEqual(
      DEFAULT_CELL_WIDTH - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH
    );
    expect(getStylePropertyInPx(icon, "top")).toEqual(
      DEFAULT_CELL_HEIGHT - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH
    );
  });

  test("Clicking on the icon opens the composer with suggestions", async () => {
    setSelection(model, ["B2"]);
    ({ fixture, env } = await mountSpreadsheet({ model }));
    const composerStore = env.getStore(ComposerStore);
    await click(fixture, ".o-dv-list-icon");
    await nextTick();
    expect(composerStore.editionMode).toBe("editing");
    expect(composerStore.currentEditedCell).toEqual({ sheetId, col: 0, row: 0 });
    const suggestions = fixture.querySelectorAll(".o-autocomplete-dropdown .o-autocomplete-value");
    expect(suggestions.length).toBe(3);
    expect(suggestions[0].textContent).toBe("ok");
    expect(suggestions[1].textContent).toBe("hello");
    expect(suggestions[2].textContent).toBe("okay");
  });

  test("Icon is not displayed when display style is plainText", async () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "plainText",
    });
    ({ fixture } = await mountSpreadsheet({ model }));
    expect(fixture.querySelector(".o-dv-list-icon")).toBeNull();
  });

  test("Icon is not displayed in dashboard", async () => {
    model.updateMode("dashboard");
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "arrow",
    });
    ({ fixture } = await mountSpreadsheet({ model }));
    expect(fixture.querySelector(".o-dv-list-icon")).toBeNull();
  });

  test("Icon is not displayed if there is a filter icon", async () => {
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["ok", "hello", "okay"],
      displayStyle: "arrow",
    });
    createTable(model, "A1:A4");

    ({ fixture } = await mountSpreadsheet({ model }));
    expect(fixture.querySelector(".o-dv-list-icon")).toBeNull();
    expect(fixture.querySelector(".o-filter-icon")).not.toBeNull();
  });
});
