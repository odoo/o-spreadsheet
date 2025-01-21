/*!
 * chartjs-chart-treemap v3.1.0
 * https://chartjs-chart-treemap.pages.dev/
 * (c) 2024 Jukka Kurkela
 * Released under the MIT license
 */

import {
  Color,
  CoreChartOptions,
  DatasetController,
  Element,
  FontSpec,
  Scriptable,
  ScriptableContext,
  VisualElement,
} from "chart.js";

type AnyObject = Record<string, unknown>;

type TreemapScriptableContext = ScriptableContext<"treemap"> & {
  raw: TreemapDataPoint;
};

type TreemapControllerDatasetCaptionsOptions = {
  align?: Scriptable<LabelAlign, TreemapScriptableContext>;
  color?: Scriptable<Color, TreemapScriptableContext>;
  display?: boolean;
  formatter?: Scriptable<string, TreemapScriptableContext>;
  font?: FontSpec;
  hoverColor?: Scriptable<Color, TreemapScriptableContext>;
  hoverFont?: FontSpec;
  padding?: number;
};

type TreemapControllerDatasetLabelsOptions = {
  align?: Scriptable<LabelAlign, TreemapScriptableContext>;
  color?: Scriptable<Color | Color[], TreemapScriptableContext>;
  display?: boolean;
  formatter?: Scriptable<string | Array<string>, TreemapScriptableContext>;
  font?: Scriptable<FontSpec | FontSpec[], TreemapScriptableContext>;
  hoverColor?: Scriptable<Color | Color[], TreemapScriptableContext>;
  hoverFont?: Scriptable<FontSpec | FontSpec[], TreemapScriptableContext>;
  overflow?: Scriptable<LabelOverflow, TreemapScriptableContext>;
  padding?: number;
  position?: Scriptable<LabelPosition, TreemapScriptableContext>;
};

export type LabelPosition = "top" | "middle" | "bottom";

export type LabelAlign = "left" | "center" | "right";

export type LabelOverflow = "cut" | "hidden" | "fit";

type TreemapControllerDatasetDividersOptions = {
  display?: boolean;
  lineCapStyle?: string;
  lineColor?: string;
  lineDash?: number[];
  lineDashOffset?: number;
  lineWidth?: number;
};

export interface TreemapControllerDatasetOptions<DType> {
  spacing?: number;
  rtl?: boolean;

  backgroundColor?: Scriptable<Color, TreemapScriptableContext>;
  borderColor?: Scriptable<Color, TreemapScriptableContext>;
  borderWidth?: number;

  hoverBackgroundColor?: Scriptable<Color, TreemapScriptableContext>;
  hoverBorderColor?: Scriptable<Color, TreemapScriptableContext>;
  hoverBorderWidth?: number;

  captions?: TreemapControllerDatasetCaptionsOptions;
  dividers?: TreemapControllerDatasetDividersOptions;
  labels?: TreemapControllerDatasetLabelsOptions;
  label?: string;

  data: TreemapDataPoint[]; // This will be auto-generated from `tree`
  groups?: Array<keyof DType>;
  sumKeys?: Array<keyof DType>;
  tree: number[] | DType[] | AnyObject;
  treeLeafKey?: keyof DType;
  key?: keyof DType;
  hidden?: boolean;

  displayMode?: "containerBoxes" | "headerBoxes";
}

export interface TreemapDataPoint {
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Value
   */
  v: number;
  /**
   * Sum
   */
  s: number;
  /**
   * Depth, only available if grouping
   */
  l?: number;
  /**
   * Group name, only available if grouping
   */
  g?: string;
  /**
   * Group Sum, only available if grouping
   */
  gs?: number;
  /**
   * additonal keys sums, only available if grouping
   */
  vs?: AnyObject;
  isLeaf?: boolean;
}

/*
  export interface TreemapInteractionOptions {
    position: Scriptable<"treemap", ScriptableTooltipContext<"treemap">>
  }*/

declare module "chart.js" {
  export interface ChartTypeRegistry {
    treemap: {
      chartOptions: CoreChartOptions<"treemap">;
      datasetOptions: TreemapControllerDatasetOptions<Record<string, unknown>>;
      defaultDataPoint: TreemapDataPoint;
      metaExtensions: AnyObject;
      parsedDataType: unknown;
      scales: never;
    };
  }

  // interface TooltipOptions<TType extends ChartType> extends CoreInteractionOptions, TreemapInteractionOptions {
  // }
}

export interface TreemapOptions {
  backgroundColor: Color;
  borderColor: Color;
  borderWidth: number | { top?: number; right?: number; bottom?: number; left?: number };
}

export interface TreemapConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TreemapController = DatasetController;

export interface TreemapElement<
  T extends TreemapConfig = TreemapConfig,
  O extends TreemapOptions = TreemapOptions
> extends Element<T, O>,
    VisualElement {}
