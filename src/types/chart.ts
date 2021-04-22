import { Range, UID } from ".";

export interface DataSet {
  labelCell?: Range; // range of the label
  dataRange: Range; // range of the data
}

export type ChartTypes = "line" | "bar" | "pie";

export interface ChartDefinition {
  title?: string;
  type: ChartTypes;
  dataSets: DataSet[];
  labelRange?: Range;
  sheetId: UID;
}

export interface CreateChartDefinition {
  title: string;
  type: ChartTypes;
  dataSets: string[];
  labelRange?: string;
  stackedBar?: boolean;
  backgroundColor?: string;
  verticalAxisPosition?: "left" | "right";
  dataLabels?: "none" | "top" | "center";
  trendline?: "none" | "linear" | "exponential" | "logarithmic";
  legendPosition?: "top" | "bottom" | "left" | "right";
  dataSetsHaveTitle: boolean;
}
