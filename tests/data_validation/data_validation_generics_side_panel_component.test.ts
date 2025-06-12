import { Component } from "@odoo/owl";
import { Model } from "../../src";
import { DataValidationPanel } from "../../src/components/side_panel/data_validation/data_validation_panel";
import { UID } from "../../src/types";
import { addDataValidation, createSheet, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import {
  click,
  clickCell,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import {
  editStandaloneComposer,
  getDataValidationRules,
  mountComponentWithPortalTarget,
  mountSpreadsheet,
  nextTick,
  spyModelDispatch,
  toRangesData,
} from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";

const dataValidationSelectBoundingRect = { x: 100, y: 100, width: 50, height: 50 };
extendMockGetBoundingClientRect({
  "o-dv-type": () => dataValidationSelectBoundingRect,
});

async function mountDataValidationPanel(model?: Model) {
  return mountComponentWithPortalTarget(DataValidationPanel, {
    model: model || new Model(),
    props: { onCloseSidePanel: () => {} },
  });
}

describe("data validation sidePanel component", () => {
  let model: Model;
  let sheetId: UID;
  let fixture: HTMLElement;

  beforeEach(async () => {
    ({ model, fixture } = await mountDataValidationPanel());
    sheetId = model.getters.getActiveSheetId();
  });

  async function changeCriterionType(type: string) {
    await click(fixture, ".o-dv-type");
    await click(fixture, `.o-menu-item[data-name="${type}"]`);
  }

  test("Menu to select data validation type is correctly positioned", async () => {
    await click(fixture, ".o-dv-add");
    await click(fixture, ".o-dv-type");
    const popover = document.querySelector<HTMLElement>(".o-popover")!;
    const { x, y, height } = dataValidationSelectBoundingRect;
    expect(popover.style.left).toEqual(x + "px");
    expect(popover.style.top).toEqual(y + height + "px");
  });

  test("Clicking on the data validation type select element toggles the menu", async () => {
    await click(fixture, ".o-dv-add");
    await click(fixture, ".o-dv-type");
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    await click(fixture, ".o-dv-type");
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test.each([
    ["containsText", { values: ["str"] }, 'Text contains "str"'],
    ["notContainsText", { values: ["str"] }, 'Text does not contain "str"'],
    ["isEqualText", { values: ["str"] }, 'Text is exactly "str"'],
    ["isEmail", { values: [] }, "Text is valid email"],
    ["isLink", { values: [] }, "Text is valid link"],
    ["dateIs", { values: ["1/1/2020"], dateValue: "exactDate" }, "Date is 1/1/2020"],
    ["dateIsBefore", { values: ["1/1/2020"], dateValue: "exactDate" }, "Date is before 1/1/2020"],
    [
      "dateIsOnOrBefore",
      { values: ["1/1/2020"], dateValue: "exactDate" },
      "Date is on or before 1/1/2020",
    ],
    ["dateIsAfter", { values: ["1/1/2020"], dateValue: "exactDate" }, "Date is after 1/1/2020"],
    [
      "dateIsOnOrAfter",
      { values: ["1/1/2020"], dateValue: "exactDate" },
      "Date is on or after 1/1/2020",
    ],
    [
      "dateIsBetween",
      { values: ["1/1/2020", "2/2/2022"] },
      "Date is between 1/1/2020 and 2/2/2022",
    ],
    ["dateIsValid", { values: [] }, "Date is valid"],
    ["isEqual", { values: ["5"] }, "Value is equal to 5"],
    ["isNotEqual", { values: ["5"] }, "Value is not equal to 5"],
    ["isGreaterThan", { values: ["5"] }, "Value is greater than 5"],
    ["isLessThan", { values: ["5"] }, "Value is less than 5"],
    ["isLessOrEqualTo", { values: ["5"] }, "Value is less or equal to 5"],
    ["isGreaterOrEqualTo", { values: ["5"] }, "Value is greater or equal to 5"],
    ["isBetween", { values: ["5", "6"] }, "Value is between 5 and 6"],
    ["isNotBetween", { values: ["5", "6"] }, "Value is not between 5 and 6"],
    ["isBoolean", { values: [] }, "Checkbox"],
    ["customFormula", { values: ["=A1"] }, "Custom formula =A1"],
  ])("Add a data validation rule %s", async (type, criterion, preview) => {
    await simulateClick(".o-dv-add");
    await nextTick();
    await changeCriterionType(type);

    setInputValueAndTrigger(".o-selection-input input", "A1:A5");

    const composerElements = fixture.querySelectorAll(".o-dv-settings .o-composer");
    for (let i = 0; i < criterion.values.length; i++) {
      await editStandaloneComposer(composerElements[i], criterion.values[i]);
    }

    await simulateClick(".o-dv-save");

    expect(getDataValidationRules(model, sheetId)).toEqual([
      {
        id: expect.any(String),
        criterion: { type, ...criterion },
        ranges: ["A1:A5"],
      },
    ]);

    expect(fixture.querySelector(".o-dv-preview-description")?.textContent).toEqual(preview);
    expect(fixture.querySelector(".o-dv-preview-ranges")?.textContent).toEqual("A1:A5");
  });

  test("Date criteria have a dateValue select input", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    setInputValueAndTrigger(".o-selection-input input", "A1:A5");
    await changeCriterionType("dateIs");

    expect(fixture.querySelector(".o-dv-date-value")).toBeTruthy();
    setInputValueAndTrigger(".o-dv-date-value", "tomorrow");

    await simulateClick(".o-dv-save");
    expect(getDataValidationRules(model, sheetId)).toEqual([
      {
        id: expect.any(String),
        criterion: { type: "dateIs", dateValue: "tomorrow", values: [] },
        ranges: ["A1:A5"],
      },
    ]);
  });

  test("Invalid range", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    await changeCriterionType("dateIs");

    setInputValueAndTrigger(".o-selection-input input", "A1:HOLA");

    const composer = ".o-dv-settings .o-composer";
    await editStandaloneComposer(composer, "=SUM(1,2)");

    await simulateClick(".o-dv-save");
    expect(fixture.querySelector(".o-selection-input .input-icon.text-danger")).toBeTruthy();
    expect(fixture.querySelector(".o-selection-input .o-invalid")).toBeTruthy();
    const errorMessageEl = fixture.querySelector(".o-validation-error");
    expect(errorMessageEl).toBeTruthy();
    expect(errorMessageEl?.textContent).toContain('Invalid ranges: "A1:HOLA"');
  });

  test("Out of sheet range", async () => {
    createSheet(model, { sheetId: "ID", name: "Sheet2", activate: false });
    await simulateClick(".o-dv-add");
    await nextTick();

    setInputValueAndTrigger(".o-selection-input input", "Sheet2!A1");

    const composer = ".o-dv-settings .o-composer";
    await editStandaloneComposer(composer, "=SUM(1,2)");

    await simulateClick(".o-dv-save");
    const errorMessageEl = fixture.querySelector(".o-validation-error");
    expect(errorMessageEl).toBeTruthy();
    expect(errorMessageEl?.textContent).toContain(
      'Ranges "Sheet2!A1" should target the sheet on which the conditional format is defined (Sheet1)'
    );
  });

  test("cannot edit a CF range on another sheet", async () => {
    createSheet(model, { sheetId: "s2", name: "Sheet2", activate: false });
    await simulateClick(".o-dv-add");
    await nextTick();

    model.dispatch("ACTIVATE_NEXT_SHEET");
    await nextTick();

    const range = fixture.querySelector<HTMLInputElement>(".o-selection-input input");
    expect(range?.disabled).toBeTruthy();
  });

  test("Edit a DV formula on another sheet is properly adapted on confirm", async () => {
    createSheet(model, { sheetId: "s2", name: "Sheet2", activate: false });
    await simulateClick(".o-dv-add");
    await nextTick();
    setInputValueAndTrigger(".o-selection-input input", "A1");

    model.dispatch("ACTIVATE_NEXT_SHEET");
    await nextTick();

    const composer = ".o-dv-settings .o-composer";
    await editStandaloneComposer(composer, "=A1");
    await nextTick();

    const dispatch = spyModelDispatch(model);

    await simulateClick(".o-dv-save");
    expect(dispatch).toHaveBeenNthCalledWith(1, "ADD_DATA_VALIDATION_RULE", {
      rule: {
        id: expect.any(String),
        criterion: {
          type: "containsText",
          values: ["=Sheet2!A1"],
        },
      },
      ranges: toRangesData(sheetId, "A1"),
      sheetId,
    });
  });

  test("Can remove a valid, invalid or empty range", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    await changeCriterionType("dateIs");

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
    await setInputValueAndTrigger(range2, "B1:HOLA");
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

    await editStandaloneComposer(".o-dv-settings .o-composer", "=DATE(2025,1,1)");

    // The DV rule should be saved with the one range only
    await simulateClick(".o-dv-save");
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      {
        ranges: ["A1:A4"],
      },
    ]);
  });

  test("Invalid input values with single input", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    await changeCriterionType("dateIs");

    setInputValueAndTrigger(".o-selection-input input", "A1:A5");

    const composer = ".o-dv-settings .o-composer";
    await editStandaloneComposer(composer, "thisIsNotADate");

    await simulateClick(".o-dv-save");
    expect(fixture.querySelector(".o-dv-input .error-icon")).toBeTruthy();
    const errorMessageEl = fixture.querySelector(".o-validation-error");
    expect(errorMessageEl).toBeTruthy();
    expect(errorMessageEl?.textContent).toContain(
      "One or more of the provided criteria values are invalid. Please review and correct them."
    );
  });

  test("Invalid input values with two inputs", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    await changeCriterionType("isBetween");

    setInputValueAndTrigger(".o-selection-input input", "A1:A5");

    const composerElements = fixture.querySelectorAll(".o-dv-settings .o-composer");
    await editStandaloneComposer(composerElements[0], "Not a number");
    await editStandaloneComposer(composerElements[1], "Neither is this");

    await simulateClick(".o-dv-save");
    expect(fixture.querySelectorAll(".o-dv-input .error-icon")).toHaveLength(2);
    const errorMessageEl = fixture.querySelector(".o-validation-error");
    expect(errorMessageEl).toBeTruthy();
    expect(errorMessageEl?.textContent).toContain(
      "One or more of the provided criteria values are invalid. Please review and correct them."
    );
  });

  test("Can make the rule blocking", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();

    const composer = ".o-dv-settings .o-composer";
    await editStandaloneComposer(composer, "Random text");
    setInputValueAndTrigger(".o-dv-reject-input", "true");
    simulateClick(".o-dv-save");

    expect(model.getters.getDataValidationRules(sheetId)).toMatchObject([{ isBlocking: true }]);
  });

  describe("Locale", () => {
    test("Number preview is localized", async () => {
      updateLocale(model, FR_LOCALE);
      addDataValidation(model, "A1", "id", { type: "isEqual", values: ["5.5"] });
      await nextTick();
      expect(fixture.querySelector(".o-dv-preview-description")?.textContent).toContain("5,5");
    });

    test("Date preview is localized", async () => {
      updateLocale(model, FR_LOCALE);
      addDataValidation(model, "A1", "id", {
        type: "dateIs",
        values: ["3/5/2021"],
        dateValue: "exactDate",
      });
      await nextTick();
      expect(fixture.querySelector(".o-dv-preview-description")?.textContent).toContain(
        "05/03/2021"
      );
    });

    test("Formula preview is localized", async () => {
      updateLocale(model, FR_LOCALE);
      addDataValidation(model, "A1", "id", { type: "isEqualText", values: ["=SUM(5.5,3)"] });
      await nextTick();
      expect(fixture.querySelector(".o-dv-preview-description")?.textContent).toContain(
        "=SUM(5,5;3)"
      );
    });

    test("Can input number localized value, and the value is canonicalized when saved", async () => {
      updateLocale(model, FR_LOCALE);
      await simulateClick(".o-dv-add");
      await nextTick();
      await changeCriterionType("isEqual");

      const composer = ".o-dv-settings .o-composer";
      await editStandaloneComposer(composer, "5,5");

      expect(fixture.querySelector(".o-input.o-invalid")).toBeFalsy();
      expect(fixture.querySelector(".o-dv-save")!.classList).not.toContain("o-disabled");

      await simulateClick(".o-dv-save");
      expect(getDataValidationRules(model, sheetId)).toEqual([
        {
          id: expect.any(String),
          criterion: { type: "isEqual", values: ["5.5"] },
          ranges: ["A1"],
        },
      ]);
    });

    test("Can input date localized value, and the value is canonicalized when saved", async () => {
      updateLocale(model, FR_LOCALE);
      await simulateClick(".o-dv-add");
      await nextTick();
      await changeCriterionType("dateIs");

      const composer = ".o-dv-settings .o-composer";
      await editStandaloneComposer(composer, "30/03/2022");

      expect(fixture.querySelector(".o-input.o-invalid")).toBeFalsy();
      expect(fixture.querySelector(".o-dv-save")!.classList).not.toContain("o-disabled");

      await simulateClick(".o-dv-save");
      expect(getDataValidationRules(model, sheetId)).toEqual([
        {
          id: expect.any(String),
          criterion: { type: "dateIs", values: ["3/30/2022"], dateValue: "exactDate" },
          ranges: ["A1"],
        },
      ]);
    });

    test("Can input formula localized value, and the value is canonicalized when saved", async () => {
      updateLocale(model, FR_LOCALE);
      await simulateClick(".o-dv-add");
      await nextTick();
      await changeCriterionType("isEqualText");

      const composer = ".o-dv-settings .o-composer";
      await editStandaloneComposer(composer, "=SUM(5,5; 3)");
      expect(fixture.querySelector(".o-input.o-invalid")).toBeFalsy();
      expect(fixture.querySelector(".o-dv-save")!.classList).not.toContain("o-disabled");

      await simulateClick(".o-dv-save");
      expect(getDataValidationRules(model, sheetId)).toEqual([
        {
          id: expect.any(String),
          criterion: { type: "isEqualText", values: ["=SUM(5.5, 3)"] },
          ranges: ["A1"],
        },
      ]);
    });
  });
});

describe("Integration tests", () => {
  let fixture: HTMLElement;
  let parent: Component;
  let model: Model;

  beforeEach(async () => {
    ({ model, fixture, parent } = await mountSpreadsheet());
  });

  test("cannot edit a range on another sheet", async () => {
    createSheet(model, { sheetId: "s2", name: "Sheet2", activate: false });

    parent.env.openSidePanel("DataValidation");
    await nextTick();

    await click(fixture, ".o-dv-add");
    await nextTick();

    clickCell(model, "A1");
    await nextTick();

    fixture.querySelector<HTMLInputElement>(".o-selection-input input")?.focus();

    model.dispatch("ACTIVATE_NEXT_SHEET");
    await nextTick();

    clickCell(model, "C5");
    await nextTick();
    const range = fixture.querySelector<HTMLInputElement>(".o-selection-input input");
    expect(range?.value).toBe("A1");
  });
});
