import { Range, UID } from "./misc";

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
}

export interface ChartUIDefinition
  extends Omit<ChartDefinition, "dataSets" | "labelRange" | "sheetId"> {
  dataSets: string[];
  dataSetsHaveTitle: boolean;
  labelRange?: string;
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
  backgroundColor: string;
  verticalAxisPosition: "left" | "right";
  legendPosition: "top" | "bottom" | "left" | "right";
  stackedBar: boolean;
}
