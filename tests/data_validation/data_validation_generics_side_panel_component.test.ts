import { Model } from "../../src";
import { DataValidationPanel } from "../../src/components/side_panel/data_validation/data_validation_panel";
import { UID } from "../../src/types";
import { addDataValidation, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { click, setInputValueAndTrigger, simulateClick } from "../test_helpers/dom_helper";
import {
  getDataValidationRules,
  mountComponentWithPortalTarget,
  nextTick,
} from "../test_helpers/helpers";

export async function mountDataValidationPanel(model?: Model) {
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

  test.each([
    ["textContains", { values: ["str"] }, 'Text contains "str"'],
    ["textNotContains", { values: ["str"] }, 'Text does not contain "str"'],
    ["textIs", { values: ["str"] }, 'Text is exactly "str"'],
    ["textIsEmail", { values: [] }, "Text is valid email"],
    ["textIsLink", { values: [] }, "Text is valid link"],
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

    const valuesInputs = fixture.querySelectorAll(".o-dv-settings input");
    for (let i = 0; i < criterion.values.length; i++) {
      await setInputValueAndTrigger(valuesInputs[i], criterion.values[i]);
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

  test("Invalid input values with single input", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    await changeCriterionType("dateIs");

    setInputValueAndTrigger(".o-selection-input input", "A1:A5");

    const valuesInput = fixture.querySelector(".o-dv-settings input");
    await setInputValueAndTrigger(valuesInput, "thisIsNotADate");

    expect(fixture.querySelector(".o-input.o-invalid")).toBeTruthy();
    expect(fixture.querySelector(".o-dv-save")!.classList).toContain("o-disabled");
  });

  test("Invalid input values with two inputs", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    await changeCriterionType("isBetween");

    setInputValueAndTrigger(".o-selection-input input", "A1:A5");

    const valuesInputs = fixture.querySelectorAll(".o-dv-settings input");
    await setInputValueAndTrigger(valuesInputs[0], "Not a number");
    await setInputValueAndTrigger(valuesInputs[1], "Neither is this");

    expect(fixture.querySelectorAll(".o-input.o-invalid")).toHaveLength(2);
    expect(fixture.querySelector(".o-dv-save")!.classList).toContain("o-disabled");
  });

  test("Can make the rule blocking", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();

    setInputValueAndTrigger(".o-dv-settings input", "Random text");
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
      addDataValidation(model, "A1", "id", { type: "textIs", values: ["=SUM(5.5,3)"] });
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

      const valuesInput = fixture.querySelector(".o-dv-settings input");
      await setInputValueAndTrigger(valuesInput, "5,5");

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

      const valuesInput = fixture.querySelector(".o-dv-settings input");
      await setInputValueAndTrigger(valuesInput, "30/03/2022");

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
      await changeCriterionType("textIs");

      const valuesInput = fixture.querySelector(".o-dv-settings input");
      await setInputValueAndTrigger(valuesInput, "=SUM(5,5; 3)");

      expect(fixture.querySelector(".o-input.o-invalid")).toBeFalsy();
      expect(fixture.querySelector(".o-dv-save")!.classList).not.toContain("o-disabled");

      await simulateClick(".o-dv-save");
      expect(getDataValidationRules(model, sheetId)).toEqual([
        {
          id: expect.any(String),
          criterion: { type: "textIs", values: ["=SUM(5.5, 3)"] },
          ranges: ["A1"],
        },
      ]);
    });
  });
});
