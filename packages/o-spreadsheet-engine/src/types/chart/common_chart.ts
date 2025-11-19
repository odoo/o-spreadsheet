import { Color, UID } from "../misc";
import { AxesDesign, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface CommonChartDefinition {
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
}

export interface ChartRangeDefinition extends CommonChartDefinition {
  dataSource: ChartDataSource;
}

interface ChartCellsDataSource {
  readonly type: "cells";
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly dataSets: { dataRange: string; id: UID }[];
}

interface ChartPivotDataSource {
  readonly type: "pivot";
  readonly pivotId: UID;
  readonly measureId: UID;
  readonly mainAxis: "rows" | "columns";
}

export type ChartDataSource = ChartCellsDataSource | ChartPivotDataSource;
