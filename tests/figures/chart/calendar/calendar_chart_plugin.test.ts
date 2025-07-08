import { ChartCreationContext, Granularity, Model } from "../../../../src";
import { CalendarChart } from "../../../../src/helpers/figures/charts/calendar_chart";
import { CalendarChartRuntime } from "../../../../src/types/chart/calendar_chart";
import { createCalendarChart, createSheet, setCellContent, setFormat } from "../../../test_helpers";
import { GENERAL_CHART_CREATION_CONTEXT } from "../../../test_helpers/chart_helpers";

const STAMPS_AND_LABELS: { stamp: Granularity; labels: string[] }[] = [
  {
    stamp: "day_of_week",
    labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
  {
    stamp: "month_number",
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
    stamp: "iso_week_number",
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
    ],
  },
  {
    stamp: "hour_number",
    labels: [
      "00 AM",
      "01 AM",
      "02 AM",
      "03 AM",
      "04 AM",
      "05 AM",
      "06 AM",
      "07 AM",
      "08 AM",
      "09 AM",
      "10 AM",
      "11 AM",
      "00 PM",
      "01 PM",
      "02 PM",
      "03 PM",
      "04 PM",
      "05 PM",
      "06 PM",
      "07 PM",
      "08 PM",
      "09 PM",
      "10 PM",
      "11 PM",
    ],
  },
  {
    stamp: "day_of_month",
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
    stamp: "quarter_number",
    labels: ["Q1", "Q2", "Q3", "Q4"],
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
      legendPosition: "left",
      labelRange: "Sheet1!A1:A4",
      showValues: false,
      axesDesign: {},
    });
  });

  test.each(STAMPS_AND_LABELS)(
    "Can edit the vertical axis grouping",
    (grouping: { stamp: Granularity; labels: readonly string[] }) => {
      const model = new Model();
      createSheet(model, { sheetId: "calendar", activate: true, rows: 365, cols: 2 });
      setCellContent(model, "A1", "=DATE(1,1,1) + SEQUENCE(365,1,1,1) + SEQUENCE(365,1, 0, 1/366)");
      setFormat(model, "A1:A365", "mm/dd/yyyy hh:mm:ss");
      setCellContent(model, "B1", "=RANDARRAY(365,1)");
      const chartId = model.uuidGenerator.uuidv4();
      createCalendarChart(
        model,
        {
          type: "calendar" as const,
          dataSets: [{ dataRange: "B1:B365" }],
          labelRange: "A1:A365",
          verticalGroupBy: grouping.stamp,
        },
        chartId,
        "calendar"
      );
      const runtime = model.getters.getChartRuntime(chartId) as CalendarChartRuntime;
      expect(runtime.chartJsConfig.data.datasets.map((ds) => ds.label).reverse()).toEqual(
        grouping.labels
      );
    }
  );

  test.each(STAMPS_AND_LABELS)(
    "Can edit the horizontal axis grouping",
    (grouping: { stamp: Granularity; labels: readonly string[] }) => {
      const model = new Model();
      createSheet(model, { sheetId: "calendar", activate: true, rows: 365, cols: 2 });
      setCellContent(model, "A1", "=DATE(1,1,1) + SEQUENCE(365,1,1,1) + SEQUENCE(365,1, 0, 1/366)");
      setFormat(model, "A1:A365", "mm/dd/yyyy hh:mm:ss");
      setCellContent(model, "B1", "=RANDARRAY(365,1)");
      const chartId = model.uuidGenerator.uuidv4();
      createCalendarChart(
        model,
        {
          type: "calendar" as const,
          dataSets: [{ dataRange: "B1:B365" }],
          labelRange: "A1:A365",
          horizontalGroupBy: grouping.stamp,
        },
        chartId,
        "calendar"
      );
      const runtime = model.getters.getChartRuntime(chartId) as CalendarChartRuntime;
      expect(runtime.chartJsConfig.data.labels).toEqual(grouping.labels);
    }
  );
});
