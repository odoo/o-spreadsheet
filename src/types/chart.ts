import { Range, UID } from ".";
import { XlsxHexColor } from "./xlsx";

export interface DataSet {
  labelCell?: Range; // range of the label
  dataRange: Range; // range of the data
}

export type ChartTypes = "line" | "bar" | "pie";

export interface ExcelChartDataset {
  label?: string;
  range: string;
}
export interface ChartDefinition {
  dataSets: DataSet[];
  labelRange?: Range;
  sheetId: UID;
  title: string;
  type: ChartTypes;
  background: string;
  verticalAxisPosition: "left" | "right";
  legendPosition: "top" | "bottom" | "left" | "right";
  stackedBar: boolean;
  labelsAsText: boolean;
}

export interface ChartUIDefinition
  extends Omit<ChartDefinition, "dataSets" | "labelRange" | "sheetId"> {
  dataSets: string[];
  dataSetsHaveTitle: boolean;
  labelRange?: string;
}

export interface ChartDataSet {
  label;
  data: (number | undefined | null)[];
  lineTension: 0; // 0 -> render straight lines, which is much faster
  borderColor: string;
  /**
   * color or list of color for pie charts
   */
  backgroundColor: string | string[];
}

export interface ChartData {
  labels: Array<string | string[]>;
  datasets: ChartDataSet[];
}

/**
 * Data to be updated on a chart definition.
 */
export interface ChartUIDefinitionUpdate extends Omit<Partial<ChartUIDefinition>, "labelRange"> {
  labelRange?: string | null;
}

export interface ExcelChartDefinition {
  title: string;
  type: ChartTypes;
  dataSets: ExcelChartDataset[];
  labelRange?: string;
  backgroundColor: XlsxHexColor;
  fontColor: XlsxHexColor;
  verticalAxisPosition: "left" | "right";
  legendPosition: "top" | "bottom" | "left" | "right";
  stackedBar: boolean;
}
