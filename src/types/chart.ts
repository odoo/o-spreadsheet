export interface DataSet {
  labelCell?: string;
  dataRange: string;
}

export type ChartTypes = "line" | "bar" | "pie";

export interface ChartDefinition {
  title?: string;
  type: ChartTypes;
  dataSets: DataSet[];
  labelRange: string;
  sheetId: string;
}

export interface CreateChartDefinition {
  type: ChartTypes;
  title: string;
  labelRange: string;
  dataSets: string[];
  seriesHasTitle: boolean;
}
