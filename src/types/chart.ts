import { Range, UID } from ".";

export interface DataSet {
  labelCell?: Range; // range of the label
  dataRange: Range; // range of the data
  inputValue: string; // string as it was entered by the user
}

export type ChartTypes = "line" | "bar" | "pie";

export interface ChartDefinition {
  title?: string;
  type: ChartTypes;
  dataSets: DataSet[];
  labelRange: {
    range: Range; // range of the labels
    inputValue: string; // string as it was entered by the user
  };
  sheetId: UID;
}

export interface CreateChartDefinition {
  title: string;
  type: ChartTypes;
  dataSets: string[];
  labelRange: string;
  dataSetsHaveTitle: boolean;
}
