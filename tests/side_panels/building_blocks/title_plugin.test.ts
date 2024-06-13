import { CommandResult, Model, UID } from "../../../src";
import { BarChartDefinition } from "../../../src/types/chart";
import {
  createChart,
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
              title: { type: "string", text: "Monthly Sales" },
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
  test("Can Change chart title manually", () => {
    let options = getChartConfiguration(model, figureId).options;
    expect(options!.plugins!.title!.text).toEqual("Monthly Sales");

    updateChart(model, figureId, { title: { type: "string", text: "newTitle" } });
    options = getChartConfiguration(model, figureId).options;
    expect(options!.plugins!.title!.text).toEqual("newTitle");
  });

  test("Hides chart title when it's empty", () => {
    expect(getChartConfiguration(model, figureId).options?.plugins?.title?.display).toBe(true);
    updateChart(model, figureId, { title: { type: "string", text: "" } });
    expect(getChartConfiguration(model, figureId).options?.plugins?.title?.display).toBe(false);
  });

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

  test.each(["line", "bar", "pie", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Title alignment is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: { type: "string", text: "title" },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("start");
      updateChart(model, "1", {
        title: { type: "string", text: "title", design: { align: "center" } },
      });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("center");
      updateChart(model, "1", {
        title: { type: "string", text: "title", design: { align: "right" } },
      });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("end");
      updateChart(model, "1", {
        title: { type: "string", text: "title", design: { align: "left" } },
      });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.align).toBe("start");
    }
  );
  test.each(["line", "bar", "pie", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Title color is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: {
            type: "string",
            text: "title",
            design: { color: "#f00" },
          },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.color).toBe("#f00");
    }
  );

  test.each(["line", "bar", "pie", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Title bold style is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: {
            type: "string",
            text: "title",
            design: { bold: true },
          },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        weight: "bold",
      });
      updateChart(model, "1", {
        title: { type: "string", text: "title", design: { bold: false } },
      });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        weight: "normal",
      });
    }
  );

  test.each(["line", "bar", "pie", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Title italic style is taken into account",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          title: {
            type: "string",
            text: "title",
            design: { italic: true },
          },
          type,
        },
        "1"
      );
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        style: "italic",
      });
      updateChart(model, "1", {
        title: { type: "string", text: "title", design: { italic: false } },
      });
      expect(getChartConfiguration(model, "1").options?.plugins?.title?.font).toMatchObject({
        style: "normal",
      });
    }
  );

  test.each(["line", "bar", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Axis title alignment is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              type: "string",
              text: "test",
              design: {},
            },
          },
        },
        "1"
      );
      let scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("center");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            type: "string",
            text: "test",
            design: { align: "left" },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("start");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            type: "string",
            text: "test",
            design: { align: "center" },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("center");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            type: "string",
            text: "test",
            design: { align: "right" },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].align).toEqual("end");
    }
  );

  test.each(["line", "bar", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Axis title color is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              type: "string",
              text: "test",
              design: { color: "#f00" },
            },
          },
        },
        "1"
      );
      const options = getChartConfiguration(model, "1").options;
      expect(options!.scales!.x!["title"].color).toEqual("#f00");
    }
  );

  test.each(["line", "bar", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Axis bold style is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              type: "string",
              text: "test",
            },
          },
        },
        "1"
      );
      let scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].font.weight).toEqual("normal");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            type: "string",
            text: "test",
            design: { bold: true },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales!.x!["title"].font.weight).toEqual("bold");
    }
  );

  test.each(["line", "bar", "combo", "waterfall", "scatter", "pyramid"] as const)(
    "Axis italic style is taken into account for %s chart",
    (type) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "A1:B1" }],
          labelRange: "A2:B2",
          type,
          axesDesign: {
            x: {
              type: "string",
              text: "test",
            },
          },
        },
        "1"
      );
      let scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].font.style).toEqual("normal");
      updateChart(model, "1", {
        axesDesign: {
          x: {
            type: "string",
            text: "test",
            design: { italic: true },
          },
        },
      });
      scales = getChartConfiguration(model, "1").options.scales;
      expect(scales.x!["title"].font.style).toEqual("italic");
    }
  );
});
