import { transformZone } from "../../../collaborative/ot/ot_helpers";
import { cssPropertiesToCss } from "../../../components/helpers";
import {
  DEFAULT_FONT,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { _t } from "../../../translation";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  EvaluatedCell,
  Figure,
  Getters,
  Pixel,
  PixelPosition,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
} from "../../../types";
import { ChartCreationContext } from "../../../types/chart/chart";
import {
  BaselineMode,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../../types/chart/scorecard_chart";
import { Validator } from "../../../types/validator";
import { relativeLuminance } from "../../color";
import { getFontSizeMatchingWidth } from "../../misc";
import { createRange } from "../../range";
import { rangeReference } from "../../references";
import { toUnboundedZone, zoneToXc } from "../../zones";
import { AbstractChart } from "./abstract_chart";
import {
  adaptChartRange,
  chartFontColor,
  copyLabelRangeWithNewSheetId,
  getBaselineArrowDirection,
  getBaselineColor,
  getBaselineText,
} from "./chart_common";

function checkKeyValue(definition: ScorecardChartDefinition): CommandResult {
  return definition.keyValue && !rangeReference.test(definition.keyValue)
    ? CommandResult.InvalidScorecardKeyValue
    : CommandResult.Success;
}

function checkBaseline(definition: ScorecardChartDefinition): CommandResult {
  return definition.baseline && !rangeReference.test(definition.baseline)
    ? CommandResult.InvalidScorecardBaseline
    : CommandResult.Success;
}

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
    strikethrough?: {
      from: PixelPosition;
      to: PixelPosition;
    };
    underline?: {
      from: PixelPosition;
      to: PixelPosition;
    };
    lineWidth?: number;
  };
  position: PixelPosition;
};

export type ScorecardChartDesign = {
  canvas: {
    width: number;
    height: number;
    backgroundColor: Color;
  };
  title: ScorecardChartDesignElement;
  baselineArrow: ScorecardChartDesignElement;
  baseline: ScorecardChartDesignElement;
  baselineDescr: ScorecardChartDesignElement;
  key: ScorecardChartDesignElement;
};

export class ScorecardChart extends AbstractChart {
  readonly keyValue?: Range;
  readonly baseline?: Range;
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: string;
  readonly background?: Color;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
  readonly fontColor?: Color;
  readonly type = "scorecard";

  constructor(definition: ScorecardChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.keyValue = createRange(getters, sheetId, definition.keyValue);
    this.baseline = createRange(getters, sheetId, definition.baseline);
    this.baselineMode = definition.baselineMode;
    this.baselineDescr = definition.baselineDescr;
    this.background = definition.background;
    this.baselineColorUp = definition.baselineColorUp;
    this.baselineColorDown = definition.baselineColorDown;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScorecardChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkKeyValue, checkBaseline);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScorecardChartDefinition {
    return {
      background: context.background,
      type: "scorecard",
      keyValue: context.range ? context.range[0] : undefined,
      title: context.title || "",
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baseline: context.auxiliaryRange || "",
    };
  }

  static transformDefinition(
    definition: ScorecardChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ScorecardChartDefinition {
    let baselineZone: UnboundedZone | undefined;
    let keyValueZone: UnboundedZone | undefined;

    if (definition.baseline) {
      baselineZone = transformZone(toUnboundedZone(definition.baseline), executed);
    }
    if (definition.keyValue) {
      keyValueZone = transformZone(toUnboundedZone(definition.keyValue), executed);
    }
    return {
      ...definition,
      baseline: baselineZone ? zoneToXc(baselineZone) : undefined,
      keyValue: keyValueZone ? zoneToXc(keyValueZone) : undefined,
    };
  }

  copyForSheetId(sheetId: UID): ScorecardChart {
    const baseline = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.baseline);
    const keyValue = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.keyValue);
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue, sheetId);
    return new ScorecardChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScorecardChart {
    const definition = this.getDefinitionWithSpecificRanges(this.baseline, this.keyValue, sheetId);
    return new ScorecardChart(definition, sheetId, this.getters);
  }

  getDefinition(): ScorecardChartDefinition {
    return this.getDefinitionWithSpecificRanges(this.baseline, this.keyValue);
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range: this.keyValue ? [this.getters.getRangeString(this.keyValue, this.sheetId)] : undefined,
      auxiliaryRange: this.baseline
        ? this.getters.getRangeString(this.baseline, this.sheetId)
        : undefined,
    };
  }

  private getDefinitionWithSpecificRanges(
    baseline: Range | undefined,
    keyValue: Range | undefined,
    targetSheetId?: UID
  ): ScorecardChartDefinition {
    return {
      baselineColorDown: this.baselineColorDown,
      baselineColorUp: this.baselineColorUp,
      baselineMode: this.baselineMode,
      title: this.title,
      type: "scorecard",
      background: this.background,
      baseline: baseline
        ? this.getters.getRangeString(baseline, targetSheetId || this.sheetId)
        : undefined,
      baselineDescr: this.baselineDescr,
      keyValue: keyValue
        ? this.getters.getRangeString(keyValue, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  getDefinitionForExcel() {
    // This kind of graph is not exportable in Excel
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): ScorecardChart {
    const baseline = adaptChartRange(this.baseline, applyChange);
    const keyValue = adaptChartRange(this.keyValue, applyChange);
    if (this.baseline === baseline && this.keyValue === keyValue) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue);
    return new ScorecardChart(definition, this.sheetId, this.getters);
  }
}

export function formatBaselineDescr(
  baselineDescr: string | undefined,
  baseline: string | undefined
): string {
  const _baselineDescr = baselineDescr || "";
  return baseline && _baselineDescr ? " " + _baselineDescr : _baselineDescr;
}

export class ScorecardChartDrawer {
  ctx = document.createElement("canvas").getContext("2d")!;
  constructor(
    private props: { figure: Figure },
    private canvas: HTMLCanvasElement,
    readonly runtime: ScorecardChartRuntime
  ) {}

  drawChart() {
    const structure = this.computeChart();
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d")!;
    // Background
    ctx.fillStyle = structure.canvas.backgroundColor;
    ctx.fillRect(0, 0, structure.canvas.width, structure.canvas.height);

    // Title
    if (structure.title) {
      ctx.font = structure.title.style.font;
      ctx.fillStyle = structure.title.style.color;
      ctx.fillText(structure.title.text, structure.title.position.x, structure.title.position.y);
    }

    // Baseline
    if (structure.baseline) {
      ctx.font = structure.baseline.style.font;
      ctx.fillStyle = structure.baseline.style.color;
      ctx.fillText(
        structure.baseline.text,
        structure.baseline.position.x,
        structure.baseline.position.y
      );
      if (structure.baseline.style?.strikethrough) {
        ctx.lineWidth = structure.baseline.style.lineWidth ?? 1;
        ctx.strokeStyle = structure.baseline.style.color;
        ctx.beginPath();
        ctx.moveTo(
          structure.baseline.style.strikethrough.from.x,
          structure.baseline.style.strikethrough.from.y
        );
        ctx.lineTo(
          structure.baseline.style.strikethrough.to.x,
          structure.baseline.style.strikethrough.to.y
        );
        ctx.stroke();
      }
      if (structure.baseline.style?.underline) {
        ctx.lineWidth = structure.baseline.style.lineWidth ?? 1;
        ctx.strokeStyle = structure.baseline.style.color;
        ctx.beginPath();
        ctx.moveTo(
          structure.baseline.style.underline.from.x,
          structure.baseline.style.underline.from.y
        );
        ctx.lineTo(
          structure.baseline.style.underline.to.x,
          structure.baseline.style.underline.to.y
        );
        ctx.stroke();
      }
    }

    // Baseline arrow
    if (structure.baselineArrow) {
      ctx.font = structure.baselineArrow.style.font;
      ctx.fillStyle = structure.baselineArrow.style.color;
      ctx.fillText(
        structure.baselineArrow.text,
        structure.baselineArrow.position.x,
        structure.baselineArrow.position.y
      );
    }

    // Baseline description
    if (structure.baselineDescr) {
      ctx.font = structure.baselineDescr.style.font;
      ctx.fillStyle = structure.baselineDescr.style.color;
      ctx.fillText(
        structure.baselineDescr.text,
        structure.baselineDescr.position.x,
        structure.baselineDescr.position.y
      );
    }

    // Key value
    if (structure.key) {
      ctx.font = structure.key.style.font;
      ctx.fillStyle = structure.key.style.color;
      ctx.fillText(structure.key.text, structure.key.position.x, structure.key.position.y);
      if (structure.key.style?.strikethrough) {
        ctx.lineWidth = structure.key.style.lineWidth ?? 1;
        ctx.strokeStyle = structure.key.style.color;
        ctx.beginPath();
        ctx.moveTo(
          structure.key.style.strikethrough.from.x,
          structure.key.style.strikethrough.from.y
        );
        ctx.lineTo(structure.key.style.strikethrough.to.x, structure.key.style.strikethrough.to.y);
        ctx.stroke();
      }
      if (structure.key.style?.underline) {
        ctx.lineWidth = structure.key.style.lineWidth ?? 1;
        ctx.strokeStyle = structure.key.style.color;
        ctx.beginPath();
        ctx.moveTo(structure.key.style.underline.from.x, structure.key.style.underline.from.y);
        ctx.lineTo(structure.key.style.underline.to.x, structure.key.style.underline.to.y);
        ctx.stroke();
      }
    }
  }

  computeChart(): ScorecardChartDesign {
    const structure: any = {
      canvas: {
        width: this.props.figure.width,
        height: this.props.figure.height,
        backgroundColor: this.backgroundColor,
      },
      title: undefined,
    };
    const canvas = this.canvas;
    canvas.width = this.props.figure.width;
    canvas.height = this.props.figure.height;
    const ctx = canvas.getContext("2d")!;
    const style = this.getTextStyles();
    ctx.font = `${style.titleStyle.fontSize}px ${DEFAULT_FONT}`;
    const titleMeasure = ctx.measureText(this.title);
    const titleHeight =
      titleMeasure.actualBoundingBoxAscent + titleMeasure.actualBoundingBoxDescent;
    if (this.title) {
      structure.title = {
        text: this.title,
        style: {
          font: `${style.titleStyle.fontSize}px ${DEFAULT_FONT}`,
          color: style.titleStyle.color,
        },
        position: {
          x: this.chartPadding,
          y: this.chartPadding + titleHeight,
        },
      };
    }
    ctx.font = `${style.baselineValueStyle.fontSize}px ${DEFAULT_FONT}`;
    let baselineArrow = "";
    if (this.baselineArrowDirection === "up") {
      baselineArrow = "\u{1F871}";
    } else if (this.baselineArrowDirection === "down") {
      baselineArrow = "\u{1F873}";
    }
    const baselineArrowMeasure = ctx.measureText(baselineArrow);
    const baselineMeasure = ctx.measureText(this.baseline);
    const baselineHeight =
      baselineMeasure.actualBoundingBoxAscent + baselineMeasure.actualBoundingBoxDescent;
    ctx.font = `${style.baselineDescrStyle.fontSize}px ${DEFAULT_FONT}`;
    const descrMeasure = ctx.measureText(this.baselineDescr);
    ctx.font = `${style.baselineValueStyle.fontSize}px ${DEFAULT_FONT}`;
    structure.baselineArrow = {
      text: baselineArrow,
      style: {
        font: ctx.font,
        color: style.baselineValueStyle.color,
      },
      position: {
        x:
          canvas.width / 2 -
          (baselineMeasure.width + descrMeasure.width + baselineArrowMeasure.width) / 2,
        y: canvas.height - 2 * this.chartPadding,
      },
    };
    if (style.baselineValueStyle.cellStyle?.bold) {
      ctx.font = "bold " + ctx.font;
    }
    if (style.baselineValueStyle.cellStyle?.italic) {
      ctx.font = "italic " + ctx.font;
    }
    structure.baseline = {
      text: this.baseline,
      style: {
        color: style.baselineValueStyle.cellStyle?.textColor || style.baselineValueStyle.color,
        font: ctx.font,
      },
      position: {
        x: structure.baselineArrow.position.x + baselineArrowMeasure.width,
        y: structure.baselineArrow.position.y,
      },
    };
    if (style.baselineValueStyle.cellStyle?.strikethrough) {
      structure.baseline.style.lineWidth = style.baselineValueStyle.fontSize / 10;
      structure.baseline.style.strikethrough = {
        from: {
          x: structure.baseline.position.x,
          y: canvas.height - this.chartPadding - baselineHeight / 2,
        },
        to: {
          x: structure.baseline.position.x + baselineMeasure.width,
          y: canvas.height - this.chartPadding - baselineHeight / 2,
        },
      };
    }
    if (style.baselineValueStyle.cellStyle?.underline) {
      structure.baseline.style.lineWidth = style.baselineValueStyle.fontSize / 10;
      structure.baseline.style.underline = {
        from: {
          x: structure.baseline.position.x,
          y: canvas.height - this.chartPadding,
        },
        to: {
          x: structure.baseline.position.x + baselineMeasure.width,
          y: canvas.height - this.chartPadding,
        },
      };
    }
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
    ctx.font = `${style.keyStyle.fontSize}px ${DEFAULT_FONT}`;
    const keyMeasure = ctx.measureText(this.keyValue);
    const keyHeigth = keyMeasure.actualBoundingBoxAscent + keyMeasure.actualBoundingBoxDescent;
    if (this.keyValue) {
      if (style.keyStyle.cellStyle?.bold) {
        ctx.font = "bold " + ctx.font;
      }
      if (style.keyStyle.cellStyle?.italic) {
        ctx.font = "italic " + ctx.font;
      }
      structure.key = {
        text: this.keyValue,
        style: {
          color: style.keyStyle.cellStyle?.textColor || style.keyStyle.color,
          font: ctx.font,
        },
        position: {
          x: (canvas.width - keyMeasure.width) / 2,
          y: (canvas.height - baselineHeight + titleHeight + keyHeigth - this.chartPadding) / 2,
        },
      };
      if (style.keyStyle.cellStyle?.strikethrough) {
        structure.key.style.lineWidth = style.keyStyle.fontSize / 10;
        structure.key.style.strikethrough = {
          from: {
            x: (canvas.width - keyMeasure.width) / 2,
            y: (canvas.height - baselineHeight + titleHeight - this.chartPadding) / 2,
          },
          to: {
            x: (canvas.width - keyMeasure.width) / 2 + keyMeasure.width,
            y: (canvas.height - baselineHeight + titleHeight - this.chartPadding) / 2,
          },
        };
      }
      if (style.keyStyle.cellStyle?.underline) {
        structure.key.style.lineWidth = style.keyStyle.fontSize / 10;
        structure.key.style.underline = {
          from: {
            x: (canvas.width - keyMeasure.width) / 2,
            y:
              (canvas.height - baselineHeight + titleHeight + keyHeigth - this.chartPadding) / 2 +
              style.keyStyle.fontSize / 10,
          },
          to: {
            x: (canvas.width - keyMeasure.width) / 2 + keyMeasure.width,
            y:
              (canvas.height - baselineHeight + titleHeight + keyHeigth - this.chartPadding) / 2 +
              style.keyStyle.fontSize / 10,
          },
        };
      }
    }
    return structure;
  }

  get title() {
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

  get backgroundColor() {
    return this.runtime.background;
  }

  get primaryFontColor() {
    return this.runtime.fontColor;
  }

  get secondaryFontColor() {
    return relativeLuminance(this.backgroundColor) > 0.3 ? "#525252" : "#C8C8C8";
  }

  get figure() {
    return this.props.figure;
  }

  get chartStyle() {
    return cssPropertiesToCss({
      padding: `${this.chartPadding}px`,
      background: this.backgroundColor,
    });
  }

  get chartContentStyle() {
    return cssPropertiesToCss({ height: `${this.getDrawableHeight()}px` });
  }

  get chartPadding() {
    return this.props.figure.width * CHART_PADDING_RATIO;
  }

  getTextStyles() {
    // If the widest text overflows horizontally, scale it down, and apply the same scaling factors to all the other fonts.
    const maxLineWidth = this.props.figure.width * (1 - 2 * CHART_PADDING_RATIO);
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
      titleStyle: {
        fontSize: TITLE_FONT_SIZE,
        color: this.secondaryFontColor,
      },
      keyStyle: {
        fontSize: keyFontSize,
        cellStyle: this.runtime.keyValueStyle,
        color: this.primaryFontColor,
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
    let availableHeight = this.props.figure.height - verticalPadding;
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
    chart: ScorecardChartDrawer
  ) => Pixel;

  /**
   * Get the maximal height of an element of the scorecard.
   *
   * This is computed such as all the height is taken by the elements, even if there is no title or baseline.
   */
  getElementMaxFontSize: (availableHeight: Pixel, chart: ScorecardChartDrawer) => number;
}

class BaselineElement implements ScorecardScalableElement {
  getElementWidth(
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    chart: ScorecardChartDrawer
  ): Pixel {
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

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChartDrawer): number {
    if (!chart.runtime) return 0;
    const haveBaseline = chart.baseline !== "" || chart.baselineDescr;
    const maxHeight = haveBaseline ? BASELINE_BOX_HEIGHT_RATIO * availableHeight : 0;
    return maxHeight / LINE_HEIGHT;
  }
}

class KeyValueElement implements ScorecardScalableElement {
  getElementWidth(
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    chart: ScorecardChartDrawer
  ): Pixel {
    if (!chart.runtime) return 0;
    const str = chart.keyValue || "";
    ctx.font = `${fontSize}px ${DEFAULT_FONT}`;
    return ctx.measureText(str).width;
  }

  getElementMaxFontSize(availableHeight: Pixel, chart: ScorecardChartDrawer): number {
    if (!chart.runtime) return 0;
    const haveBaseline = chart.baseline !== "" || chart.baselineDescr;
    const maxHeight = haveBaseline ? KEY_BOX_HEIGHT_RATIO * availableHeight : availableHeight;
    return maxHeight / LINE_HEIGHT;
  }
}

export function createScorecardChartRuntime(
  chart: ScorecardChart,
  getters: Getters
): ScorecardChartRuntime {
  let keyValue = "";
  let formattedKeyValue = "";
  let keyValueCell: EvaluatedCell | undefined;
  if (chart.keyValue) {
    const keyValuePosition = {
      sheetId: chart.keyValue.sheetId,
      col: chart.keyValue.zone.left,
      row: chart.keyValue.zone.top,
    };
    keyValueCell = getters.getEvaluatedCell(keyValuePosition);
    keyValue = String(keyValueCell.value);
    formattedKeyValue = keyValueCell.formattedValue;
  }
  let baselineCell: EvaluatedCell | undefined;
  const baseline = chart.baseline;
  if (baseline) {
    const baselinePosition = {
      sheetId: chart.baseline.sheetId,
      col: chart.baseline.zone.left,
      row: chart.baseline.zone.top,
    };
    baselineCell = getters.getEvaluatedCell(baselinePosition);
  }
  const background = getters.getBackgroundOfSingleCellChart(chart.background, chart.keyValue);
  return {
    title: _t(chart.title),
    keyValue: formattedKeyValue || keyValue,
    baselineDisplay: getBaselineText(baselineCell, keyValueCell, chart.baselineMode),
    baselineArrow: getBaselineArrowDirection(baselineCell, keyValueCell, chart.baselineMode),
    baselineColor: getBaselineColor(
      baselineCell,
      chart.baselineMode,
      keyValueCell,
      chart.baselineColorUp,
      chart.baselineColorDown
    ),
    baselineDescr: chart.baselineDescr ? _t(chart.baselineDescr) : "",
    fontColor: chartFontColor(background),
    background,
    baselineStyle:
      chart.baselineMode !== "percentage" && baseline
        ? getters.getCellStyle({
            sheetId: baseline.sheetId,
            col: baseline.zone.left,
            row: baseline.zone.top,
          })
        : undefined,
    keyValueStyle: chart.keyValue
      ? getters.getCellStyle({
          sheetId: chart.keyValue.sheetId,
          col: chart.keyValue.zone.left,
          row: chart.keyValue.zone.top,
        })
      : undefined,
  };
}
