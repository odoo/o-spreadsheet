import { Color } from "chart.js";
import { DEFAULT_CHART_FONT_SIZE, DEFAULT_CHART_PADDING } from "../../../constants";
import { DOMDimension, PixelPosition } from "../../../types";
import { HeatMapRuntime } from "../../../types/chart/heat_map";
import { relativeLuminance } from "../../color";
import { clipTextWithEllipsis, getDefaultContextFont } from "../../text_helper";
import {
  GrayColorMap,
  InfernoColorMap,
  MagmaColorMap,
  PlasmaColorMap,
  RainbowColorMap,
  TurboColorMap,
  ViridisColorMap,
} from "./colormap";

/* Padding at the border of the chart */
const CHART_PADDING = DEFAULT_CHART_PADDING;

type ScorecardChartElement = {
  text: string;
  style: {
    font: string;
    color: Color;
    strikethrough?: boolean;
    underline?: boolean;
  };
  position: PixelPosition;
};

type Labels = {
  x: number;
  y: number;
  value: string;
};

type RectangleElement = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
};

export type HeatMapConfig = {
  canvas: {
    width: number;
    height: number;
    backgroundColor: Color;
  };
  title?: ScorecardChartElement;
  grid?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  xLabels?: Labels[];
  yLabels?: Labels[];
  elements?: RectangleElement[];
};

export function getHeatMapConfiguration(
  { width, height }: DOMDimension,
  runtime: HeatMapRuntime
): HeatMapConfig {
  const designer = new HeatMapConfigBuilder({ width, height }, runtime);
  return designer.computeDesign();
}

class HeatMapConfigBuilder {
  private context: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor({ width, height }: DOMDimension, readonly runtime: HeatMapRuntime) {
    const canvas = document.createElement("canvas");
    this.width = canvas.width = width;
    this.height = canvas.height = height;
    this.context = canvas.getContext("2d")!;
  }

  computeDesign(): HeatMapConfig {
    const structure: HeatMapConfig = {
      canvas: {
        width: this.width,
        height: this.height,
        backgroundColor: this.backgroundColor,
      },
    };
    const style = this.getTextStyles();

    let titleHeight = 0;
    if (this.title) {
      let x: number, titleWidth: number;
      ({ height: titleHeight, width: titleWidth } = this.getFullTextDimensions(
        this.title,
        style.title.font
      ));
      switch (this.runtime.title.align) {
        case "center":
          x = (this.width - titleWidth) / 2;
          break;
        case "right":
          x = this.width - titleWidth - CHART_PADDING;
          break;
        case "left":
        default:
          x = CHART_PADDING;
      }
      structure.title = {
        text: this.title,
        style: style.title,
        position: {
          x,
          y: CHART_PADDING + titleHeight / 2,
        },
      };
    }

    this.context.font = getDefaultContextFont(12);
    const xlabels = this.runtime.labels;
    const ylabels = this.runtime.dataSets.map((ds) => ds.label ?? "");
    const labelsHeight = Math.max(
      ...xlabels.map((l) => this.getFullTextDimensions(l, getDefaultContextFont(12)).height)
    );
    const labelsWidth = Math.max(
      ...ylabels.map((l) => this.getFullTextDimensions(l, getDefaultContextFont(12)).width)
    );

    structure.grid = {
      x: CHART_PADDING + labelsWidth + 5,
      y: 2 * CHART_PADDING + titleHeight,
      height: this.height - titleHeight - 3 * CHART_PADDING - labelsHeight - 5,
      width: this.width - 2 * CHART_PADDING - labelsWidth - 5,
    };
    structure.yLabels = [];
    structure.xLabels = [];

    const temp = this.runtime.dataSets.map((ds) => ds.data as number[]);
    const minv = Math.min(...temp.flat());
    const maxv = Math.max(...temp.flat());
    let colorMap;
    switch (this.runtime.colorMap) {
      case "rainbow":
        colorMap = new RainbowColorMap(minv, maxv);
        break;
      case "gray":
        colorMap = new GrayColorMap(minv, maxv);
        break;
      case "turbo":
        colorMap = new TurboColorMap(minv, maxv);
        break;
      case "inferno":
        colorMap = new InfernoColorMap(minv, maxv);
        break;
      case "magma":
        colorMap = new MagmaColorMap(minv, maxv);
        break;
      case "plasma":
        colorMap = new PlasmaColorMap(minv, maxv);
        break;
      case "viridis":
        colorMap = new ViridisColorMap(minv, maxv);
        break;
      default:
        colorMap = new ViridisColorMap(minv, maxv);
    }
    const values = temp.map((r) => r.map((c) => colorMap.getColor(c)));

    const nCol = values[0].length;
    const nRow = values.length;
    const stepY = structure.grid.height / nRow;
    const stepX = structure.grid.width / nCol;

    structure.elements = [];

    for (let i = 0; i < nCol; i++) {
      for (let j = 0; j < nRow; j++) {
        structure.elements.push({
          x: structure.grid.x + stepX * i,
          y: structure.grid.y + stepY * j,
          width: stepX,
          height: stepY,
          color: values[j][i],
        });
      }
    }

    for (let i = 0; i < nCol; i++) {
      structure.xLabels.push({
        value: clipTextWithEllipsis(this.context, xlabels[i], stepX),
        x: structure.grid.x + stepX * (i + 0.5),
        y: structure.grid.y + structure.grid.height + 5,
      });
    }
    for (let j = 0; j < nRow; j++) {
      structure.yLabels?.push({
        value: ylabels[j],
        x: structure.grid.x - 5,
        y: structure.grid.y + stepY * (j + 0.5),
      });
    }
    return structure;
  }

  private get title(): string {
    return this.runtime.title.text ?? "";
  }

  private get backgroundColor() {
    return this.runtime.background;
  }

  private get secondaryFontColor() {
    return relativeLuminance(this.backgroundColor) > 0.3 ? "#525252" : "#C8C8C8";
  }

  private getFullTextDimensions(text: string, font: string) {
    this.context.font = font;
    const measure = this.context.measureText(text);
    return {
      width: measure.width,
      height: measure.fontBoundingBoxAscent + measure.fontBoundingBoxDescent,
    };
  }

  private getTextStyles() {
    return {
      title: {
        font: getDefaultContextFont(
          DEFAULT_CHART_FONT_SIZE,
          this.runtime.title.bold,
          this.runtime.title.italic
        ),
        color: this.runtime.title.color ?? this.secondaryFontColor,
      },
    };
  }
}
