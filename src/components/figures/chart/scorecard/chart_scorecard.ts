import { Component } from "@odoo/owl";
import { DEFAULT_FONT } from "../../../../constants";
import { getFontSizeMatchingWidth, relativeLuminance } from "../../../../helpers";
import { chartComponentRegistry } from "../../../../registries";
import { Color, Figure, Pixel, SpreadsheetChildEnv, Style } from "../../../../types";
import { ScorecardChartRuntime } from "../../../../types/chart/scorecard_chart";
import { cellTextStyleToCss, cssPropertiesToCss } from "../../../helpers";
import { css } from "../../../helpers/css";

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

css/* scss */ `
  div.o-scorecard {
    user-select: none;
    background-color: white;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .o-scorecard-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: center;
      text-align: center;
    }

    .o-title-text {
      text-align: left;
      height: ${LINE_HEIGHT + "em"};
      line-height: ${LINE_HEIGHT + "em"};
      overflow: hidden;
      white-space: nowrap;
    }

    .o-key-text {
      line-height: ${LINE_HEIGHT + "em"};
      height: ${LINE_HEIGHT + "em"};
      overflow: hidden;
      white-space: nowrap;
    }

    .o-cf-icon {
      display: inline-block;
      width: 0.65em;
      height: 1em;
      line-height: 1em;
      padding-bottom: 0.07em;
      padding-right: 3px;
    }

    .o-baseline-text {
      line-height: ${LINE_HEIGHT + "em"};
      height: ${LINE_HEIGHT + "em"};
      overflow: hidden;
      white-space: nowrap;

      .o-baseline-text-description {
        white-space: pre;
      }
    }
  }
`;

interface Props {
  figure: Figure;
}

export class ScorecardChart extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChart";
  private ctx = document.createElement("canvas").getContext("2d")!;

  get runtime(): ScorecardChartRuntime | undefined {
    return this.env.model.getters.getChartRuntime(this.props.figure.id) as ScorecardChartRuntime;
  }

  get title() {
    return this.runtime?.title || "";
  }

  get keyValue() {
    return this.runtime?.keyValue || "";
  }

  get baseline() {
    return this.runtime?.baselineDisplay || "";
  }

  get baselineDescr() {
    const baselineDescr = this.runtime?.baselineDescr || "";
    return this.baseline && baselineDescr ? " " + baselineDescr : baselineDescr;
  }

  get baselineArrowDirection() {
    return this.runtime?.baselineArrow || "neutral";
  }

  get backgroundColor() {
    return this.runtime?.background || "#ffffff";
  }

  get primaryFontColor() {
    return this.runtime?.fontColor || "#000000";
  }

  get secondaryFontColor() {
    return relativeLuminance(this.primaryFontColor) <= 0.3 ? "#757575" : "#bbbbbb";
  }

  get figure() {
    return this.props.figure;
  }

  get chartStyle() {
    return `
      height:${this.figure.height}px;
      width:${this.figure.width}px;
      padding:${this.chartPadding}px;
      background:${this.backgroundColor};
    `;
  }

  get chartContentStyle() {
    return `
      height:${this.getDrawableHeight()}px;
    `;
  }

  get chartPadding() {
    return this.figure.width * CHART_PADDING_RATIO;
  }

  getTextStyles() {
    // If the widest text overflows horizontally, scale it down, and apply the same scaling factors to all the other fonts.
    const maxLineWidth = this.figure.width * (1 - 2 * CHART_PADDING_RATIO);
    const widestElement = this.getWidestElement();
    const baseFontSize = widestElement.getElementMaxFontSize(this.getDrawableHeight(), this);
    const fontSizeMatchingWidth = getFontSizeMatchingWidth(
      maxLineWidth,
      baseFontSize,
      (fontSize: number) => widestElement.getElementWidth(fontSize, this.ctx, this)
    );
    let scalingFactor = fontSizeMatchingWidth / baseFontSize;

    // Fonts sizes in px
    const keyFontSize =
      new KeyValueElement().getElementMaxFontSize(this.getDrawableHeight(), this) * scalingFactor;
    const baselineFontSize =
      new BaselineElement().getElementMaxFontSize(this.getDrawableHeight(), this) * scalingFactor;

    return {
      titleStyle: this.getTextStyle({
        fontSize: TITLE_FONT_SIZE,
        color: this.secondaryFontColor,
      }),
      keyStyle: this.getTextStyle({
        fontSize: keyFontSize,
        cellStyle: this.runtime?.keyValueStyle,
        color: this.primaryFontColor,
      }),
      baselineStyle: this.getTextStyle({
        fontSize: baselineFontSize,
      }),
      baselineValueStyle: this.getTextStyle({
        fontSize: baselineFontSize,
        cellStyle: this.runtime?.baselineStyle,
        color: this.runtime?.baselineColor || this.secondaryFontColor,
      }),
      baselineDescrStyle: this.getTextStyle({
        fontSize: baselineFontSize * BASELINE_DESCR_FONT_RATIO,
        color: this.secondaryFontColor,
      }),
    };
  }

  /** Return an CSS style string corresponding to the given arguments */
  private getTextStyle(args: { fontSize: number; color?: Color; cellStyle?: Style }) {
    const cssAttributes = cellTextStyleToCss(args.cellStyle);
    cssAttributes["font-size"] = `${args.fontSize}px`;
    cssAttributes["display"] = "inline-block";
    if (!cssAttributes["color"] && args.color) {
      cssAttributes["color"] = args.color;
    }

    return cssPropertiesToCss(cssAttributes);
  }

  /** Get the height of the chart minus all the vertical paddings */
  private getDrawableHeight(): number {
    const verticalPadding = 2 * this.chartPadding;
    let availableHeight = this.figure.height - verticalPadding;
    availableHeight -= this.title ? TITLE_FONT_SIZE * LINE_HEIGHT : 0;
    return availableHeight;
  }

  /** Return the element with he widest text in the chart */
  private getWidestElement(): ScorecardScalableElement {
    const baseline = new BaselineElement();
    const keyValue = new KeyValueElement();

    return baseline.getElementWidth(BASELINE_BOX_HEIGHT_RATIO, this.ctx, this) >
      keyValue.getElementWidth(KEY_BOX_HEIGHT_RATIO, this.ctx, this)
      ? baseline
      : keyValue;
  }
}

interface ScorecardScalableElement {
  /** Return the width of an scorecard element in pixels */
  getElementWidth: (
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    chart: ScorecardChart
  ) => Pixel;

  /**
   * Get the maximal height of an element of the scorecard.
   *
   * This is computed such as all the height is taken by the elements, even if there is no title or baseline.
   */
  getElementMaxFontSize: (availableHeight: Pixel, chart: ScorecardChart) => number;
}

class BaselineElement implements ScorecardScalableElement {
  getElementWidth(fontSize: number, ctx: CanvasRenderingContext2D, chart: ScorecardChart): Pixel {
    if (!chart.runtime) return 0;
    const baselineStr = chart.baseline;
    // Put mock text to simulate the width of the up/down arrow
    const largeText = chart.baselineArrowDirection !== "neutral" ? "A " + baselineStr : baselineStr;
    ctx.font = `${fontSize}px ${DEFAULT_FONT}`;
    let textWidth = ctx.measureText(largeText).width;
    // Baseline descr font size should be smaller than baseline font size
    ctx.font = `${fontSize * BASELINE_DESCR_FONT_RATIO}px ${DEFAULT_FONT}`;
    textWidth += ctx.measureText(chart.baselineDescr).width;
    return textWidth;
  }

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChart): number {
    if (!chart.runtime) return 0;
    const haveBaseline = chart.baseline !== "" || chart.baselineDescr;
    const maxHeight = haveBaseline ? BASELINE_BOX_HEIGHT_RATIO * availableHeight : 0;
    return maxHeight / LINE_HEIGHT;
  }
}

class KeyValueElement implements ScorecardScalableElement {
  getElementWidth(fontSize: number, ctx: CanvasRenderingContext2D, chart: ScorecardChart): Pixel {
    if (!chart.runtime) return 0;
    const str = chart.keyValue || "";
    ctx.font = `${fontSize}px ${DEFAULT_FONT}`;
    return ctx.measureText(str).width;
  }

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChart): number {
    if (!chart.runtime) return 0;
    const haveBaseline = chart.baseline !== "" || chart.baselineDescr;
    const maxHeight = haveBaseline ? KEY_BOX_HEIGHT_RATIO * availableHeight : availableHeight;
    return maxHeight / LINE_HEIGHT;
  }
}

chartComponentRegistry.add("scorecard", ScorecardChart);
