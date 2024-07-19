import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, DatasetValues, TitleDesign } from "./chart";

export interface HeatMapDefinition {
  readonly type: "heatmap";
  readonly title: TitleDesign;
  readonly background?: Color;
  dataSets: CustomizedDataSet[];
  labelRange?: string;
  dataSetsHaveTitle: boolean;
  axesDesign?: AxesDesign;
  aggregated?: boolean;
}

type ColorMap = "rainbow" | "gray" | "turbo" | "magma" | "inferno" | "plasma" | "viridis";

export interface HeatMapRuntime {
  readonly title: TitleDesign;
  readonly labels: string[];
  readonly dataSets: DatasetValues[];
  readonly background: Color;
  readonly fontColor: Color;
  readonly colorMap: ColorMap;
}
