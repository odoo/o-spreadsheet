import { parseDateTime } from "@odoo/o-spreadsheet-engine/helpers/dates";
import { LineChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/line_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../../src";
import { ChartPanel } from "../../../src/components/side_panel/chart/main_chart_panel/main_chart_panel";
import { UID } from "../../../src/types";
import { openChartDesignSidePanel } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import {
  createModelFromGrid,
  mockChart,
  mountComponentWithPortalTarget,
} from "../../test_helpers/helpers";

async function mountChartSidePanel(id: UID = chartId, _model: Model) {
  const props = { chartId: id, onCloseSidePanel: () => {} };
  ({ fixture, env } = await mountComponentWithPortalTarget(ChartPanel, { props, model: _model }));
}

let fixture: HTMLElement;
const chartId = "someuuid";

let env: SpreadsheetChildEnv;

mockChart();

describe("charts", () => {
  test("can edit chart time axis limits", async () => {
    const model = createModelFromGrid({
      A2: "=DATE(2022,1,1)",
      A3: "=DATE(2022,1,2)",
    });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B2:B3" }],
        labelRange: "A2:A3",
        type: "line",
        labelsAsText: false,
      },
      chartId
    );
    await mountChartSidePanel(chartId, model);
    await openChartDesignSidePanel(model, env, fixture, chartId);

    const minInput = fixture.querySelector(".time-axis-min-input") as HTMLInputElement;
    expect(minInput.type).toBe("date");
    const locale = model.getters.getLocale();

    await setInputValueAndTrigger(minInput, "2022-01-02");
    let definition = model.getters.getChartDefinition(chartId) as LineChartDefinition;
    expect(definition.axesDesign?.x?.min).toEqual(parseDateTime("2022-01-02", locale)!.value);

    const maxInput = fixture.querySelector(".time-axis-max-input") as HTMLInputElement;
    await setInputValueAndTrigger(maxInput, "2022-01-04");
    definition = model.getters.getChartDefinition(chartId) as LineChartDefinition;
    expect(definition.axesDesign?.x?.max).toEqual(parseDateTime("2022-01-04", locale)!.value);
  });

  test("Axis scale type is not editable for time axis", async () => {
    const model = createModelFromGrid({
      A2: "=DATE(2022,1,1)",
      A3: "=DATE(2022,1,2)",
    });
    createChart(
      model,
      {
        dataSets: [{ dataRange: "B2:B3" }],
        labelRange: "A2:A3",
        type: "line",
        labelsAsText: false,
      },
      chartId
    );
    await mountChartSidePanel(chartId, model);
    await openChartDesignSidePanel(model, env, fixture, chartId);

    expect('[data-testid="axis-scale-select"]').toHaveCount(0);
  });
});
