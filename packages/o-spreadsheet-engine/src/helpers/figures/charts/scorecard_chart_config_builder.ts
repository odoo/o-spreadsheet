/* Padding at the border of the chart */
import {
  CHART_PADDING,
  CHART_PADDING_BOTTOM,
  DEFAULT_SCORECARD_BASELINE_FONT_SIZE,
  DEFAULT_SCORECARD_KEY_VALUE_FONT_SIZE,
  SCORECARD_CHART_TITLE_FONT_SIZE,
} from "../../../constants";
import {
  BaselineArrowDirection,
  ScorecardChartRuntime,
  ScorecardChartStyle,
} from "../../../types/chart";
import { Color, Pixel, PixelPosition } from "../../../types/misc";
import { DOMDimension } from "../../../types/rendering";
import { getDefaultContextFont } from "../../text_helper";
import { chartMutedFontColor } from "./chart_common";

const BOTTOM_PADDING_RATIO = 0.05;

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

export type ScorecardChartConfig = {
  canvas: {
    width: number;
    height: number;
    backgroundColor: Color;
  };
  title?: ScorecardChartElement;
  baselineArrow?: {
    direction: BaselineArrowDirection;
    style: {
      size: Pixel;
      color: Color;
    };
    position: PixelPosition;
  };
  baseline?: ScorecardChartElement;
  baselineDescr?: ScorecardChartElement;
  key?: ScorecardChartElement;
  keyDescr?: ScorecardChartElement;
  progressBar?: {
    position: PixelPosition;
    dimension: DOMDimension;
    style: {
      color: Color;
      backgroundColor: Color;
    };
    value: number;
  };
};

export function formatBaselineDescr(
  baselineDescr: string | undefined,
  baseline: string | undefined
): string {
  const _baselineDescr = baselineDescr || "";
  return baseline && _baselineDescr ? " " + _baselineDescr : _baselineDescr;
}

export function getScorecardConfiguration(
  { width, height }: DOMDimension,
  runtime: ScorecardChartRuntime,
  style: ScorecardChartStyle
): ScorecardChartConfig {
  const designer = new ScorecardChartConfigBuilder({ width, height }, runtime, style);
  return designer.computeDesign();
}

class ScorecardChartConfigBuilder {
  private context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(
    { width, height }: DOMDimension,
    readonly runtime: ScorecardChartRuntime,
    readonly style: ScorecardChartStyle
  ) {
    this.width = width;
    this.height = height;
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas is not supported in this environment");
    }
    const canvas = new globalThis.OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create scorecard measurement context");
    }
    this.context = ctx;
  }

  computeDesign(): ScorecardChartConfig {
    const structure: ScorecardChartConfig = {
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
          y: CHART_PADDING_BOTTOM + titleHeight / 2,
        },
      };
    }

    const baselineArrowSize = style.baselineArrow?.size ?? 0;
    let { height: baselineHeight, width: baselineWidth } = this.getTextDimensions(
      this.baseline,
      style.baselineValue.font
    );
    if (!this.baseline) {
      baselineHeight = this.getTextDimensions(this.baselineDescr, style.baselineDescr.font).height;
    }
    const baselineDescrWidth = this.getTextDimensions(
      this.baselineDescr,
      style.baselineDescr.font
    ).width;

    let baselineX: number;

    switch (this.runtime.baselineStyle?.align) {
      case "right":
        baselineX = this.width - CHART_PADDING - baselineDescrWidth - baselineWidth;
        break;
      case "left":
        baselineX = CHART_PADDING + baselineArrowSize;
        break;
      default:
        baselineX = (this.width - baselineWidth - baselineDescrWidth + baselineArrowSize) / 2;
    }

    if (this.baseline) {
      structure.baseline = {
        text: this.baseline,
        style: style.baselineValue,
        position: {
          x: baselineX,
          y: this.keyValue
            ? this.height * (1 - BOTTOM_PADDING_RATIO * (this.runtime.progressBar ? 1 : 2))
            : this.height - (this.height - titleHeight - baselineHeight) / 2 - CHART_PADDING_BOTTOM,
        },
      };

      if (style.baselineArrow && !this.runtime.progressBar) {
        structure.baselineArrow = {
          direction: this.baselineArrow,
          style: style.baselineArrow,
          position: {
            x: structure.baseline.position.x - baselineArrowSize,
            y: structure.baseline.position.y - (baselineHeight + baselineArrowSize) / 2,
          },
        };
      }
    }

    if (structure.baseline && this.baselineDescr) {
      const position = {
        x: structure.baseline.position.x + baselineWidth,
        y: structure.baseline.position.y,
      };
      structure.baselineDescr = {
        text: this.baselineDescr,
        style: style.baselineDescr,
        position,
      };
    }

    let progressBarHeight = 0;
    if (this.runtime.progressBar) {
      progressBarHeight = this.height * 0.05;
      structure.progressBar = {
        position: {
          x: 2 * CHART_PADDING,
          y: this.height * (1 - 2 * BOTTOM_PADDING_RATIO) - baselineHeight - progressBarHeight,
        },
        dimension: {
          height: progressBarHeight,
          width: this.width - 4 * CHART_PADDING,
        },
        value: this.runtime.progressBar.value,
        style: {
          color: this.runtime.progressBar.color,
          backgroundColor: this.secondaryFontColor,
        },
      };
    }

    const { width: keyWidth, height: keyHeight } = this.getFullTextDimensions(
      this.keyValue,
      style.keyValue.font
    );

    const keyDescrWidth = this.getTextDimensions(this.keyDescr, style.keyDescr.font).width;

    let keyX: number;

    switch (this.runtime.keyValueStyle?.align) {
      case "right":
        keyX = this.width - CHART_PADDING - keyDescrWidth - keyWidth;
        break;
      case "left":
        keyX = CHART_PADDING;
        break;
      default:
        keyX = (this.width - keyWidth - keyDescrWidth) / 2;
    }

    if (this.keyValue) {
      structure.key = {
        text: this.keyValue,
        style: style.keyValue,
        position: {
          x: Math.max(CHART_PADDING, keyX),
          y:
            this.height * (0.5 - BOTTOM_PADDING_RATIO * 2) +
            CHART_PADDING_BOTTOM / 2 +
            (titleHeight + keyHeight / 2) / 2,
        },
      };
    }

    if (structure.key && this.keyDescr) {
      const position = {
        x: structure.key.position.x + keyWidth,
        y: structure.key.position.y,
      };
      structure.keyDescr = {
        text: this.keyDescr,
        style: style.keyDescr,
        position,
      };
    }

    return structure;
  }

  private get title(): string {
    return this.runtime.title.text ?? "";
  }

  get keyValue() {
    return this.runtime.keyValue;
  }

  get keyDescr() {
    return formatBaselineDescr(this.runtime.keyDescr, this.keyValue);
  }

  get baseline() {
    return this.runtime.baselineDisplay;
  }

  get baselineDescr() {
    return formatBaselineDescr(this.runtime.baselineDescr, this.baseline);
  }

  get baselineArrow() {
    return this.runtime.baselineArrow;
  }

  private get backgroundColor() {
    return this.style.background;
  }

  private get fontColor() {
    return this.style.fontColor;
  }

  private get secondaryFontColor() {
    return chartMutedFontColor(this.backgroundColor);
  }

  private getTextDimensions(text: string, font: string) {
    this.context.font = font;
    const measure = this.context.measureText(text);
    return {
      width: measure.width,
      height: measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent,
    };
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
    const keyValueFontSize =
      this.runtime.keyValueStyle?.fontSize ?? DEFAULT_SCORECARD_KEY_VALUE_FONT_SIZE;
    const keyValueDescrFontSize = Math.floor(0.9 * keyValueFontSize);
    let baselineValueFontSize =
      this.runtime.baselineStyle?.fontSize ?? DEFAULT_SCORECARD_BASELINE_FONT_SIZE;
    const baselineDescrFontSize = Math.floor(0.9 * baselineValueFontSize);
    if (this.runtime.progressBar) {
      baselineValueFontSize /= 1.5;
    }

    return {
      title: {
        font: getDefaultContextFont(
          this.runtime.title.fontSize ?? SCORECARD_CHART_TITLE_FONT_SIZE,
          this.runtime.title.bold,
          this.runtime.title.italic
        ),
        color: this.runtime.title.color ?? this.secondaryFontColor,
      },
      keyValue: {
        color: this.runtime.keyValueStyle?.textColor || this.fontColor,
        font: getDefaultContextFont(
          keyValueFontSize,
          this.runtime.keyValueStyle?.bold,
          this.runtime.keyValueStyle?.italic
        ),
        strikethrough: this.runtime.keyValueStyle?.strikethrough,
        underline: this.runtime.keyValueStyle?.underline,
      },
      keyDescr: {
        color: this.runtime.keyValueDescrStyle?.textColor || this.fontColor,
        font: getDefaultContextFont(
          keyValueDescrFontSize,
          this.runtime.keyValueDescrStyle?.bold,
          this.runtime.keyValueDescrStyle?.italic
        ),
        strikethrough: this.runtime.keyValueDescrStyle?.strikethrough,
        underline: this.runtime.keyValueDescrStyle?.underline,
      },
      baselineValue: {
        font: getDefaultContextFont(
          baselineValueFontSize,
          this.runtime.baselineStyle?.bold,
          this.runtime.baselineStyle?.italic
        ),
        strikethrough: this.runtime.baselineStyle?.strikethrough,
        underline: this.runtime.baselineStyle?.underline,
        color:
          this.runtime.baselineColor ||
          this.runtime.baselineStyle?.textColor ||
          this.secondaryFontColor,
      },
      baselineDescr: {
        font: getDefaultContextFont(
          baselineDescrFontSize,
          this.runtime.baselineDescrStyle?.bold,
          this.runtime.baselineDescrStyle?.italic
        ),
        strikethrough: this.runtime.baselineDescrStyle?.strikethrough,
        underline: this.runtime.baselineDescrStyle?.underline,
        color: this.runtime.baselineDescrStyle?.textColor ?? this.secondaryFontColor,
      },
      baselineArrow:
        this.baselineArrow === "neutral" || this.runtime.progressBar
          ? undefined
          : {
              size: this.keyValue ? 0.8 * baselineValueFontSize : 0,
              color:
                this.runtime.baselineColor ||
                this.runtime.baselineStyle?.textColor ||
                this.secondaryFontColor,
            },
    };
  }
}
