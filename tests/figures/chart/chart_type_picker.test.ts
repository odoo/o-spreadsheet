import { Model } from "../../../src";
import { ChartTypePicker } from "../../../src/components/side_panel/chart/chart_type_picker/chart_type_picker";
import { MainChartPanelStore } from "../../../src/components/side_panel/chart/main_chart_panel/main_chart_panel_store";
import { createChart } from "../../test_helpers/commands_helpers";
import { click, pointerDown } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";
import { makeStoreWithModel } from "../../test_helpers/stores";

let model: Model;
let chartId = "chartId";
let chartPanelStore: MainChartPanelStore;
let fixture: HTMLElement;

describe("Chart type picker component", () => {
  beforeEach(async () => {
    model = new Model();
    createChart(model, { type: "bar" }, chartId);
    ({ store: chartPanelStore } = makeStoreWithModel(model, MainChartPanelStore));
    const props = { figureId: chartId, chartPanelStore };
    ({ fixture } = await mountComponentWithPortalTarget(ChartTypePicker, { model, props }));
  });

  test("Clicking on the input toggle the popover", async () => {
    expect(fixture.querySelector(".o-chart-select-popover")).toBeNull();

    await pointerDown(".o-type-selector");
    expect(fixture.querySelector(".o-chart-select-popover")).not.toBeNull();

    await pointerDown(".o-type-selector");
    expect(fixture.querySelector(".o-chart-select-popover")).toBeNull();
  });

  test("Clicking outside the popover closes it", async () => {
    await pointerDown(".o-type-selector");
    expect(fixture.querySelector(".o-chart-select-popover")).not.toBeNull();

    await pointerDown(".o-chart-select-popover");
    expect(fixture.querySelector(".o-chart-select-popover")).not.toBeNull();

    await pointerDown(document.body);
    expect(fixture.querySelector(".o-chart-select-popover")).toBeNull();
  });

  test("Current chart type is selected", async () => {
    const select = fixture.querySelector(".o-type-selector") as HTMLSelectElement;
    expect(select.value).toBe("column");

    await pointerDown(".o-type-selector");
    expect(fixture.querySelector<HTMLElement>(".o-chart-type-item.selected")?.dataset.id).toBe(
      "column"
    );
  });

  test("Can change the chart type ", async () => {
    const select = fixture.querySelector(".o-type-selector") as HTMLSelectElement;
    expect(select.value).toBe("column");

    await pointerDown(".o-type-selector");
    expect(fixture.querySelector(".o-chart-select-popover")).not.toBeNull();
    await click(fixture.querySelector(".o-chart-type-item[data-id='line']") as HTMLElement);

    expect(fixture.querySelector(".o-chart-select-popover")).toBeNull();
    expect(select.value).toBe("line");
    expect(model.getters.getChartDefinition(chartId).type).toBe("line");
  });
});
