import { Color } from "chart.js";
import { DEFAULT_FONT } from "../../../constants";
import { Figure, Pixel, PixelPosition, Style } from "../../../types";
import { ScorecardChartRuntime } from "../../../types/chart";
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

type ScorecardChartDesignElement = {
  text: string;
  style: {
    font: string;
    color: Color;
    strikethrough?: boolean;
    underline?: boolean;
  };
  position: PixelPosition;
};

export type ScorecardChartDesign = {
  canvas: {
    width: number;
    height: number;
    backgroundColor: Color;
  };
  title?: ScorecardChartDesignElement;
  baselineArrow?: ScorecardChartDesignElement;
  baseline?: ScorecardChartDesignElement;
  baselineDescr?: ScorecardChartDesignElement;
  key?: ScorecardChartDesignElement;
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

export class ScorecardChartDesigner {
  private context;
  private width: number;
  private height: number;

  constructor(figure: Figure, readonly runtime: ScorecardChartRuntime) {
    const canvas = document.createElement("canvas");
    this.width = canvas.width = figure.width;
    this.height = canvas.height = figure.height;
    this.context = canvas.getContext("2d")!;
  }

  computeDesign(): ScorecardChartDesign {
    const structure: ScorecardChartDesign = {
      canvas: {
        width: this.width,
        height: this.height,
        backgroundColor: this.backgroundColor,
      },
      title: undefined,
    };
    const style = this.getTextStyles();
    this.context.font = getDefaultContextFont(style.titleStyle.fontSize);
    const titleMeasure = this.context.measureText(this.title);
    const titleHeight =
      titleMeasure.actualBoundingBoxAscent + titleMeasure.actualBoundingBoxDescent;
    if (this.title) {
      structure.title = {
        text: this.title,
        style: {
          font: this.context.font,
          color: style.titleStyle.color,
        },
        position: {
          x: this.chartPadding,
          y: this.chartPadding + titleHeight,
        },
      };
    }

    const baselineArrowFont = getDefaultContextFont(style.baselineValueStyle.fontSize);
    const baselineValueFont = getDefaultContextFont(
      style.baselineValueStyle.fontSize,
      style.baselineValueStyle?.cellStyle?.bold,
      style.baselineValueStyle?.cellStyle?.italic
    );
    const baselineDescriptionFont = getDefaultContextFont(style.baselineDescrStyle.fontSize);

    this.context.font = baselineArrowFont;
    let baselineArrow = "";
    if (this.baselineArrowDirection === "up") {
      baselineArrow = "\u{1F871}";
    } else if (this.baselineArrowDirection === "down") {
      baselineArrow = "\u{1F873}";
    }
    const baselineArrowMeasure = this.context.measureText(baselineArrow);

    this.context.font = baselineValueFont;
    const baselineMeasure = this.context.measureText(this.baseline);
    const baselineHeight =
      baselineMeasure.actualBoundingBoxAscent + baselineMeasure.actualBoundingBoxDescent;

    this.context.font = baselineDescriptionFont;
    const descrMeasure = this.context.measureText(this.baselineDescr);

    structure.baselineArrow = {
      text: baselineArrow,
      style: {
        font: baselineArrowFont,
        color: style.baselineValueStyle.color,
      },
      position: {
        x:
          this.width / 2 -
          (baselineMeasure.width + descrMeasure.width + baselineArrowMeasure.width) / 2,
        y: this.height - 2 * this.chartPadding,
      },
    };

    structure.baseline = {
      text: this.baseline,
      style: {
        color: style.baselineValueStyle.cellStyle?.textColor || style.baselineValueStyle.color,
        font: baselineValueFont,
        strikethrough: style.baselineValueStyle.cellStyle?.strikethrough,
        underline: style.baselineValueStyle.cellStyle?.underline,
      },
      position: {
        x: structure.baselineArrow.position.x + baselineArrowMeasure.width,
        y: structure.baselineArrow.position.y,
      },
    };

    if (this.baselineDescr) {
      structure.baselineDescr = {
        text: this.baselineDescr,
        style: {
          color: style.baselineDescrStyle.color,
          font: `${style.baselineDescrStyle.fontSize}px ${DEFAULT_FONT}`,
        },
        position: {
          x: structure.baseline.position.x + baselineMeasure.width,
          y: structure.baseline.position.y,
        },
      };
    }

    this.context.font = getDefaultContextFont(
      style.keyStyle.fontSize,
      style.keyStyle.cellStyle?.bold,
      style.keyStyle.cellStyle?.italic
    );
    const keyMeasure = this.context.measureText(this.keyValue);
    const keyHeight = keyMeasure.actualBoundingBoxAscent + keyMeasure.actualBoundingBoxDescent;
    if (this.keyValue) {
      structure.key = {
        text: this.keyValue,
        style: {
          color: style.keyStyle.cellStyle?.textColor || style.keyStyle.color,
          font: this.context.font,
          strikethrough: style.keyStyle.cellStyle?.strikethrough,
          underline: style.keyStyle.cellStyle?.underline,
        },
        position: {
          x: (this.width - keyMeasure.width) / 2,
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

  get baselineArrowDirection() {
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
      titleStyle: {
        fontSize: TITLE_FONT_SIZE,
        color: this.secondaryFontColor,
      },
      keyStyle: {
        fontSize: keyFontSize,
        cellStyle: this.runtime.keyValueStyle,
        color: this.runtime.fontColor,
      },
      baselineStyle: {
        fontSize: baselineFontSize,
      },
      baselineValueStyle: {
        fontSize: baselineFontSize,
        cellStyle: this.runtime.baselineStyle,
        color: this.runtime.baselineColor || this.secondaryFontColor,
      },
      baselineDescrStyle: {
        fontSize: baselineFontSize * BASELINE_DESCR_FONT_RATIO,
        color: this.secondaryFontColor,
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
    chart: ScorecardChartDesigner
  ): Pixel;

  /**
   * Get the maximal height of an element of the scorecard.
   *
   * This is computed such as all the height is taken by the elements, even if there is no title or baseline.
   */
  abstract getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChartDesigner): number;

  protected measureTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number) {
    ctx.font = getDefaultContextFont(fontSize, this.style.bold, this.style.italic);
    return ctx.measureText(text).width;
  }
}

class BaselineElement extends ScorecardScalableElement {
  getElementWidth(
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    chart: ScorecardChartDesigner
  ): Pixel {
    if (!chart.runtime) {
      return 0;
    }
    const baselineStr = chart.baseline;
    // Put mock text to simulate the width of the up/down arrow
    const largeText = chart.baselineArrowDirection !== "neutral" ? "A " + baselineStr : baselineStr;
    let textWidth = this.measureTextWidth(ctx, largeText, fontSize);
    // Baseline descr font size should be smaller than baseline font size
    textWidth += this.measureTextWidth(
      ctx,
      chart.baselineDescr,
      fontSize * BASELINE_DESCR_FONT_RATIO
    );
    return textWidth;
  }

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChartDesigner): number {
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
    chart: ScorecardChartDesigner
  ): Pixel {
    if (!chart.runtime) {
      return 0;
    }
    const str = chart.keyValue || "";
    return this.measureTextWidth(ctx, str, fontSize);
  }

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChartDesigner): number {
    if (!chart.runtime) {
      return 0;
    }
    const haveBaseline = chart.baseline !== "" || chart.baselineDescr;
    const maxHeight = haveBaseline ? KEY_BOX_HEIGHT_RATIO * availableHeight : availableHeight;
    return maxHeight / LINE_HEIGHT;
  }
}
