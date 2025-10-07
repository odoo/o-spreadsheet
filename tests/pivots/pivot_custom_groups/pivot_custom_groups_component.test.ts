import { Model } from "../../../src";
import { SidePanels } from "../../../src/components/side_panel/side_panels/side_panels";
import { PivotCustomGroupedField } from "../../../src/types";
import { SpreadsheetChildEnv } from "../../../src/types/spreadsheetChildEnv";
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
  ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  pivotId = model.getters.getPivotIds()[0];
  setCellContent(model, "A40", "=PIVOT(1)");
});

async function openPivotSidePanel() {
  env.openSidePanel("PivotSidePanel", { pivotId });
  await nextTick();
}

describe("Pivot custom field panel", () => {
  test("Can edit group name", async () => {
    updatePivot(model, pivotId, {
      rows: [{ fieldName: "CustomField" }],
      customFields: { CustomField: TEST_CUSTOM_FIELD },
    });
    await openPivotSidePanel();
    await setInputValueAndTrigger(".o-pivot-custom-group  input.os-input", "New group name");
    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toMatchObject({
      CustomField: {
        groups: [{ name: "New group name", values: ["Value1", "Value2"] }],
      },
    });
  });

  test("Can delete a group", async () => {
    updatePivot(model, pivotId, {
      rows: [{ fieldName: "CustomField" }],
      customFields: { CustomField: TEST_CUSTOM_FIELD },
    });
    await openPivotSidePanel();
    await click(fixture, ".o-pivot-custom-group  .fa-trash");
    const definition = model.getters.getPivotCoreDefinition(pivotId);
    expect(definition.customFields?.CustomField.groups).toEqual([]);
  });

  test("Can add a group with all the non-grouped values", async () => {
    updatePivot(model, pivotId, {
      rows: [{ fieldName: "CustomField" }],
      customFields: { CustomField: TEST_CUSTOM_FIELD },
    });
    await openPivotSidePanel();
    await click(fixture, ".o-add-others-group");

    expect(".o-add-others-group").toHaveCount(0);
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

  test("Cannot have duplicate group names", async () => {
    updatePivot(model, pivotId, {
      rows: [{ fieldName: "CustomField" }],
      customFields: {
        CustomField: {
          parentField: "Opportunity",
          name: "CustomField",
          groups: [{ name: "Others", values: ["Value1", "Value2"] }],
        },
      },
    });
    await openPivotSidePanel();
    await click(fixture, ".o-add-others-group");

    expect(model.getters.getPivotCoreDefinition(pivotId).customFields).toMatchObject({
      CustomField: {
        name: "CustomField",
        groups: [
          { name: "Others", values: ["Value1", "Value2"] },
          { name: "Others2", values: [], isOtherGroup: true },
        ],
      },
    });
  });
});
