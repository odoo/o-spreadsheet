import { Color } from "chart.js";
import { DEFAULT_FONT } from "../../../constants";
import { DOMDimension, Pixel, PixelPosition, Style } from "../../../types";
import { BaselineArrowDirection, ScorecardChartRuntime } from "../../../types/chart";
import { relativeLuminance } from "../../color";
import {
  computeCachedTextWidth,
  computeTextWidth,
  getFontSizeMatchingWidth,
  splitTextInTwoLines,
} from "../../text_helper";

/* Sizes of boxes containing the texts, in percentage of the Chart size */
const TITLE_FONT_SIZE = 18;
const KEY_BOX_HEIGHT_RATIO = 0.8;

/* Padding at the border of the chart */
const CHART_PADDING = 10;
const BOTTOM_PADDING_RATIO = 0.05;

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
  baselineDescr?: ScorecardChartElement[];
  key?: ScorecardChartElement;
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

  constructor({ width, height }: DOMDimension, readonly runtime: ScorecardChartRuntime) {
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

    let titleHeight = 0;
    if (this.title) {
      ({ height: titleHeight } = this.getFullTextDimensions(this.title, style.title.font));
      structure.title = {
        text: this.title,
        style: style.title,
        position: {
          x: CHART_PADDING,
          y: CHART_PADDING / 2 + titleHeight,
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
    const baselineDescrWidth = style.baselineDescr.isSplit
      ? Math.max(
          ...splitTextInTwoLines(this.baselineDescr).map(
            (line) => this.getTextDimensions(line, style.baselineDescr.font).width
          )
        )
      : this.getTextDimensions(this.baselineDescr, style.baselineDescr.font).width;

    structure.baseline = {
      text: this.baseline,
      style: style.baselineValue,
      position: {
        x: (this.width - baselineWidth - baselineDescrWidth + baselineArrowSize) / 2,
        y: this.keyValue
          ? this.height * (1 - BOTTOM_PADDING_RATIO * (this.runtime.progressBar ? 1 : 2))
          : this.height - (this.height - titleHeight - baselineHeight) / 2 - CHART_PADDING,
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

    if (this.baselineDescr) {
      const position = {
        x: structure.baseline.position.x + baselineWidth,
        y: structure.baseline.position.y,
      };
      if (style.baselineDescr.isSplit) {
        const description = splitTextInTwoLines(this.baselineDescr);
        const measure = this.context.measureText(description[1]);
        const deltaY = measure.fontBoundingBoxAscent + measure.fontBoundingBoxDescent;
        structure.baselineDescr = [
          {
            text: description[0],
            style: style.baselineDescr,
            position: {
              x: position.x,
              y: position.y - deltaY,
            },
          },
          {
            text: description[1],
            style: style.baselineDescr,
            position,
          },
        ];
      } else {
        structure.baselineDescr = [
          {
            text: this.baselineDescr,
            style: style.baselineDescr,
            position,
          },
        ];
      }
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
    if (this.keyValue) {
      structure.key = {
        text: this.keyValue,
        style: style.keyValue,
        position: {
          x: (this.width - keyWidth) / 2,
          y:
            this.height * (0.5 - BOTTOM_PADDING_RATIO * 2) +
            (titleHeight + keyHeight / (this.baseline || this.baselineDescr ? 2 : 1.2)) / 2,
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
    // If the widest text overflows horizontally, scale it down, and apply the same scaling factors to all the other fonts.
    const maxLineWidth = this.width - 2 * CHART_PADDING;
    const drawableHeight = this.getDrawableHeight();

    // Fonts sizes in px
    const keyValueElement = new KeyValueElement(this.runtime.keyValueStyle);
    const heightFont = keyValueElement.getElementMaxFontSize(drawableHeight, this);
    const widthFont = getFontSizeMatchingWidth(maxLineWidth, 600, (fontSize: number) =>
      keyValueElement.getElementWidth(fontSize, this.context, this)
    );
    const keyFontSize = Math.min(heightFont, widthFont);
    let baselineValueFontSize = Math.floor(keyFontSize * 0.5);

    this.context.font = getDefaultContextFont(
      baselineValueFontSize,
      this.runtime.baselineStyle?.bold,
      this.runtime.baselineStyle?.italic
    );
    const baselineText = this.baselineArrow !== "neutral" ? "A " + this.baseline : this.baseline;
    const baselineValueWidth = computeCachedTextWidth(this.context, baselineText);
    const remainingWidth = maxLineWidth - baselineValueWidth;
    let baselineDescrFontSize = getFontSizeMatchingWidth(
      remainingWidth,
      baselineValueFontSize,
      (fontSize: number) => computeTextWidth(this.context, this.baselineDescr, { fontSize })
    );

    let isBaselineSplit = false;
    if (baselineDescrFontSize < baselineValueFontSize / 2.5) {
      isBaselineSplit = true;
      baselineDescrFontSize = Math.floor(baselineValueFontSize / 2.5);
      for (const line of splitTextInTwoLines(this.baselineDescr)) {
        const lineWidth = getFontSizeMatchingWidth(
          remainingWidth,
          baselineValueFontSize,
          (fontSize: number) => {
            this.context.font = getDefaultContextFont(fontSize);
            return this.context.measureText(line).width;
          }
        );
        baselineDescrFontSize = Math.min(baselineDescrFontSize, lineWidth);
      }
    }
    if (this.runtime.progressBar) {
      baselineValueFontSize /= 1.5;
    }

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
          baselineValueFontSize,
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
        font: getDefaultContextFont(baselineDescrFontSize),
        isSplit: isBaselineSplit,
        color: this.secondaryFontColor,
      },
      baselineArrow:
        this.baselineArrow === "neutral" || this.runtime.progressBar
          ? undefined
          : {
              size: this.keyValue ? 0.8 * baselineValueFontSize : 0,
              color: this.runtime.baselineColor || this.secondaryFontColor,
            },
    };
  }

  /** Get the height of the chart minus all the vertical paddings */
  private getDrawableHeight(): number {
    const verticalPadding = CHART_PADDING + this.height * BOTTOM_PADDING_RATIO;
    let availableHeight = this.height - 2 * verticalPadding;
    availableHeight -= this.title ? TITLE_FONT_SIZE * LINE_HEIGHT : 0;
    return availableHeight;
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
    return computeCachedTextWidth(ctx, text);
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
