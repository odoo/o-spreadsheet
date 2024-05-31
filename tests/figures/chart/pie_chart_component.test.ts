import { Model } from "../../../src";
import { toHex } from "../../../src/helpers";
import { Color } from "../../../src/types";
import { PieChartRuntime } from "../../../src/types/chart";
import { createChart } from "../../test_helpers/commands_helpers";
import { mountSpreadsheet } from "../../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

mockGetBoundingClientRect({
  "o-popover": () => ({ height: 0, width: 0 }),
  "o-spreadsheet": () => ({ top: 100, left: 200, height: 1000, width: 1000 }),
  "o-figure-menu-item": () => ({ top: 500, left: 500 }),
});

let model: Model;
let chartId: string;
let sheetId: string;

describe("charts", () => {
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
            B1: { content: "Bruxelles" },
            B2: { content: "Paris" },
            B3: { content: "London" },
            C1: { content: "1" },
            C2: { content: "2" },
            C3: { content: "3" },
            D1: { content: "4" },
            D2: { content: "5" },
            D3: { content: "6" },
          },
        },
      ],
    };
    ({ model } = await mountSpreadsheet({ model: new Model(data) }));
  });

  test("DataSets colors adapt according to chart hovering event", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:D3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: false,
        type: "pie",
      },
      chartId
    );
    const config = (model.getters.getChartRuntime(chartId) as PieChartRuntime).chartJsConfig;
    const datasets = config.data.datasets;
    const previousColor = (datasets[1]!.backgroundColor! as Color[]).map((color) => toHex(color));
    const onHover = config?.options?.onHover;
    expect(onHover).toBeDefined();
    //@ts-ignore
    onHover(undefined, [{ index: 0 }], { data: { datasets: datasets }, update: jest.fn() });
    let newColor = (datasets[1]!.backgroundColor! as Color[]).map((color) => toHex(color));
    expect(newColor[0]).toBe(previousColor[0]);
    for (let i = 1; i < previousColor.length; i++) {
      expect(newColor[i]).toBe(previousColor[i] + "80");
    }
    //@ts-ignore
    onHover(undefined, [], { data: { datasets: datasets }, update: jest.fn() });
    newColor = (datasets[1]!.backgroundColor! as Color[]).map((color) => toHex(color));
    for (let i = 0; i < previousColor.length; i++) {
      expect(newColor[i]).toBe(previousColor[i]);
    }
  });

  test("DataSets colors adapt according to legend hovering event", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:D3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: false,
        type: "pie",
        legendPosition: "top",
      },
      chartId
    );
    const config = (model.getters.getChartRuntime(chartId) as PieChartRuntime).chartJsConfig;
    const datasets = config.data.datasets;
    const previousColor = (datasets[1]!.backgroundColor! as Color[]).map((color) => toHex(color));
    const onHover = config?.options?.plugins?.legend?.onHover;
    expect(onHover).toBeDefined();
    const onLeave = config?.options?.plugins?.legend?.onLeave;
    expect(onLeave).toBeDefined();
    //@ts-ignore
    onHover(
      undefined,
      { index: 0 },
      { chart: { data: { datasets: datasets }, update: jest.fn() } }
    );
    let newColor = (datasets[0]!.backgroundColor! as Color[]).map((color) => toHex(color));
    expect(newColor[0]).toBe(previousColor[0]);
    for (let i = 1; i < previousColor.length; i++) {
      expect(newColor[i]).toBe(previousColor[i] + "80");
    }
    //@ts-ignore
    onLeave(undefined, undefined, { chart: { data: { datasets: datasets }, update: jest.fn() } });
    newColor = (datasets[0]!.backgroundColor! as Color[]).map((color) => toHex(color));
    for (let i = 0; i < previousColor.length; i++) {
      expect(newColor[i]).toBe(previousColor[i]);
    }
  });
});
