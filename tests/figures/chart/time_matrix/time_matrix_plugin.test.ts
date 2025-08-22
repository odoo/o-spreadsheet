import { ChartCreationContext, Model } from "../../../../src";
import { CalendarChart } from "../../../../src/helpers/figures/charts/time_matrix_chart";
import {
  CalendarChartGroupBy,
  CalendarChartRuntime,
} from "../../../../src/types/chart/calendar_chart";
import { createCalendarChart } from "../../../test_helpers";
import { GENERAL_CHART_CREATION_CONTEXT } from "../../../test_helpers/chart_helpers";
import { TEST_CHART_DATA } from "../../../test_helpers/constants";

const STAMPS_AND_LABELS: { stamp: CalendarChartGroupBy; labels: string[] }[] = [
  {
    stamp: "weekday",
    labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
  {
    stamp: "month",
    labels: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  },
  { stamp: "year", labels: ["1901", "1902"] },
  {
    stamp: "week",
    labels: [
      "W01",
      "W02",
      "W03",
      "W04",
      "W05",
      "W06",
      "W07",
      "W08",
      "W09",
      "W10",
      "W11",
      "W12",
      "W13",
      "W14",
      "W15",
      "W16",
      "W17",
      "W18",
      "W19",
      "W20",
      "W21",
      "W22",
      "W23",
      "W24",
      "W25",
      "W26",
      "W27",
      "W28",
      "W29",
      "W30",
      "W31",
      "W32",
      "W33",
      "W34",
      "W35",
      "W36",
      "W37",
      "W38",
      "W39",
      "W40",
      "W41",
      "W42",
      "W43",
      "W44",
      "W45",
      "W46",
      "W47",
      "W48",
      "W49",
      "W50",
      "W51",
      "W52",
      "W53",
    ],
  },
  {
    stamp: "hour",
    labels: [
      "0 AM",
      "1 AM",
      "2 AM",
      "3 AM",
      "4 AM",
      "5 AM",
      "6 AM",
      "7 AM",
      "8 AM",
      "9 AM",
      "10 AM",
      "11 AM",
      "0 PM",
      "1 PM",
      "2 PM",
      "3 PM",
      "4 PM",
      "5 PM",
      "6 PM",
      "7 PM",
      "8 PM",
      "9 PM",
      "10 PM",
      "11 PM",
    ],
  },
  {
    stamp: "monthday",
    labels: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
      "30",
      "31",
    ],
  },
  {
    stamp: "quarter",
    labels: ["Q1", "Q2", "Q3", "Q4"],
  },
  {
    stamp: "quarter-year",
    labels: ["Q1 1901", "Q2 1901", "Q3 1901", "Q4 1901", "Q1 1902"],
  },
  {
    stamp: "week-year",
    labels: [
      "W01 1901",
      "W02 1901",
      "W03 1901",
      "W04 1901",
      "W05 1901",
      "W06 1901",
      "W07 1901",
      "W08 1901",
      "W09 1901",
      "W10 1901",
      "W11 1901",
      "W12 1901",
      "W13 1901",
      "W14 1901",
      "W15 1901",
      "W16 1901",
      "W17 1901",
      "W18 1901",
      "W19 1901",
      "W20 1901",
      "W21 1901",
      "W22 1901",
      "W23 1901",
      "W24 1901",
      "W25 1901",
      "W26 1901",
      "W27 1901",
      "W28 1901",
      "W29 1901",
      "W30 1901",
      "W31 1901",
      "W32 1901",
      "W33 1901",
      "W34 1901",
      "W35 1901",
      "W36 1901",
      "W37 1901",
      "W38 1901",
      "W39 1901",
      "W40 1901",
      "W41 1901",
      "W42 1901",
      "W43 1901",
      "W44 1901",
      "W45 1901",
      "W46 1901",
      "W47 1901",
      "W48 1901",
      "W49 1901",
      "W50 1901",
      "W51 1901",
      "W52 1901",
      "W53 1901",
      "W01 1902",
    ],
  },
];

describe("calendar chart", () => {
  test("create calendar chart from creation context", () => {
    const context: Required<ChartCreationContext> = {
      ...GENERAL_CHART_CREATION_CONTEXT,
      range: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
    };
    const definition = CalendarChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "calendar",
      background: "#123456",
      title: { text: "hello there" },
      dataSets: [{ dataRange: "Sheet1!B1:B4", yAxisId: "y1" }],
      dataSetsHaveTitle: true,
      legendPosition: "bottom",
      labelRange: "Sheet1!A1:A4",
      showValues: false,
      axesDesign: {},
    });
  });

  test.each(STAMPS_AND_LABELS)(
    "Can edit the vertical axis grouping",
    (grouping: { stamp: CalendarChartGroupBy; labels: readonly string[] }) => {
      const model = new Model();
      createCalendarChart(
        model,
        {
          ...TEST_CHART_DATA.calendar,
          verticalGroupBy: grouping.stamp,
        },
        "1"
      );
      const runtime = model.getters.getChartRuntime("1") as CalendarChartRuntime;
      expect(runtime.chartJsConfig.data.datasets.map((ds) => ds.label)).toEqual(grouping.labels);
    }
  );

  test.each(STAMPS_AND_LABELS)(
    "Can edit the horizontal axis grouping",
    (grouping: { stamp: CalendarChartGroupBy; labels: readonly string[] }) => {
      const model = new Model();
      createCalendarChart(
        model,
        {
          ...TEST_CHART_DATA.calendar,
          horizontalGroupBy: grouping.stamp,
        },
        "1"
      );
      const runtime = model.getters.getChartRuntime("1") as CalendarChartRuntime;
      expect(runtime.chartJsConfig.data.labels).toEqual(grouping.labels);
    }
  );
});
