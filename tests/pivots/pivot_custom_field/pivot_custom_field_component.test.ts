import { Model } from "../../../src";
import { SidePanel } from "../../../src/components/side_panel/side_panel/side_panel";
import { PivotCustomGroupedField, SpreadsheetChildEnv } from "../../../src/types";
import { setCellContent } from "../../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../../test_helpers/helpers";
import { createModelWithPivot, updatePivot } from "../../test_helpers/pivot_helpers";

let model: Model;
let pivotId: string;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

const TEST_CUSTOM_FIELD: PivotCustomGroupedField = {
  parentField: "Opportunity",
  name: "CustomField",
  groups: [{ name: "MyGroup", values: ["Value1", "Value2"] }],
};

beforeEach(async () => {
  model = createModelWithPivot("A1:I5");
  ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  pivotId = model.getters.getPivotIds()[0];
  setCellContent(model, "A40", "=PIVOT(1)");
});

async function openPivotSidePanel() {
  env.openSidePanel("PivotSidePanel", { pivotId });
  await nextTick();
}

async function openPivotCustomFieldSidePanel(customField?: PivotCustomGroupedField) {
  if (customField) {
    updatePivot(model, pivotId, { customFields: { [customField.name]: customField } });
  }

  const pivot = model.getters.getPivotCoreDefinition(pivotId);
  env.openSidePanel("PivotCustomFieldSidePanel", {
    pivotId,
    customField: customField ? pivot.customFields?.[customField.name] : undefined,
  });
  await nextTick();
}

async function selectAutoCompleteOption(option: string) {
  const valuesEls = fixture.querySelectorAll(".o-autocomplete-value");
  for (const valueEl of valuesEls) {
    if (valueEl.textContent === option) {
      await click(valueEl);
      return;
    }
  }
  throw new Error(
    `Option "${option}" not found in autocomplete values. Options found: ${Array.from(valuesEls)
      .map((el) => el.textContent)
      .join(", ")}`
  );
}

function getTagInputValues(selector: string) {
  return Array.from(fixture.querySelectorAll(selector + " .o-tag")).map((tag) =>
    tag.textContent?.trim()
  );
}

describe("Pivot custom field panel", () => {
  test("Can create a custom field", async () => {
    await openPivotSidePanel();
    await click(fixture, ".o-pivot-columns .add-dimension");
    await click(fixture, ".add-custom-field");

    await click(fixture, ".o-parent-field");
    await selectAutoCompleteOption("Opportunity");

    await click(fixture, ".o-add-group");
    await click(fixture, ".o-custom-group .o-tag-input");
    await selectAutoCompleteOption("my opportunity");

    await click(fixture, ".o-save");

    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toEqual({
      Opportunity2: {
        parentField: "Opportunity",
        name: "Opportunity2",
        groups: [{ name: "Group", values: ["my opportunity"] }],
      },
    });
  });

  test("Can delete a custom field", async () => {
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);
    expect(model.getters.getPivotCoreDefinition(pivotId).customFields?.CustomField).toBeDefined();
    await click(fixture, ".o-delete.o-button-danger");
    expect(model.getters.getPivotCoreDefinition(pivotId).customFields?.CustomField).toBeUndefined();
  });

  test("Can edit a custom field present in the pivot dimensions", async () => {
    updatePivot(model, pivotId, {
      rows: [{ fieldName: "CustomField" }],
      customFields: { CustomField: TEST_CUSTOM_FIELD },
    });
    await openPivotSidePanel();
    await click(fixture, '[title="Edit pivot groups"]');
    expect(".o-sidePanelTitle").toHaveText("Pivot #1 Groups");
    expect(".o-custom-field-name").toHaveValue("CustomField");
  });

  test("Can edit group values", async () => {
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);

    expect(getTagInputValues('[data-id="MyGroup"] .o-tag-input')).toEqual(["Value1", "Value2"]);
    await click(fixture, '[data-id="MyGroup"]  .o-tag-input');
    await selectAutoCompleteOption("my opportunity");
    await click(fixture.querySelectorAll('[data-id="MyGroup"]  .o-tag')[0], ".o-delete");
    expect(getTagInputValues('[data-id="MyGroup"] .o-tag-input')).toEqual([
      "Value2",
      "my opportunity",
    ]);

    await click(fixture, ".o-save");
    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toEqual({
      CustomField: {
        parentField: "Opportunity",
        name: "CustomField",
        groups: [{ name: "MyGroup", values: ["Value2", "my opportunity"] }],
      },
    });
  });

  test("Can edit group name", async () => {
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);
    await setInputValueAndTrigger(".o-custom-group  input.os-input", "New group name");
    await click(fixture, ".o-save");
    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toMatchObject({
      CustomField: {
        groups: [{ name: "New group name", values: ["Value1", "Value2"] }],
      },
    });
  });

  test("Cannot have duplicate group names", async () => {
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);
    await click(fixture, ".o-add-group");
    expect('[data-id="Group"] .os-input').toHaveValue("Group");
    await setInputValueAndTrigger('[data-id="Group"] .os-input', "MyGroup");
    expect('[data-id="MyGroup2"] .os-input').toHaveValue("MyGroup2");
  });

  test("Only char fields are proposed to create a custom field", async () => {
    await openPivotCustomFieldSidePanel();
    await click(fixture, ".o-parent-field");

    const autocompleteValues = Array.from(fixture.querySelectorAll(".o-autocomplete-value")).map(
      (el) => el.textContent?.trim()
    );
    const charFields = ["Contact Name", "Email", "Opportunity", "Salesperson", "Stage"];
    expect(autocompleteValues).toEqual(charFields);
  });

  test("Can change custom field name", async () => {
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);
    expect(".o-custom-field-name").toHaveValue("CustomField");
    await setInputValueAndTrigger(".o-custom-field-name", "NewCustomFieldName");
    await click(fixture, ".o-save");
    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toMatchObject({
      NewCustomFieldName: { name: "NewCustomFieldName" },
    });
  });

  test("Cannot change the custom field name to an existing field name", async () => {
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);
    expect(".o-custom-field-name").toHaveValue("CustomField");
    await setInputValueAndTrigger(".o-custom-field-name", "Opportunity");
    expect(".o-custom-field-name").toHaveValue("Opportunity2");
    await click(fixture, ".o-save");
    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toMatchObject({
      Opportunity2: { name: "Opportunity2" },
    });
  });

  test("Changing a custom field name also updates its occurrences in the pivot definition", async () => {
    const sheetId = model.getters.getActiveSheetId();
    updatePivot(model, pivotId, {
      rows: [{ fieldName: "CustomField" }],
      measures: [
        {
          id: "calc",
          fieldName: "calc",
          aggregator: "count",
          computedBy: { formula: '=CONCAT(CustomField, "string with CustomField")', sheetId },
        },
      ],
      collapsedDomains: {
        ROW: [[{ field: "CustomField", value: "Value1", type: "char" }]],
        COL: [],
      },
      sortedColumn: {
        order: "asc",
        domain: [{ field: "CustomField", value: "val", type: "char" }],
        measure: "calc",
      },
      customFields: { CustomField: TEST_CUSTOM_FIELD },
    });
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);
    await setInputValueAndTrigger(".o-custom-field-name", "NewName");
    await click(fixture, ".o-save");

    expect(model.getters.getPivotCoreDefinition(pivotId)).toMatchObject({
      rows: [{ fieldName: "NewName" }],
      measures: [
        { computedBy: { formula: '=CONCAT(NewName, "string with CustomField")', sheetId } },
      ],
      collapsedDomains: {
        ROW: [[{ field: "NewName", value: "Value1", type: "char" }]],
      },
      sortedColumn: {
        domain: [{ field: "NewName", value: "val", type: "char" }],
      },
      customFields: { NewName: { ...TEST_CUSTOM_FIELD, name: "NewName" } },
    });
  });

  test("Can add a group others with all the non-grouped values", async () => {
    await openPivotCustomFieldSidePanel(TEST_CUSTOM_FIELD);
    await click(fixture, "[name='addOthersGroup']");
    expect('[data-id="Others"] .os-input').toHaveValue("Others");
    expect('[data-id="Others"] i.text-muted').toHaveText("<All ungrouped values>");
    await click(fixture, ".o-save");

    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toMatchObject({
      CustomField: {
        name: "CustomField",
        groups: [
          { name: "MyGroup", values: ["Value1", "Value2"] },
          { name: "Others", values: [], isOtherGroup: true },
        ],
      },
    });
  });
});
