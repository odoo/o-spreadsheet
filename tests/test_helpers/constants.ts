import { BACKGROUND_CHART_COLOR } from "../../src/constants";

export const TEST_CHART_DATA = {
  basicChart: {
    type: "bar" as const,
    dataSets: ["B1:B4"],
    labelRange: "A2:A4",
    dataSetsHaveTitle: true,
    title: "hello",
    background: BACKGROUND_CHART_COLOR,
    verticalAxisPosition: "left" as const,
    stacked: false,
    legendPosition: "top" as const,
  },
  scorecard: {
    type: "scorecard" as const,
    keyValue: "B1:B4",
    baseline: "A2:A4",
    title: "hello",
    baselineDescr: "description",
    baselineMode: "difference" as const,
  },
  gauge: {
    type: "gauge" as const,
    dataRange: "B1:B4",
    title: "hello",
    sectionRule: {
      rangeMin: "0",
      rangeMax: "100",
      colors: {
        lowerColor: "#6aa84f",
        middleColor: "#f1c232",
        upperColor: "#cc0000",
      },
      lowerInflectionPoint: {
        type: "number" as const,
        value: "33",
      },
      upperInflectionPoint: {
        type: "number" as const,
        value: "66",
      },
    },
  },
};
