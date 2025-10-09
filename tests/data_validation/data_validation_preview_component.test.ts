import { Component } from "@odoo/owl";
import { Model } from "../../src";
import { DataValidationPreview } from "../../src/components/side_panel/data_validation/dv_preview/dv_preview";
import { toZone } from "../../src/helpers";
import { criterionEvaluatorRegistry } from "../../src/registries/criterion_registry";
import { DataValidationRuleData, DEFAULT_LOCALE, SpreadsheetChildEnv } from "../../src/types";
import { DataValidationCriterion } from "../../src/types/data_validation";
import { updateLocale } from "../test_helpers/commands_helpers";
import { click, triggerMouseEvent } from "../test_helpers/dom_helper";
import {
  flattenHighlightRange,
  getHighlightsFromStore,
  mountComponent,
  spyModelDispatch,
} from "../test_helpers/helpers";

const testDataValidationRule: DataValidationRuleData = {
  id: "id",
  ranges: ["A1"],
  criterion: { type: "containsText", values: ["foo"] },
};

describe("Data validation preview", () => {
  let fixture: HTMLElement;
  let model: Model;
  let parent: Component;
  let env: SpreadsheetChildEnv;

  async function mountDataValidationPreview(ruleData: DataValidationRuleData) {
    model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const rule = {
      ...ruleData,
      id: "1",
      ranges: ruleData.ranges.map((range) => model.getters.getRangeFromSheetXC(sheetId, range)),
    };
    ({ fixture, model, parent, env } = await mountComponent(DataValidationPreview, {
      props: { rule },
    }));
  }

  test("Single range is displayed", async () => {
    const rule = { ...testDataValidationRule, ranges: ["A1"] };
    await mountDataValidationPreview(rule);

    const displayedRange = fixture.querySelector(".o-dv-preview-ranges") as HTMLElement;
    expect(displayedRange.textContent).toBe("A1");
  });

  test("Multiple ranges are displayed", async () => {
    const rule = { ...testDataValidationRule, ranges: ["A1", "A2"] };
    await mountDataValidationPreview(rule);

    const displayedRange = fixture.querySelector(".o-dv-preview-ranges") as HTMLElement;
    expect(displayedRange.textContent).toBe("A1, A2");
  });

  test("Can delete rule from preview", async () => {
    await mountDataValidationPreview(testDataValidationRule);
    const spyDispatch = spyModelDispatch(model);
    const sheetId = model.getters.getActiveSheetId();
    click(fixture, ".o-dv-delete-button");
    expect(spyDispatch).toHaveBeenCalledWith("REMOVE_DATA_VALIDATION_RULE", {
      id: "1",
      sheetId,
    });
  });

  test("Ranges of hovered previews are highlighted", async () => {
    const rule = { ...testDataValidationRule, ranges: ["A1", "A3"] };
    await mountDataValidationPreview(rule);
    expect(getHighlightsFromStore(env)).toEqual([]);
    triggerMouseEvent(".o-dv-preview", "mouseenter");
    expect(getHighlightsFromStore(env).map(flattenHighlightRange)).toMatchObject([
      { zone: toZone("A1") },
      { zone: toZone("A3") },
    ]);
    triggerMouseEvent(".o-dv-preview", "mouseleave");
    expect(getHighlightsFromStore(env)).toEqual([]);
  });

  test("Highlights disappear when preview is unmounted", async () => {
    await mountDataValidationPreview(testDataValidationRule);
    triggerMouseEvent(".o-dv-preview", "mouseenter");
    expect(getHighlightsFromStore(env)).not.toEqual([]);
    parent.__owl__.destroy();
    expect(getHighlightsFromStore(env)).toEqual([]);
  });

  describe("Date rules previews", () => {
    beforeEach(() => {
      model = new Model();
    });

    function getCriterionPreview(criterion: DataValidationCriterion) {
      return criterionEvaluatorRegistry
        .get(criterion.type)
        .getPreview(criterion, model.getters)
        .toString();
    }

    test("dateIs with exact date", () => {
      const description = getCriterionPreview({
        type: "dateIs",
        values: ["1/1/2001"],
        dateValue: "exactDate",
      });
      expect(description).toBe("Date is 1/1/2001");
    });

    test("dateIs with relative dates", () => {
      const criterion: DataValidationCriterion = {
        type: "dateIs",
        values: [],
        dateValue: "tomorrow",
      };

      let description = getCriterionPreview({ ...criterion, dateValue: "tomorrow" });
      expect(description).toBe("Date is tomorrow");

      description = getCriterionPreview({ ...criterion, dateValue: "yesterday" });
      expect(description).toBe("Date is yesterday");

      description = getCriterionPreview({ ...criterion, dateValue: "today" });
      expect(description).toBe("Date is today");

      description = getCriterionPreview({ ...criterion, dateValue: "lastWeek" });
      expect(description).toBe("Date is in the past week");

      description = getCriterionPreview({ ...criterion, dateValue: "lastMonth" });
      expect(description).toBe("Date is in the past month");

      description = getCriterionPreview({ ...criterion, dateValue: "lastYear" });
      expect(description).toBe("Date is in the past year");
    });

    test("Number in exactDate value is formatted as a date", () => {
      const description = getCriterionPreview({
        type: "dateIs",
        values: ["0"],
        dateValue: "exactDate",
      });
      expect(description).toBe("Date is 12/30/1899");
    });

    test("Date is formatted based on locale", () => {
      updateLocale(model, { ...DEFAULT_LOCALE, dateFormat: "yyyy-mm-dd" });

      const description = getCriterionPreview({
        type: "dateIs",
        values: ["0"],
        dateValue: "exactDate",
      });
      expect(description).toBe("Date is 1899-12-30");
    });
  });
});
