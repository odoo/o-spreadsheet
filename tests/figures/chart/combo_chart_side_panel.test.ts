import { Model, Spreadsheet } from "../../../src";
import { createChart } from "../../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../../test_helpers/constants";
import { click } from "../../test_helpers/dom_helper";
import { mockChart, mountSpreadsheet, nextTick, spyDispatch } from "../../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

mockGetBoundingClientRect({
  "o-popover": () => ({ height: 0, width: 0 }),
  "o-spreadsheet": () => ({ top: 100, left: 200, height: 1000, width: 1000 }),
  "o-figure-menu-item": () => ({ top: 500, left: 500 }),
});

function createComboChart() {
  createChart(model, { ...TEST_CHART_DATA.basicChart, type: "combo" }, chartId);
}

async function openChartConfigSidePanel(id = chartId) {
  model.dispatch("SELECT_FIGURE", { id });
  parent.env.openSidePanel("ChartPanel");
  await nextTick();
}

let fixture: HTMLElement;
let model: Model;
let chartId: string;
let sheetId: string;

let parent: Spreadsheet;

mockChart();

describe("combo chart", () => {
  beforeEach(async () => {
    chartId = "someuuid";
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
    ({ parent, model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
  });

  test("can switch vertical axis for line series", async () => {
    createComboChart();
    await openChartConfigSidePanel();
    const dispatch = spyDispatch(parent);
    await click(fixture.querySelector(".o-use-right-axis input[type=checkbox]")!);
    expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
      id: chartId,
      sheetId,
      definition: {
        ...model.getters.getChartDefinition(chartId),
        useBothYAxis: true,
      },
    });
  });
});
