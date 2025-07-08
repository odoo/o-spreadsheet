import { Model, SpreadsheetChildEnv, UID } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { CalendarChartDefinition } from "../../../../src/types/chart/calendar_chart";
import {
  changeRoundColorPickerColor,
  click,
  createCalendarChart,
  getRoundColorPickerValue,
  setCellContent,
  setFormat,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { mockChart, mountComponentWithPortalTarget } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

mockChart();

const chartId = "chartId";

function getCalendarChartDefinition(chartId: UID): CalendarChartDefinition {
  return model.getters.getChartDefinition(chartId) as CalendarChartDefinition;
}

describe("Calendar chart side panel", () => {
  beforeEach(async () => {
    model = new Model({});
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  });

  describe("Config panel", () => {
    test("Calendar chart config panel is correctly initialized", async () => {
      setCellContent(model, "A1", "=DATE(1,1,1) + SEQUENCE(3,1,1,15)");
      setCellContent(model, "B1", "=RANDARRAY(3,1)");
      createCalendarChart(
        model,
        {
          dataSets: [{ dataRange: "B1:B3" }],
          labelRange: "A1:A3",
          horizontalGroupBy: "day_of_week",
          verticalGroupBy: "month_number",
        },
        chartId
      );
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-data-series input").toHaveValue("B1:B3");
      expect(".o-data-labels input").toHaveValue("A1:A3");
      expect(".o-horizontal-group-by").toHaveValue("day_of_week");
      expect(".o-vertical-group-by").toHaveValue("month_number");
    });

    test("Only one data range is enabled", async () => {
      createCalendarChart(
        model,
        {
          dataSets: [{ dataRange: "B1:B3" }],
        },
        chartId
      );
      await openChartConfigSidePanel(model, env, chartId);
      expect(".o-data-series input").toHaveCount(1);

      await setInputValueAndTrigger(".o-data-series input", "A1:B3");
      await simulateClick(".o-data-series .o-selection-ok");

      expect(".o-data-series input").toHaveCount(2);
      expect(".o-data-series input.o-disabled-ranges").toHaveCount(1);
    });

    test("Can change the horizontal group by", async () => {
      setCellContent(model, "A1", "=DATE(1,1,1) + SEQUENCE(3,1,1,30/24)");
      setFormat(model, "A1:A3", "mm/dd/yyyy hh:mm:ss");
      setCellContent(model, "B1", "=RANDARRAY(3,1)");
      createCalendarChart(
        model,
        {
          dataSets: [{ dataRange: "B1:B3" }],
          labelRange: "A1:A3",
          horizontalGroupBy: "hour_number",
        },
        chartId
      );
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-horizontal-group-by").toHaveValue("hour_number");
      await setInputValueAndTrigger(".o-horizontal-group-by", "day_of_week");
      expect(getCalendarChartDefinition(chartId)?.horizontalGroupBy).toEqual("day_of_week");
      expect(".o-horizontal-group-by").toHaveValue("day_of_week");
    });

    test("Can change the vertical group by", async () => {
      setCellContent(model, "A1", "=DATE(1,1,1) + SEQUENCE(3,1,1,15)");
      setCellContent(model, "B1", "=RANDARRAY(3,1)");
      createCalendarChart(
        model,
        {
          dataSets: [{ dataRange: "B1:B3" }],
          labelRange: "A1:A3",
          verticalGroupBy: "day_of_week",
        },
        chartId
      );
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-vertical-group-by").toHaveValue("day_of_week");
      await setInputValueAndTrigger(".o-vertical-group-by", "month_number");
      expect(getCalendarChartDefinition(chartId)?.verticalGroupBy).toEqual("month_number");
      expect(".o-vertical-group-by").toHaveValue("month_number");
    });
  });

  describe("Design panel", () => {
    test("Calendar chart design panel is correctly initialized", async () => {
      createCalendarChart(
        model,
        {
          title: { text: "Title", bold: true },
          legendPosition: "right",
          background: "#FF0000",
          colorScale: "purples",
        },
        chartId
      );
      await openChartDesignSidePanel(model, env, fixture, chartId);

      expect(getRoundColorPickerValue(".o-chart-background-color")).toEqual("#FF0000");
      expect(".o-chart-title input").toHaveValue("Title");
      expect(".o-chart-legend-position").toHaveValue("right");
      expect("span[title=Bold]").toHaveClass("active");
      const classList = fixture.querySelector(".o-color-scale .color-scale-preview")?.classList;
      expect(classList).toContain("purples-color-scale");
    });

    test("Can edit the color scale", async () => {
      createCalendarChart(model, { colorScale: "purples" }, chartId);
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await click(fixture, ".color-scale-container");
      await click(fixture, ".color-scale-preview.oranges-color-scale");
      expect(getCalendarChartDefinition(chartId)?.colorScale).toEqual("oranges");
      expect(".o-color-scale .color-scale-preview").toHaveClass("oranges-color-scale");
    });

    test("Can edit a custom color scale", async () => {
      createCalendarChart(model, {}, chartId);
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await click(fixture, ".color-scale-container");
      await click(fixture, ".color-scale-preview.custom-color-scale");

      await changeRoundColorPickerColor(".o-min-color", "#FF0000");
      await changeRoundColorPickerColor(".o-mid-color", "#00FF00");
      await changeRoundColorPickerColor(".o-max-color", "#0000FF");

      expect(getCalendarChartDefinition(chartId)?.colorScale).toMatchObject({
        minColor: "#FF0000",
        midColor: "#00FF00",
        maxColor: "#0000FF",
      });
    });

    test("Can edit the color of the matrix element with no value", async () => {
      createCalendarChart(model, { missingValueColor: "#f00" }, chartId);
      await openChartDesignSidePanel(model, env, fixture, chartId);

      await changeRoundColorPickerColor(".o-missing-value", "#FF9900");
      expect(getCalendarChartDefinition(chartId)?.missingValueColor).toEqual("#FF9900");
      expect(getRoundColorPickerValue(".o-missing-value")).toEqual("#FF9900");
    });
  });
});
