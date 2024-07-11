import { Model, PivotCoreMeasure, UID } from "../../../src";
import { PivotMeasureDisplayPanel } from "../../../src/components/side_panel/pivot/pivot_measure_display_panel/pivot_measure_display_panel";
import { toZone } from "../../../src/helpers";
import { setCellContent, setFormat } from "../../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponent } from "../../test_helpers/helpers";
import { addPivot, updatePivot } from "../../test_helpers/pivot_helpers";

let model: Model;
let pivotId: UID = "pivotId";
let sheetId: UID;
let fixture: HTMLElement;
let openSidePanelSpy: jest.Mock;

function getPivotMeasures() {
  return model.getters.getPivotCoreDefinition(pivotId).measures;
}

describe("Standalone side panel tests", () => {
  openSidePanelSpy = jest.fn();
  async function mountPanel(measure?: PivotCoreMeasure) {
    ({ fixture } = await mountComponent(PivotMeasureDisplayPanel, {
      model,
      env: { openSidePanel: openSidePanelSpy },
      props: {
        onCloseSidePanel: () => {},
        pivotId: pivotId,
        measure: measure || { fieldName: "TestMeasure", aggregator: "count", id: "m1" },
      },
    }));
  }

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "TestMeasure");
    addPivot(
      model,
      "A1:A2",
      { measures: [{ fieldName: "TestMeasure", aggregator: "count", id: "m1" }] },
      pivotId
    );
  });

  test("Initial panel state is correct", async () => {
    setCellContent(model, "B1", "FieldA");
    setCellContent(model, "B2", "Alice");
    setCellContent(model, "B3", "Bob");
    setCellContent(model, "C1", "FieldB");
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "FieldA" }, { fieldName: "FieldB" }],
      dataSet: { sheetId, zone: toZone("A1:C3") },
    });

    await mountPanel({
      fieldName: "MyTestMeasure",
      aggregator: "count",
      id: "m1",
      display: { type: "%_of", fieldNameWithGranularity: "FieldA", value: "Alice" },
    });
    expect(".o-pivot-measure-display-type").toHaveValue("%_of");
    expect(".o-pivot-measure-display-field input[name=FieldA]").toHaveValue(true);
    expect(".o-pivot-measure-display-value input[name=Alice]").toHaveValue(true);
  });

  test("Can change measure display type", async () => {
    await mountPanel();
    await setInputValueAndTrigger(".o-pivot-measure-display-type", "index");
    expect(".o-pivot-measure-display-type").toHaveValue("index");
    expect(getPivotMeasures()[0].display).toEqual({ type: "index" });
  });

  test("Can change base field of measure display type that requires it", async () => {
    setCellContent(model, "B1", "FieldA");
    setCellContent(model, "C1", "FieldB");
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "FieldA" }, { fieldName: "FieldB" }],
      dataSet: { sheetId, zone: toZone("A1:C2") },
    });
    await mountPanel();
    expect(".o-pivot-measure-display-field").toHaveCount(0);

    await setInputValueAndTrigger(".o-pivot-measure-display-type", "%_of_parent_total");
    expect(".o-pivot-measure-display-field").toHaveCount(1);
    expect(".o-pivot-measure-display-field input").toHaveCount(2);
    expect(".o-pivot-measure-display-field input[name=FieldA]").toHaveValue(true);
    expect(".o-pivot-measure-display-field input[name=FieldB]").toHaveValue(false);
    expect(model.getters.getPivotCoreDefinition(pivotId).measures[0].display).toEqual({
      type: "%_of_parent_total",
      fieldNameWithGranularity: "FieldA",
    });

    await click(fixture, ".o-pivot-measure-display-field input[name=FieldB]");
    expect(".o-pivot-measure-display-field input[name=FieldA]").toHaveValue(false);
    expect(".o-pivot-measure-display-field input[name=FieldB]").toHaveValue(true);
    expect(model.getters.getPivotCoreDefinition(pivotId).measures[0].display).toEqual({
      type: "%_of_parent_total",
      fieldNameWithGranularity: "FieldB",
    });
  });

  test("Base field have a placeholder when the pivot has no active fields", async () => {
    await mountPanel();
    await setInputValueAndTrigger(".o-pivot-measure-display-type", "%_of_parent_total");
    expect(".o-pivot-measure-display-field").toHaveText("No active dimension in the pivot");
  });

  test("Can change base value of measure display type that requires it", async () => {
    setCellContent(model, "B1", "FieldA");
    setCellContent(model, "B2", "Alice");
    setCellContent(model, "B3", "Bob");
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "FieldA" }],
      dataSet: { sheetId, zone: toZone("A1:B3") },
    });
    await mountPanel();
    expect(".o-pivot-measure-display-value").toHaveCount(0);

    await setInputValueAndTrigger(".o-pivot-measure-display-type", "%_of");
    expect(".o-pivot-measure-display-value").toHaveCount(1);
    expect(".o-pivot-measure-display-value input").toHaveCount(4);
    expect('.o-pivot-measure-display-value input[name="(previous)"]').toHaveValue(true);
    expect('.o-pivot-measure-display-value input[name="Alice"]').toHaveValue(false);

    await click(fixture, '.o-pivot-measure-display-value input[name="Alice"]');
    expect('.o-pivot-measure-display-value input[name="(previous)"]').toHaveValue(false);
    expect('.o-pivot-measure-display-value input[name="Alice"]').toHaveValue(true);
    expect(model.getters.getPivotCoreDefinition(pivotId).measures[0].display).toEqual({
      type: "%_of",
      fieldNameWithGranularity: "FieldA",
      value: "Alice",
    });
  });

  test("Changing the base field change the selected value to a valid one", async () => {
    setCellContent(model, "B1", "FieldA");
    setCellContent(model, "B2", "Alice");
    setCellContent(model, "C1", "FieldB");
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "FieldA" }, { fieldName: "FieldB" }],
      dataSet: { sheetId, zone: toZone("A1:C3") },
    });
    await mountPanel();
    await setInputValueAndTrigger(".o-pivot-measure-display-type", "%_of");

    await click(fixture, '.o-pivot-measure-display-value input[name="Alice"]');
    expect(model.getters.getPivotCoreDefinition(pivotId).measures[0].display).toEqual({
      type: "%_of",
      fieldNameWithGranularity: "FieldA",
      value: "Alice",
    });

    await click(fixture, '.o-pivot-measure-display-field input[name="FieldB"]');
    expect(model.getters.getPivotCoreDefinition(pivotId).measures[0].display).toEqual({
      type: "%_of",
      fieldNameWithGranularity: "FieldB",
      value: "(previous)",
    });
  });

  test("Values are formatted in the side panel", async () => {
    setCellContent(model, "B1", "FieldA");
    setCellContent(model, "B2", "5");
    setFormat(model, "B2", "#,##0[$ Tabourets]");
    setCellContent(model, "C1", "FieldB");
    setCellContent(model, "C2", "01/01/2021");
    updatePivot(model, pivotId, {
      columns: [
        { fieldName: "FieldA" },
        { fieldName: "FieldB", granularity: "month_number" },
        { fieldName: "FieldB", granularity: "day" },
      ],
      dataSet: { sheetId, zone: toZone("A1:C2") },
    });
    await mountPanel();
    await setInputValueAndTrigger(".o-pivot-measure-display-type", "%_of");

    expect(fixture.querySelectorAll(".o-pivot-measure-display-value label")[2]).toHaveText(
      "5 Tabourets"
    );

    await click(fixture, '.o-pivot-measure-display-field input[name="FieldB:month_number"]');
    expect(fixture.querySelectorAll(".o-pivot-measure-display-value label")[2]).toHaveText(
      "January"
    );

    await click(fixture, '.o-pivot-measure-display-field input[name="FieldB:day"]');
    expect(fixture.querySelectorAll(".o-pivot-measure-display-value label")[2]).toHaveText(
      "1/1/2021"
    );
  });

  test("Can change base value of measure display type that requires it", async () => {
    setCellContent(model, "B1", "FieldA");
    setCellContent(model, "B2", "Alice");
    setCellContent(model, "B3", "Bob");
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "FieldA" }],
      dataSet: { sheetId, zone: toZone("A1:B3") },
    });
    await mountPanel();
    expect(".o-pivot-measure-display-value").toHaveCount(0);

    await setInputValueAndTrigger(".o-pivot-measure-display-type", "%_of");
    expect(".o-pivot-measure-display-value").toHaveCount(1);
    expect(".o-pivot-measure-display-value input").toHaveCount(4);
    expect('.o-pivot-measure-display-value input[name="(previous)"]').toHaveValue(true);
    expect('.o-pivot-measure-display-value input[name="Alice"]').toHaveValue(false);

    await click(fixture, '.o-pivot-measure-display-value input[name="Alice"]');
    expect('.o-pivot-measure-display-value input[name="(previous)"]').toHaveValue(false);
    expect('.o-pivot-measure-display-value input[name="Alice"]').toHaveValue(true);
    expect(model.getters.getPivotCoreDefinition(pivotId).measures[0].display).toEqual({
      type: "%_of",
      fieldNameWithGranularity: "FieldA",
      value: "Alice",
    });
  });

  test("Saving the display opens back the pivot side panel", async () => {
    await mountPanel();
    await click(fixture, ".o-pivot-measure-save");

    expect(openSidePanelSpy).toHaveBeenCalledWith("PivotSidePanel", { pivotId });
  });

  test("Can cancel the edition of the measure display", async () => {
    await mountPanel();
    expect(getPivotMeasures()[0].display).toEqual(undefined);

    await setInputValueAndTrigger(".o-pivot-measure-display-type", "%_of_grand_total");
    expect(getPivotMeasures()[0].display).toEqual({ type: "%_of_grand_total" });

    await click(fixture, ".o-pivot-measure-cancel");
    expect(openSidePanelSpy).toHaveBeenCalledWith("PivotSidePanel", { pivotId });
    expect(getPivotMeasures()[0].display).toEqual(undefined);
  });
});
