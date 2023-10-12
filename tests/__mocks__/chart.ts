import type { ChartConfiguration } from "chart.js";

export const mockChart = () => {
  const mockChartData: ChartConfiguration = {
    data: { datasets: [] },
    type: "bar",
  };
  class ChartMock {
    static register = () => {};
    constructor(ctx: unknown, chartData: ChartConfiguration) {
      Object.assign(mockChartData, chartData);
    }
    set data(value) {
      mockChartData.data = value;
    }
    get data() {
      return mockChartData.data;
    }
    destroy = () => {};
    update = () => {};
    options = mockChartData.options;
    config = mockChartData;
  }
  //@ts-ignore
  window.Chart = ChartMock;
  return mockChartData;
};
