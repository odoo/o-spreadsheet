import { Model, SpreadsheetChildEnv, UID } from "../../../../src";
import { SidePanel } from "../../../../src/components/side_panel/side_panel/side_panel";
import { TreeMapChartDefinition } from "../../../../src/types/chart/tree_map_chart";
import {
  changeColorPickerWidgetColor,
  changeRoundColorPickerColor,
  click,
  createTable,
  createTreeMapChart,
  getColorPickerWidgetColor,
  getHTMLCheckboxValue,
  getHTMLInputValue,
  getRoundColorPickerColor,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { mountComponentWithPortalTarget } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

function getTreeMapChartDefinition(chartId: UID): TreeMapChartDefinition {
  return model.getters.getChartDefinition(chartId) as TreeMapChartDefinition;
}

describe("TreeMap chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    createTable(model, "A1:C3");
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  });

  describe("Config panel", () => {
    test("TreeMap config panel is correctly initialized", async () => {
      const chartId = createTreeMapChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: true,
      });
      await openChartConfigSidePanel(model, env, chartId);

      expect(getHTMLInputValue(".o-data-series input")).toEqual("A1:A3");
      expect(getHTMLInputValue(".o-data-labels input")).toEqual("B1:B3");
      expect(getHTMLCheckboxValue('input[name="dataSetsHaveTitle"]')).toBe(true);
    });

    test("Can change chart values in config side panel", async () => {
      const chartId = createTreeMapChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: true,
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
      const chartId = createTreeMapChart(model, {
        title: { text: "My TreeMap chart" },
        background: "#00FF00",
        showHeaders: true,
        headerDesign: { fillColor: "#0000FF", italic: true },
        showLabels: false,
        valuesDesign: { bold: false, color: "#FF0000" },
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(getHTMLInputValue(".o-chart-title input")).toEqual("My TreeMap chart");

      expect(getRoundColorPickerColor(".o-chart-background-color")).toEqual("#00FF00");
      expect(getColorPickerWidgetColor(".o-header-style", "Fill color")).toEqual("#0000FF");
      expect(".o-header-style [title=Italic]").toHaveClass("active");
      expect(".o-header-style [title=Bold]").toHaveClass("active");

      expect(getHTMLCheckboxValue('input[name="showLabels"]')).toBe(false);
      expect(getColorPickerWidgetColor(".o-values-style", "Text color")).toEqual("#FF0000");
      expect(".o-values-style [title=Bold]").not.toHaveClass("active");
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
  });
});
