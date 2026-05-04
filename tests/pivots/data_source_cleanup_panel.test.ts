import { Model } from "../../src";
import { DataSourcesCleanup } from "../../src/components/side_panel/data_sources_cleanup/data_sources_cleanup";
import { DataSourcesCleanupStore } from "../../src/components/side_panel/data_sources_cleanup/data_sources_cleanup_store";
import {
  addCfRule,
  addDataValidation,
  createGaugeChart,
  setCellContent,
  simulateClick,
  undo,
} from "../test_helpers";
import { createModelFromGrid, mountComponent, nextTick } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

let model: Model;

beforeEach(() => {
  model = createModelFromGrid({ A1: "Field", A2: "25" });
});

describe("Data source cleanup panel", () => {
  async function mountPanel(model: Model) {
    await mountComponent(DataSourcesCleanup, {
      model,
      props: { onCloseSidePanel: () => {} },
    });
  }

  test("Can remove unused pivots", async () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    addPivot(model, "A1:A2", {}, "pivot2");
    await mountPanel(model);

    expect(model.getters.getPivotIds()).toEqual(["pivot1", "pivot2"]);
    expect("input[name='pivot2']").toHaveCount(1);
    expect("input[name='pivot1']").toHaveCount(1);

    await simulateClick("button.o-button");

    expect("input[name='pivot2']").toHaveCount(0);
    expect("input[name='pivot1']").toHaveCount(0);
    expect(model.getters.getPivotIds()).toEqual([]);

    undo(model);
    await nextTick();

    expect(model.getters.getPivotIds()).toEqual(["pivot1", "pivot2"]);
    expect("input[name='pivot2']").toHaveCount(1);
    expect("input[name='pivot1']").toHaveCount(1);
  });

  test("Can pick which pivots to remove", async () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    addPivot(model, "A1:A2", {}, "pivot2");
    await mountPanel(model);

    await simulateClick("input[name='pivot2']");
    expect("input[name='pivot1']").toHaveValue(true);
    expect("input[name='pivot2']").toHaveValue(false);

    await simulateClick("button.o-button");

    expect("input[name='pivot1']").toHaveCount(0);
    expect("input[name='pivot2']").toHaveCount(1);
    expect(model.getters.getPivotIds()).toEqual(["pivot2"]);
  });

  test("Delete button is not there if there is nothing to remove", async () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    await mountPanel(model);

    await simulateClick("input[name='pivot1']");
    expect("input[name='pivot1']").toHaveValue(false);
    expect("button.o-button").toHaveCount(0);

    await simulateClick("input[name='pivot1']");
    expect("input[name='pivot1']").toHaveValue(true);
    expect("button.o-button").toHaveCount(1);

    await simulateClick("button.o-button");
    expect("input[name='pivot1']").toHaveCount(0);
    expect("button.o-button").toHaveCount(0);
  });
});

describe("Data source cleanup store", () => {
  let store: DataSourcesCleanupStore;
  let sheetId: string;

  beforeEach(() => {
    store = makeStoreWithModel(model, DataSourcesCleanupStore).store;
    sheetId = model.getters.getActiveSheetId();
  });

  function getUnusedPivots() {
    const pivotCategory = store.unusedDataSourcesCategories.find(
      (category) => category.type === "pivot"
    );
    return pivotCategory ? pivotCategory.dataSources.map((pivot) => pivot.id) : [];
  }

  test("Pivots are not detected as unused if they are in a formula", () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    expect(getUnusedPivots()).toEqual(["pivot1"]);

    setCellContent(model, "B1", "=PIVOT(1)");
    expect(getUnusedPivots()).toEqual([]);
  });

  test("Pivots are not detected as unused if used in calculated measures", () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    expect(getUnusedPivots()).toEqual(["pivot1"]);

    addPivot(
      model,
      "A1:A2",
      {
        measures: [
          {
            id: "measure1",
            fieldName: "measure1",
            aggregator: "sum",
            computedBy: { formula: "=SUM(PIVOT(1))", sheetId },
          },
        ],
      },
      "pivot2"
    );
    expect(getUnusedPivots()).toEqual(["pivot2"]);
  });

  test("Pivots are not detected as unused if used in computed formats", () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    expect(getUnusedPivots()).toEqual(["pivot1"]);

    addCfRule(model, "A1", {
      type: "CellIsRule",
      operator: "isEqual",
      values: ["=SUM(PIVOT(1))"],
      style: { fillColor: "#ff0f0f" },
    });
    expect(getUnusedPivots()).toEqual([]);
  });

  test("Pivots are not detected as unused if used in data validation", () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    expect(getUnusedPivots()).toEqual(["pivot1"]);

    addDataValidation(model, "A1", "id", { type: "isEqual", values: ["=SUM(PIVOT(1))"] });
    expect(getUnusedPivots()).toEqual([]);
  });

  test("Pivots are not detected as unused if used in gauge chart", () => {
    addPivot(model, "A1:A2", {}, "pivot1");
    expect(getUnusedPivots()).toEqual(["pivot1"]);

    createGaugeChart(model, {
      sectionRule: {
        rangeMin: "0",
        rangeMax: "100",
        colors: { lowerColor: "#ff0f0f", middleColor: "#ff9900", upperColor: "#00ff00" },
        lowerInflectionPoint: {
          type: "number",
          value: "=SUM(PIVOT(1))",
          operator: "<=",
        },
        upperInflectionPoint: { type: "number", value: "66", operator: "<=" },
      },
    });
    expect(getUnusedPivots()).toEqual([]);
  });
});
