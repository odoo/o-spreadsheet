import { Model, SpreadsheetChildEnv } from "../../../../src";
import { SidePanel } from "../../../../src/components/side_panel/side_panel/side_panel";
import {
  createFunnelChart,
  getHTMLCheckboxValue,
  getHTMLInputValue,
  setCellContent,
} from "../../../test_helpers";
import {
  editColorPicker,
  getColorPickerValue,
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { mountComponentWithPortalTarget } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

describe("Funnel chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  });

  describe("Config panel", () => {
    test("Funnel config panel is correctly initialized", async () => {
      const chartId = createFunnelChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: true,
        aggregated: true,
      });
      await openChartConfigSidePanel(model, env, chartId);

      expect(getHTMLInputValue(".o-data-series input")).toEqual("A1:A3");
      expect(getHTMLInputValue(".o-data-labels input")).toEqual("B1:B3");
      expect(getHTMLCheckboxValue('input[name="aggregated"]')).toBe(true);
      expect(getHTMLCheckboxValue('input[name="dataSetsHaveTitle"]')).toBe(true);
    });
  });

  describe("Design panel", () => {
    test("Waterfall design panel is correctly initialized", async () => {
      setCellContent(model, "A2", "50");
      setCellContent(model, "A3", "60");
      const chartId = createFunnelChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        title: { text: "My Funnel chart" },
        showValues: true,
        funnelColors: ["#FF0000", "#00FF00"],
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(getHTMLInputValue(".o-chart-title input")).toEqual("My Funnel chart");
      expect(getHTMLCheckboxValue('input[name="showValues"]')).toBe(true);

      expect(getColorPickerValue(fixture, '.o-funnel-colors [data-id="0"]')).toEqual("#FF0000");
      expect(getColorPickerValue(fixture, '.o-funnel-colors [data-id="1"]')).toEqual("#00FF00");
    });

    test("Can change funnel colors", async () => {
      setCellContent(model, "A2", "50");
      setCellContent(model, "A3", "60");
      const chartId = createFunnelChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        title: { text: "My Funnel chart" },
        showValues: true,
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(getHTMLInputValue(".o-chart-title input")).toEqual("My Funnel chart");
      expect(getHTMLCheckboxValue('input[name="showValues"]')).toBe(true);

      await editColorPicker(fixture, '.o-funnel-colors [data-id="1"]', "#FF0000");

      expect(model.getters.getChartDefinition(chartId)).toMatchObject({
        funnelColors: [undefined, "#FF0000"],
      });
      expect(getColorPickerValue(fixture, '.o-funnel-colors [data-id="1"]')).toEqual("#FF0000");
    });

    test("Labels are displayed next to the color pickers", async () => {
      setCellContent(model, "A2", "This is a label");
      setCellContent(model, "B2", "50");
      setCellContent(model, "B3", "60");
      const chartId = createFunnelChart(model, {
        dataSets: [{ dataRange: "B1:B3" }],
        labelRange: "A1:A3",
        title: { text: "My Funnel chart" },
        showValues: true,
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(getHTMLInputValue(".o-chart-title input")).toEqual("My Funnel chart");
      expect(getHTMLCheckboxValue('input[name="showValues"]')).toBe(true);

      expect('.o-funnel-colors [data-id="0"]').toHaveText("This is a label");
      expect('.o-funnel-colors [data-id="1"]').toHaveText("Value 2");
    });
  });
});
