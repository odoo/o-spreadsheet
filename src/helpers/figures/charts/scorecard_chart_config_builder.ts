import type { Color } from "chart.js";
import { DEFAULT_FONT } from "../../../constants";
import type { DOMDimension, Pixel, PixelPosition, Style } from "../../../types";
import type { BaselineArrowDirection, ScorecardChartRuntime } from "../../../types/chart";
import { relativeLuminance } from "../../color";
import { getFontSizeMatchingWidth } from "../../text_helper";

/* Sizes of boxes containing the texts, in percentage of the Chart size */
const TITLE_FONT_SIZE = 18;

const BASELINE_BOX_HEIGHT_RATIO = 0.35;
const KEY_BOX_HEIGHT_RATIO = 0.65;

/** Baseline description should have a smaller font than the baseline */
const BASELINE_DESCR_FONT_RATIO = 0.9;

/* Padding at the border of the chart, in percentage of the chart width */
const CHART_PADDING_RATIO = 0.02;

/**
 * Line height (in em)
 * Having a line heigh =1em (=font size) don't work, the font will overflow.
 */
const LINE_HEIGHT = 1.2;

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
};

export function formatBaselineDescr(
  baselineDescr: string | undefined,
  baseline: string | undefined
): string {
  const _baselineDescr = baselineDescr || "";
  return baseline && _baselineDescr ? " " + _baselineDescr : _baselineDescr;
}

function getDefaultContextFont(
  fontSize: number,
  bold: boolean | undefined = false,
  italic: boolean | undefined = false
): string {
  const italicStr = italic ? "italic" : "";
  const weight = bold ? "bold" : "";
  return `${italicStr} ${weight} ${fontSize}px ${DEFAULT_FONT}`;
}

export function getScorecardConfiguration(
  { width, height }: DOMDimension,
  runtime: ScorecardChartRuntime
): ScorecardChartConfig {
  const designer = new ScorecardChartConfigBuilder({ width, height }, runtime);
  return designer.computeDesign();
}

class ScorecardChartConfigBuilder {
  private context: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(
    { width, height }: { width: Pixel; height: Pixel },
    readonly runtime: ScorecardChartRuntime
  ) {
    const canvas = document.createElement("canvas");
    this.width = canvas.width = width;
    this.height = canvas.height = height;
    this.context = canvas.getContext("2d")!;
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

    const { height: titleHeight } = this.getTextDimensions(this.title, style.title.font);
    if (this.title) {
      structure.title = {
        text: this.title,
        style: style.title,
        position: {
          x: this.chartPadding,
          y: this.chartPadding + titleHeight,
        },
      };
    }

    const baselineArrowSize = style.baselineArrow?.size ?? 0;

    const { height: baselineHeight, width: baselineWidth } = this.getTextDimensions(
      this.baseline,
      style.baselineValue.font
    );
    const { width: baselineDescrWidth } = this.getTextDimensions(
      this.baselineDescr,
      style.baselineDescr.font
    );

    structure.baseline = {
      text: this.baseline,
      style: style.baselineValue,
      position: {
        x: (this.width - baselineWidth - baselineDescrWidth + baselineArrowSize) / 2,
        y: this.keyValue
          ? this.height - 2 * this.chartPadding
          : this.height - (this.height - titleHeight - baselineHeight) / 2 - this.chartPadding,
      },
    };

    if (style.baselineArrow) {
      structure.baselineArrow = {
        direction: this.baselineArrow,
        style: style.baselineArrow,
        position: {
          x: structure.baseline.position.x - baselineArrowSize,
          y: structure.baseline.position.y - (baselineHeight + baselineArrowSize) / 2,
        },
      };
    }

    if (this.baselineDescr) {
      structure.baselineDescr = {
        text: this.baselineDescr,
        style: style.baselineDescr,
        position: {
          x: structure.baseline.position.x + baselineWidth,
          y: structure.baseline.position.y,
        },
      };
    }

    const { height: keyHeight, width: keyWidth } = this.getTextDimensions(
      this.keyValue,
      style.keyValue.font
    );
    if (this.keyValue) {
      structure.key = {
        text: this.keyValue,
        style: style.keyValue,
        position: {
          x: (this.width - keyWidth) / 2,
          y: (this.height - baselineHeight + titleHeight + keyHeight) / 2 - this.chartPadding,
        },
      };
    }
    return structure;
  }

  private get title() {
    return this.runtime.title;
  }

  get keyValue() {
    return this.runtime.keyValue;
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
    return this.runtime.background;
  }

  private get secondaryFontColor() {
    return relativeLuminance(this.backgroundColor) > 0.3 ? "#525252" : "#C8C8C8";
  }

  private get chartPadding() {
    return this.width * CHART_PADDING_RATIO;
  }

  private getTextDimensions(text: string, font: string) {
    this.context.font = font;
    const measure = this.context.measureText(text);
    return {
      width: measure.width,
      height: measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent,
    };
  }

  private getTextStyles() {
    // If the widest text overflows horizontally, scale it down, and apply the same scaling factors to all the other fonts.
    const maxLineWidth = this.width * (1 - 2 * CHART_PADDING_RATIO);
    const widestElement = this.getWidestElement();
    const baseFontSize = widestElement.getElementMaxFontSize(this.getDrawableHeight(), this);
    const fontSizeMatchingWidth = getFontSizeMatchingWidth(
      maxLineWidth,
      baseFontSize,
      (fontSize: number) => widestElement.getElementWidth(fontSize, this.context, this)
    );
    let scalingFactor = fontSizeMatchingWidth / baseFontSize;

    // Fonts sizes in px
    const keyFontSize =
      new KeyValueElement(this.runtime.keyValueStyle).getElementMaxFontSize(
        this.getDrawableHeight(),
        this
      ) * scalingFactor;
    const baselineFontSize =
      new BaselineElement(this.runtime.baselineStyle).getElementMaxFontSize(
        this.getDrawableHeight(),
        this
      ) * scalingFactor;

    return {
      title: {
        font: getDefaultContextFont(TITLE_FONT_SIZE),
        color: this.secondaryFontColor,
      },
      keyValue: {
        color: this.runtime.keyValueStyle?.textColor || this.runtime.fontColor,
        font: getDefaultContextFont(
          keyFontSize,
          this.runtime.keyValueStyle?.bold,
          this.runtime.keyValueStyle?.italic
        ),
        strikethrough: this.runtime.keyValueStyle?.strikethrough,
        underline: this.runtime.keyValueStyle?.underline,
      },
      baselineValue: {
        font: getDefaultContextFont(
          baselineFontSize,
          this.runtime.baselineStyle?.bold,
          this.runtime.baselineStyle?.italic
        ),
        strikethrough: this.runtime.baselineStyle?.strikethrough,
        underline: this.runtime.baselineStyle?.underline,
        color:
          this.runtime.baselineStyle?.textColor ||
          this.runtime.baselineColor ||
          this.secondaryFontColor,
      },
      baselineDescr: {
        font: getDefaultContextFont(baselineFontSize * BASELINE_DESCR_FONT_RATIO),
        color: this.secondaryFontColor,
      },
      baselineArrow:
        this.baselineArrow === "neutral"
          ? undefined
          : {
              size: this.keyValue ? 0.8 * baselineFontSize : 0,
              color: this.runtime.baselineColor || this.secondaryFontColor,
            },
    };
  }

  /** Get the height of the chart minus all the vertical paddings */
  private getDrawableHeight(): number {
    const verticalPadding = 2 * this.chartPadding;
    let availableHeight = this.height - verticalPadding;
    availableHeight -= this.title ? TITLE_FONT_SIZE * LINE_HEIGHT : 0;
    return availableHeight;
  }

  /** Return the element with he widest text in the chart */
  private getWidestElement(): ScorecardScalableElement {
    const baseline = new BaselineElement(this.runtime.baselineStyle);
    const keyValue = new KeyValueElement(this.runtime.keyValueStyle);

    return baseline.getElementWidth(BASELINE_BOX_HEIGHT_RATIO, this.context, this) >
      keyValue.getElementWidth(KEY_BOX_HEIGHT_RATIO, this.context, this)
      ? baseline
      : keyValue;
  }
}

abstract class ScorecardScalableElement {
  constructor(private style: Style = {}) {}

  /** Return the width of an scorecard element in pixels */
  abstract getElementWidth(
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    chart: ScorecardChartConfigBuilder
  ): Pixel;

  /**
   * Get the maximal height of an element of the scorecard.
   *
   * This is computed such as all the height is taken by the elements, even if there is no title or baseline.
   */
  abstract getElementMaxFontSize(
    availableHeight: Pixel,
    chart: ScorecardChartConfigBuilder
  ): number;

  protected measureTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number) {
    ctx.font = getDefaultContextFont(fontSize, this.style.bold, this.style.italic);
    return ctx.measureText(text).width;
  }
}

class BaselineElement extends ScorecardScalableElement {
  getElementWidth(
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    chart: ScorecardChartConfigBuilder
  ): Pixel {
    if (!chart.runtime) {
      return 0;
    }
    const baselineStr = chart.baseline;
    // Put mock text to simulate the width of the up/down arrow
    const largeText = chart.baselineArrow !== "neutral" ? "A " + baselineStr : baselineStr;
    let textWidth = this.measureTextWidth(ctx, largeText, fontSize);
    // Baseline descr font size should be smaller than baseline font size
    textWidth += this.measureTextWidth(
      ctx,
      chart.baselineDescr,
      fontSize * BASELINE_DESCR_FONT_RATIO
    );
    return textWidth;
  }

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChartConfigBuilder): number {
    if (!chart.runtime) {
      return 0;
    }
    const haveBaseline = chart.baseline !== "" || chart.baselineDescr;
    const maxHeight = haveBaseline ? BASELINE_BOX_HEIGHT_RATIO * availableHeight : 0;
    return maxHeight / LINE_HEIGHT;
  }
}

class KeyValueElement extends ScorecardScalableElement {
  getElementWidth(
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    chart: ScorecardChartConfigBuilder
  ): Pixel {
    if (!chart.runtime) {
      return 0;
    }
    const str = chart.keyValue || "";
    return this.measureTextWidth(ctx, str, fontSize);
  }

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChartConfigBuilder): number {
    if (!chart.runtime) {
      return 0;
    }
    const haveBaseline = chart.baseline !== "" || chart.baselineDescr;
    const maxHeight = haveBaseline ? KEY_BOX_HEIGHT_RATIO * availableHeight : availableHeight;
    return maxHeight / LINE_HEIGHT;
  }
}
