import { Model } from "../../../src";
import { ChartPanel } from "../../../src/components/side_panel/chart/main_chart_panel/main_chart_panel";
import { SpreadsheetChildEnv } from "../../../src/types";
import { openChartDesignSidePanel } from "../../test_helpers/chart_helpers";
import { createChart } from "../../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";

async function mountChartSidePanel(figureId = chartId) {
  const props = { figureId, onCloseSidePanel: () => {} };
  ({ fixture, env } = await mountComponentWithPortalTarget(ChartPanel, { props, model }));
}

let fixture: HTMLElement;
let model: Model;
const chartId = "someuuid";
let sheetId: string;

let env: SpreadsheetChildEnv;

describe("combo charts", () => {
  beforeEach(async () => {
    sheetId = "Sheet1";
    const data = {
      sheets: [
        {
          name: sheetId,
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            B1: { content: "first column dataset" },
            C1: { content: "second column dataset" },
            B2: { content: "10" },
            B3: { content: "11" },
            B4: { content: "12" },
            B5: { content: "13" },
            C2: { content: "20" },
            C3: { content: "19" },
            C4: { content: "18" },
            A2: { content: "P1" },
            A3: { content: "P2" },
            A4: { content: "P3" },
            A5: { content: "P4" },
          },
        },
      ],
    };
    model = new Model(data);
  });

  test("can edit chart data series type", async () => {
    createChart(
      model,
      {
        dataSets: [
          { dataRange: "B1:B4", label: "serie_1" },
          { dataRange: "C1:C4", type: "bar" },
        ],
        labelRange: "A2:A4",
        type: "combo",
      },
      chartId
    );
    await mountChartSidePanel();
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await setInputValueAndTrigger(".data-series-selector", "serie_1");
    await click(fixture, ".o-series-type-selection input[value=bar]");
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).dataSets[0]).toEqual({
      dataRange: "B1:B4",
      label: "serie_1",
      type: "bar",
    });

    await click(fixture, ".o-series-type-selection input[value=line]");
    //@ts-ignore
    expect(model.getters.getChartDefinition(chartId).dataSets[0]).toEqual({
      dataRange: "B1:B4",
      label: "serie_1",
      type: "line",
    });
  });
});
