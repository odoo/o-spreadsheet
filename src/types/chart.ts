import { Range, UID } from ".";

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
  title: string;
  type: ChartTypes;
  dataSets: DataSet[];
  labelRange?: Range;
  sheetId: UID;
}

export interface ChartUIDefinition
  extends Omit<ChartDefinition, "dataSets" | "labelRange" | "sheetId"> {
  dataSets: string[];
  labelRange?: string;
  dataSetsHaveTitle: boolean;
}

export interface ExcelChartDefinition {
  title: string;
  type: ChartTypes;
  dataSets: ExcelChartDataset[];
  labelRange?: string;
}
