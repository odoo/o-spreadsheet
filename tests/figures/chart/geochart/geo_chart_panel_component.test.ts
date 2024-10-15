import { Model, SpreadsheetChildEnv, UID } from "../../../../src";
import { SidePanel } from "../../../../src/components/side_panel/side_panel/side_panel";
import { GeoChartDefinition } from "../../../../src/types/chart/geo_chart";
import {
  createGeoChart,
  getHTMLCheckboxValue,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
import {
  editColorPicker,
  getColorPickerValue,
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import {
  mockChart,
  mockGeoJsonService,
  mountComponentWithPortalTarget,
} from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

mockChart();

const chartId = "chartId";

function getGeoChartDefinition(chartId: UID): GeoChartDefinition {
  return model.getters.getChartDefinition(chartId) as GeoChartDefinition;
}

describe("Geo chart side panel", () => {
  beforeEach(async () => {
    model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  });

  describe("Config panel", () => {
    test("Geo chart config panel is correctly initialized", async () => {
      createGeoChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: true,
        region: "usa",
      });
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-data-series input").toHaveValue("A1:A3");
      expect(".o-data-labels input").toHaveValue("B1:B3");
      expect(getHTMLCheckboxValue('input[name="dataSetsHaveTitle"]')).toBe(true);
      expect(".o-geo-region select").toHaveValue("usa");
    });

    test("Can only select a single data range", async () => {
      createGeoChart(model, {
        dataSets: [{ dataRange: "A1:A3" }, { dataRange: "B1:B3" }],
      });
      await openChartConfigSidePanel(model, env, chartId);
      expect(".o-data-series input").toHaveCount(1);
      expect(".o-data-series input").toHaveValue("A1:A3");

      await setInputValueAndTrigger(".o-data-series input", "A1:D3");
      await simulateClick(".o-data-series .o-selection-ok");

      expect(".o-data-series input").toHaveValue("A1:A3");
      expect(getGeoChartDefinition(chartId)?.dataSets).toMatchObject([{ dataRange: "A1:A3" }]);
    });

    test("Can change the displayed region", async () => {
      createGeoChart(model, {});
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-geo-region select").toHaveValue("world");
      const choices = [
        ...fixture.querySelectorAll<HTMLOptionElement>(".o-geo-region select option"),
      ].map((el) => el.value);
      expect(choices).toEqual(["world", "usa"]);

      await setInputValueAndTrigger(".o-geo-region select", "usa");
      expect(getGeoChartDefinition(chartId)?.region).toEqual("usa");
      expect(".o-geo-region select").toHaveValue("usa");
    });
  });

  describe("Design panel", () => {
    test("Geo design panel is correctly initialized", async () => {
      createGeoChart(model, {
        colorScale: "purples",
        legendPosition: "right",
        background: "#000000",
        title: { text: "Title", bold: true },
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(getColorPickerValue(fixture, ".o-chart-background-color")).toEqual("#000000");
      expect(".o-chart-title input").toHaveValue("Title");
      expect(".o-chart-legend-position").toHaveValue("right");
      expect("span[title=Bold]").toHaveClass("active");
      expect(".o-color-scale select").toHaveValue("purples");
    });

    test("Can edit the color scale", async () => {
      createGeoChart(model, { colorScale: "purples" });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await setInputValueAndTrigger(".o-color-scale select", "oranges");
      expect(getGeoChartDefinition(chartId)?.colorScale).toEqual("oranges");
      expect(".o-color-scale select").toHaveValue("oranges");
    });

    test("Can edit a custom color scale", async () => {
      createGeoChart(model, {});
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await setInputValueAndTrigger(".o-color-scale select", "custom");
      await editColorPicker(fixture, ".o-min-color", "#FF0000");
      await editColorPicker(fixture, ".o-mid-color", "#00FF00");
      await editColorPicker(fixture, ".o-max-color", "#0000FF");

      expect(getGeoChartDefinition(chartId)?.colorScale).toMatchObject({
        minColor: "#FF0000",
        midColor: "#00FF00",
        maxColor: "#0000FF",
      });
    });

    test("Can edit the color of the countries with no value", async () => {
      createGeoChart(model, { missingValueColor: "#f00" });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await editColorPicker(fixture, ".o-missing-value", "#FF9900");
      expect(getGeoChartDefinition(chartId)?.missingValueColor).toEqual("#FF9900");
      expect(getColorPickerValue(fixture, ".o-missing-value")).toEqual("#FF9900");
    });
  });
});
