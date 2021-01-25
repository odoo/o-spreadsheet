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
  labelRange: Range;
  sheetId: UID;
}

export interface CreateChartDefinition {
  title: string;
  type: ChartTypes;
  dataSets: string[];
  labelRange: string;
  dataSetsHaveTitle: boolean;
}
