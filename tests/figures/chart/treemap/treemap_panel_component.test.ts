import { TreeMapChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/tree_map_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model, UID } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { ColorGenerator } from "../../../../src/helpers";
import {
  changeColorPickerWidgetColor,
  changeRoundColorPickerColor,
  click,
  createTreeMapChart,
  getColorPickerWidgetColor,
  getHTMLCheckboxValue,
  getHTMLInputValue,
  getRoundColorPickerValue,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
  toChartDataSource,
} from "../../../test_helpers/chart_helpers";
import { mountComponentWithPortalTarget, setGrid } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

function getTreeMapChartDefinition(chartId: UID): TreeMapChartDefinition {
  return model.getters.getChartDefinition(chartId) as TreeMapChartDefinition;
}

describe("TreeMap chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  });

  describe("Config panel", () => {
    test("TreeMap config panel is correctly initialized", async () => {
      const chartId = createTreeMapChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "B1:B3",
          dataSetsHaveTitle: true,
        }),
      });
      await openChartConfigSidePanel(model, env, chartId);

      expect(getHTMLInputValue(".o-data-series input")).toEqual("A1:A3");
      expect(getHTMLInputValue(".o-data-labels input")).toEqual("B1:B3");
      expect(getHTMLCheckboxValue('input[name="dataSetsHaveTitle"]')).toBe(true);
    });

    test("Can change chart values in config side panel", async () => {
      const chartId = createTreeMapChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "B1:B3",
          dataSetsHaveTitle: true,
        }),
      });
      await openChartConfigSidePanel(model, env, chartId);

      await setInputValueAndTrigger(".o-data-labels input", "C1:C3");
      await simulateClick(".o-data-labels .o-selection-ok");
      expect(getTreeMapChartDefinition(chartId)?.labelRange).toEqual("C1:C3");

      await setInputValueAndTrigger(".o-data-series input", "B1:B3");
      await simulateClick(".o-data-series .o-selection-ok");
      expect(getTreeMapChartDefinition(chartId)?.dataSets).toEqual([{ dataRange: "B1:B3" }]);

      await simulateClick('input[name="dataSetsHaveTitle"]');
      expect(getTreeMapChartDefinition(chartId)?.dataSetsHaveTitle).toEqual(false);
    });
  });

  describe("Design panel", () => {
    test("TreeMap design panel is correctly initialized", async () => {
      setGrid(model, {
        A1: "Category",
        A2: "Category1",
        A3: "Category2",
        B1: "Value",
        B2: "30",
        B3: "20",
      });
      const chartId = createTreeMapChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "B1:B3",
        }),
        title: { text: "My TreeMap chart" },
        background: "#00FF00",
        showHeaders: true,
        headerDesign: { fillColor: "#0000FF", italic: true },
        showLabels: false,
        valuesDesign: { bold: false, color: "#FF0000" },
        coloringOptions: {
          type: "categoryColor",
          colors: ["#FFFFFF"],
          useValueBasedGradient: true,
        },
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(getHTMLInputValue(".o-chart-title input")).toEqual("My TreeMap chart");

      expect(getRoundColorPickerValue(".o-chart-background-color")).toEqual("#00FF00");
      expect(getColorPickerWidgetColor(".o-header-style", "Fill color")).toEqual("#0000FF");
      expect(".o-header-style [title=Italic]").toHaveClass("active");
      expect(".o-header-style [title=Bold]").toHaveClass("active");

      expect(getHTMLCheckboxValue('input[name="showLabels"]')).toBe(false);
      expect(getColorPickerWidgetColor(".o-values-style", "Text color")).toEqual("#FF0000");
      expect(".o-values-style [title=Bold]").not.toHaveClass("active");

      const chartColorGenerator = new ColorGenerator(2);
      expect(getRoundColorPickerValue("[data-id=Category1]")).toEqual("#FFFFFF");
      chartColorGenerator.next(); // Skip the first color which would have been used for Category1
      expect(getRoundColorPickerValue("[data-id=Category2]")).toEqual(chartColorGenerator.next());
    });

    test("Can change headers style", async () => {
      const chartId = createTreeMapChart(model, {});
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await simulateClick(".o-header-style [title=Italic]");
      await changeColorPickerWidgetColor(".o-header-style", "Text color", "#FF0000");

      expect(getTreeMapChartDefinition(chartId)?.headerDesign).toMatchObject({
        italic: true,
        color: "#FF0000",
      });

      await click(fixture, "input[name='showHeaders']");
      expect(getTreeMapChartDefinition(chartId)?.showHeaders).toBe(false);
      expect(".o-header-style").toHaveCount(0);
    });

    test("Can change values style", async () => {
      const chartId = createTreeMapChart(model, {});
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await simulateClick(".o-values-style [title=Italic]");
      await changeColorPickerWidgetColor(".o-values-style", "Text color", "#FF0000");
      await click(fixture, ".o-values-style .o-menu-item-button[title='Vertical alignment']");
      await click(fixture, ".o-values-style .o-menu-item-button[title='Top']");

      expect(getTreeMapChartDefinition(chartId)?.valuesDesign).toMatchObject({
        italic: true,
        color: "#FF0000",
        verticalAlign: "top",
      });

      await click(fixture, "input[name='showValues']");
      await click(fixture, "input[name='showLabels']");
      expect(getTreeMapChartDefinition(chartId)?.showValues).toBe(false);
      expect(getTreeMapChartDefinition(chartId)?.showLabels).toBe(false);
      expect(".o-values-style").toHaveCount(0);
    });

    test("Can change categories colors", async () => {
      setGrid(model, {
        A1: "Category",
        A2: "Category1",
        A3: "Category2",
        B1: "Value",
        B2: "30",
        B3: "20",
      });
      const chartId = createTreeMapChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "B1:B3",
        }),
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await changeRoundColorPickerColor("[data-id=Category1]", "#000000");
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        colors: ["#000000"],
      });

      await changeRoundColorPickerColor("[data-id=Category2]", "#FFFFFF");
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        colors: ["#000000", "#FFFFFF"],
      });

      await changeRoundColorPickerColor("[data-id=Category1]", undefined);
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        colors: [undefined, "#FFFFFF"],
      });
    });

    test("Can highlight bigger values", async () => {
      setGrid(model, { A1: "Category", A2: "Category1", B1: "Value", B3: "20" });
      const chartId = createTreeMapChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A2" }],
          labelRange: "B1:B2",
        }),
        coloringOptions: { type: "categoryColor", useValueBasedGradient: false, colors: [] },
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await click(fixture, "input[name='useValueBasedGradient']");
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        useValueBasedGradient: true,
      });
    });

    test("Can change color scale colors", async () => {
      const chartId = createTreeMapChart(model, {});
      await openChartDesignSidePanel(model, env, fixture, chartId);
      await click(fixture, "button[data-id='colorScale']");

      await changeRoundColorPickerColor(".o-min-color", "#000000");
      await changeRoundColorPickerColor(".o-mid-color", "#666666");
      await changeRoundColorPickerColor(".o-max-color", "#FFFFFF");

      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        type: "colorScale",
        minColor: "#000000",
        midColor: "#666666",
        maxColor: "#FFFFFF",
      });
    });

    test("changes are kept when switching back and forth between coloring options types", async () => {
      setGrid(model, { A2: "Category1", B2: "10" });
      const chartId = createTreeMapChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A2" }],
          labelRange: "B1:B2",
        }),
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await changeRoundColorPickerColor("[data-id=Category1]", "#000000");
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        colors: ["#000000"],
      });

      await click(fixture, "button[data-id='colorScale']");
      await changeRoundColorPickerColor(".o-min-color", "#FF0000");
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        type: "colorScale",
        minColor: "#FF0000",
      });

      await click(fixture, "button[data-id='categoryColor']");
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        type: "categoryColor",
        colors: ["#000000"],
      });

      await click(fixture, "button[data-id='colorScale']");
      expect(getTreeMapChartDefinition(chartId)?.coloringOptions).toMatchObject({
        type: "colorScale",
        minColor: "#FF0000",
      });
    });
  });
});
