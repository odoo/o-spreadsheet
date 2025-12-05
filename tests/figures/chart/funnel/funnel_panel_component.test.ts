import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import {
  click,
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
  toChartDataSource,
} from "../../../test_helpers/chart_helpers";
import { mountComponentWithPortalTarget } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

describe("Funnel chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  });

  describe("Config panel", () => {
    test("Funnel config panel is correctly initialized", async () => {
      const chartId = createFunnelChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "B1:B3",
          dataSetsHaveTitle: true,
        }),
        aggregated: true,
        cumulative: true,
      });
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-data-series input").toHaveValue("A1:A3");
      expect(".o-data-labels input").toHaveValue("B1:B3");
      expect('input[name="aggregated"]').toHaveValue(true);
      expect('input[name="dataSetsHaveTitle"]').toHaveValue(true);
      expect('input[name="cumulative"]').toHaveValue(true);
    });

    test("Can make chart cumulative", async () => {
      const chartId = createFunnelChart(model);
      await openChartConfigSidePanel(model, env, chartId);

      expect(model.getters.getChartDefinition(chartId)).toMatchObject({ cumulative: false });
      expect('input[name="cumulative"]').toHaveValue(false);

      await click(fixture, 'input[name="cumulative"]');
      expect(model.getters.getChartDefinition(chartId)).toMatchObject({ cumulative: true });
      expect('input[name="cumulative"]').toHaveValue(true);
    });
  });

  describe("Design panel", () => {
    test("Waterfall design panel is correctly initialized", async () => {
      setCellContent(model, "A2", "50");
      setCellContent(model, "A3", "60");
      const chartId = createFunnelChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
        }),
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
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
        }),
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
        ...toChartDataSource({
          dataSets: [{ dataRange: "B1:B3" }],
          labelRange: "A1:A3",
        }),
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
