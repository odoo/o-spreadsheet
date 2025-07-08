import { Model, SpreadsheetChildEnv, UID } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import {
  CalendarChartDefinition,
  TIME_MATRIX_GROUP_BY_CHOICES,
} from "../../../../src/types/chart/calendar_chart";
import {
  changeRoundColorPickerColor,
  click,
  createCalendarChart,
  getRoundColorPickerValue,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { TEST_CHART_DATA } from "../../../test_helpers/constants";
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
      createCalendarChart(model, TEST_CHART_DATA.calendar, chartId);
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-data-series input").toHaveValue("B1:B365");
      expect(".o-data-labels input").toHaveValue("A1:A365");
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
      createCalendarChart(
        model,
        {
          dataSets: [{ dataRange: "B1:B3" }],
          horizontalGroupBy: "hour",
        },
        chartId
      );
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-horizontal-group-by").toHaveValue("hour");
      const choices = [
        ...fixture.querySelectorAll<HTMLOptionElement>(".o-horizontal-group-by option"),
      ].map((el) => el.value);
      expect(choices).toEqual(TIME_MATRIX_GROUP_BY_CHOICES);
      await setInputValueAndTrigger(".o-horizontal-group-by", "weekday");
      expect(getCalendarChartDefinition(chartId)?.horizontalGroupBy).toEqual("weekday");
      expect(".o-horizontal-group-by").toHaveValue("weekday");
    });

    test("Can change the vertical group by", async () => {
      createCalendarChart(
        model,
        {
          dataSets: [{ dataRange: "B1:B3" }],
          verticalGroupBy: "weekday",
        },
        chartId
      );
      await openChartConfigSidePanel(model, env, chartId);

      expect(".o-vertical-group-by").toHaveValue("weekday");
      const choices = [
        ...fixture.querySelectorAll<HTMLOptionElement>(".o-vertical-group-by option"),
      ].map((el) => el.value);
      expect(choices).toEqual(TIME_MATRIX_GROUP_BY_CHOICES);
      await setInputValueAndTrigger(".o-vertical-group-by", "month");
      expect(getCalendarChartDefinition(chartId)?.verticalGroupBy).toEqual("month");
      expect(".o-vertical-group-by").toHaveValue("month");
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
