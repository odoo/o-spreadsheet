import { SunburstChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model, UID } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { ColorGenerator } from "../../../../src/helpers";
import {
  changeColorPickerWidgetColor,
  changeRoundColorPickerColor,
  createSunburstChart,
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

function getSunburstDefinition(chartId: UID): SunburstChartDefinition {
  return model.getters.getChartDefinition(chartId) as SunburstChartDefinition;
}

describe("Sunburst chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  });

  describe("Config panel", () => {
    test("Sunburst config panel is correctly initialized", async () => {
      const chartId = createSunburstChart(model, {
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
      const chartId = createSunburstChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "B1:B3",
          dataSetsHaveTitle: true,
        }),
      });
      await openChartConfigSidePanel(model, env, chartId);

      await setInputValueAndTrigger(".o-data-labels input", "C1:C3");
      await simulateClick(".o-data-labels .o-selection-ok");
      expect(getSunburstDefinition(chartId)?.labelRange).toEqual("C1:C3");

      await setInputValueAndTrigger(".o-data-series input", "B1:B3");
      await simulateClick(".o-data-series .o-selection-ok");
      expect(getSunburstDefinition(chartId)).toMatchObject(
        toChartDataSource({
          dataSets: [{ dataRange: "B1:B3" }],
        })
      );

      await simulateClick('input[name="dataSetsHaveTitle"]');
      expect(getSunburstDefinition(chartId)?.dataSetsHaveTitle).toEqual(false);
    });
  });

  describe("Design panel", () => {
    test("Sunburst design panel is correctly initialized", async () => {
      const chartId = createSunburstChart(model, {
        title: { text: "My Sunburst chart" },
        legendPosition: "bottom",
        background: "#00FF00",
        showLabels: true,
        showValues: false,
        valuesDesign: { bold: false, italic: true, fontSize: 15 },
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(".o-chart-title input").toHaveValue("My Sunburst chart");
      expect(".o-chart-legend-position").toHaveValue("bottom");
      expect(getRoundColorPickerValue(".o-chart-background-color")).toEqual("#00FF00");

      expect('input[name="showLabels"]').toHaveValue(true);
      expect('input[name="showValues"]').toHaveValue(false);
      expect('.o-values-style [title="Bold"]').not.toHaveClass("active");
      expect('.o-values-style [title="Italic"]').toHaveClass("active");
      expect('.o-values-style input[type="number"]').toHaveValue("15");
    });

    test("Can change basic chart options", async () => {
      const chartId = createSunburstChart(model, {});
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await setInputValueAndTrigger(".o-chart-title input", "My Sunburst Title");
      await setInputValueAndTrigger(".o-chart-legend-position", "left");
      await changeRoundColorPickerColor(".o-chart-background-color", "#000000");

      const definition = getSunburstDefinition(chartId);

      expect(definition.title.text).toEqual("My Sunburst Title");
      expect(definition.legendPosition).toEqual("left");
      expect(definition.background).toEqual("#000000");
    });

    test("Can display or not the labels/values", async () => {
      const chartId = createSunburstChart(model, {});
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect('input[name="showLabels"]').toHaveValue(true);
      expect('input[name="showValues"]').toHaveValue(false);
      expect(".o-values-style").toHaveCount(1);

      await simulateClick('input[name="showLabels"]');

      expect('input[name="showLabels"]').toHaveValue(false);
      expect('input[name="showValues"]').toHaveValue(false);
      expect(".o-values-style").toHaveCount(0);
      expect(getSunburstDefinition(chartId).showLabels).toEqual(false);

      await simulateClick('input[name="showValues"]');

      expect('input[name="showLabels"]').toHaveValue(false);
      expect('input[name="showValues"]').toHaveValue(true);
      expect(".o-values-style").toHaveCount(1);
      expect(getSunburstDefinition(chartId).showValues).toEqual(true);
    });

    test("Can change Sunburst label style", async () => {
      const chartId = createSunburstChart(model);
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect('.o-values-style [title="Bold"]').not.toHaveClass("active");
      await simulateClick('.o-values-style [title="Bold"]');
      expect('.o-values-style [title="Bold"]').toHaveClass("active");
      expect(getSunburstDefinition(chartId).valuesDesign?.bold).toEqual(true);

      expect('.o-values-style [title="Italic"]').not.toHaveClass("active");
      await simulateClick('.o-values-style [title="Italic"]');
      expect('.o-values-style [title="Italic"]').toHaveClass("active");
      expect(getSunburstDefinition(chartId).valuesDesign?.italic).toEqual(true);

      expect('.o-values-style input[type="number"]').toHaveValue("13");
      await setInputValueAndTrigger(".o-values-style input[type='number']", "20");
      expect(getSunburstDefinition(chartId).valuesDesign?.fontSize).toEqual(20);

      await changeColorPickerWidgetColor(".o-values-style", "Text color", "#FF0000");
      expect(getColorPickerWidgetColor(".o-values-style", "Text color")).toEqual("#FF0000");
      expect(getSunburstDefinition(chartId).valuesDesign?.color).toEqual("#FF0000");
    });

    test("Can change sunburst colors", async () => {
      setGrid(model, { A2: "G1", A3: "G2", B2: "30", B3: "20" });
      const chartId = createSunburstChart(model, {
        ...toChartDataSource({
          dataSets: [{ dataRange: "A1:A3" }],
          labelRange: "B1:B3",
        }),
        groupColors: [undefined, "#00FF00"],
      });
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(".o-sunburst-colors .o-round-color-picker-button").toHaveCount(2);
      const colorGenerator = new ColorGenerator(2);
      expect(getRoundColorPickerValue("[data-id='G1'] ")).toBeSameColorAs(colorGenerator.next());
      expect(getRoundColorPickerValue("[data-id='G2'] ")).toBeSameColorAs("#00FF00");

      await changeRoundColorPickerColor("[data-id='G1'] ", "#FF0000");
      expect(getSunburstDefinition(chartId)?.groupColors).toEqual(["#FF0000", "#00FF00"]);
      expect(getRoundColorPickerValue("[data-id='G1'] ")).toBeSameColorAs("#FF0000");
      expect(getRoundColorPickerValue("[data-id='G2'] ")).toBeSameColorAs("#00FF00");
    });
  });

  test("Can change sunburst chart hole size, and input is debounced on ,ultiple calls", async () => {
    const chartId = createSunburstChart(model, {});
    await openChartDesignSidePanel(model, env, fixture, chartId);

    expect(".o-pie-hole-size-input").toHaveValue("25");
    jest.useFakeTimers();
    setInputValueAndTrigger(".o-pie-hole-size-input", "50");
    setInputValueAndTrigger(".o-pie-hole-size-input", "51");
    setInputValueAndTrigger(".o-pie-hole-size-input", "52");
    expect(getSunburstDefinition(chartId).pieHolePercentage).toEqual(50); // debounced
    jest.advanceTimersByTime(1000);
    expect(getSunburstDefinition(chartId).pieHolePercentage).toEqual(52);
    jest.useRealTimers();
  });
});
