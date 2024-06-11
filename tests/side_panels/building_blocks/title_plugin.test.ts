import { CommandResult, Model, UID } from "../../../src";
import { BarChartDefinition } from "../../../src/types/chart";
import {
  duplicateSheet,
  getCellContent,
  moveColumns,
  setCellContent,
  updateChart,
} from "../../test_helpers";
import { getRuntimeChartTitle } from "../../test_helpers/helpers";

let model: Model;
const figureId = "someuuid";

function getChartConfiguration(model: Model, chartId: UID) {
  const runtime = model.getters.getChartRuntime(chartId) as any;
  return runtime.chartJsConfig;
}

beforeEach(() => {
  model = new Model({
    sheets: [
      {
        name: "Sheet1",
        colNumber: 10,
        rowNumber: 10,
        rows: {},
        cells: {},
        figures: [
          {
            id: figureId,
            tag: "chart",
            width: 400,
            height: 300,
            x: 100,
            y: 100,
            data: {
              type: "bar",
              title: { text: "Monthly Sales" },
              labelRange: "A1:A4",
              dataSets: [{ dataRange: "B1:B4" }],
              dataSetsHaveTitle: true,
              background: "#FFFFFF",
            },
          },
        ],
      },
    ],
  });
});

describe("Title", () => {
  test("Command rejected when using invalid range as cell reference for title", () => {
    const invalidTitleUpdateResult = updateChart(model, figureId, {
      title: { type: "reference", text: "This is an invalid range" },
    });
    expect(invalidTitleUpdateResult).toBeCancelledBecause(CommandResult.InvalidTitleRange);

    const invalidAxisTitleUpdateResult = updateChart(model, figureId, {
      axesDesign: { x: { type: "reference", text: "This is an invalid range" } },
    });
    expect(invalidAxisTitleUpdateResult).toBeCancelledBecause(CommandResult.InvalidTitleRange);
  });

  test("Title updates when it references a cell and the cell content changes", () => {
    setCellContent(model, "A1", "Hello");
    updateChart(model, figureId, {
      title: { type: "reference", text: "A1" },
      axesDesign: { x: { type: "reference", text: "A1" } },
    });
    expect(getRuntimeChartTitle(model, figureId)).toEqual(getCellContent(model, "A1"));
    expect(getChartConfiguration(model, figureId).options.scales.x.title.text).toEqual(
      getCellContent(model, "A1")
    );

    setCellContent(model, "A1", "World");
    expect(getRuntimeChartTitle(model, figureId)).toEqual(getCellContent(model, "A1"));
    expect(getChartConfiguration(model, figureId).options.scales.x.title.text).toEqual(
      getCellContent(model, "A1")
    );
  });

  test("Title updates when it references a cell, and changes are made to sheet ranges", () => {
    setCellContent(model, "A1", "Hello World");
    updateChart(model, figureId, {
      title: { type: "reference", text: "A1" },
      axesDesign: { x: { type: "reference", text: "A1" } },
    });

    moveColumns(model, "B", ["A"]);
    const definition = model.getters.getChartDefinition(figureId) as BarChartDefinition;

    expect(definition.title.text).toBe("B1");
    expect(definition.axesDesign?.x?.text).toBe("B1");
    expect(getRuntimeChartTitle(model, figureId)).toEqual(getCellContent(model, "B1"));
    expect(getChartConfiguration(model, figureId).options.scales.x.title.text).toEqual(
      getCellContent(model, "B1")
    );
  });

  test("Sheet duplication retains the title reference when it's linked to a cell", () => {
    setCellContent(model, "A1", "Hello World");
    updateChart(model, figureId, {
      title: { type: "reference", text: "A1" },
      axesDesign: { x: { type: "reference", text: "A1" } },
    });

    duplicateSheet(model);
    const newChartId = model.getters.getChartIds(model.getters.getActiveSheetId())[0];

    const definition = model.getters.getChartDefinition(newChartId) as BarChartDefinition;
    expect(definition.title.text).toBe("A1");
    expect(definition.axesDesign?.x?.text).toBe("A1");
    expect(getRuntimeChartTitle(model, newChartId)).toEqual(getCellContent(model, "A1"));
    expect(getChartConfiguration(model, newChartId).options.scales.x.title.text).toEqual(
      getCellContent(model, "A1")
    );
  });
});
