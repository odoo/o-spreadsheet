import { transformZone } from "../../../collaborative/ot/ot_helpers";
import {
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
  Getters,
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
import { ScorecardChartDesign } from "./scorecard_chart_designer";

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

function drawDecoratedText(
  context: CanvasRenderingContext2D,
  text: string,
  position: PixelPosition,
  underline: boolean | undefined = false,
  strikethrough: boolean | undefined = false
) {
  context.fillText(text, position.x, position.y);
  const measure = context.measureText(text);
  const textWidth = measure.width;
  const textHeight = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
  const lineWidth = Number(context.font.match(/([0-9\.]*)px/)?.[1]) / 10;
  if (underline) {
    context.lineWidth = lineWidth;
    context.strokeStyle = context.fillStyle;
    context.beginPath();
    context.moveTo(position.x, position.y + lineWidth);
    context.lineTo(position.x + textWidth, position.y + lineWidth);
    context.stroke();
  }
  if (strikethrough) {
    context.lineWidth = lineWidth;
    context.strokeStyle = context.fillStyle;
    context.beginPath();
    context.moveTo(position.x, position.y - textHeight / 2 + lineWidth);
    context.lineTo(position.x + textWidth, position.y - textHeight / 2 + lineWidth);
    context.stroke();
  }
}

export function drawScoreChart(structure: ScorecardChartDesign, canvas: HTMLCanvasElement) {
  // Set canvas size
  const ctx = canvas.getContext("2d")!;
  canvas.width = structure.canvas.width;
  canvas.height = structure.canvas.height;

  // Draw background
  ctx.fillStyle = structure.canvas.backgroundColor;
  ctx.fillRect(0, 0, structure.canvas.width, structure.canvas.height);

  // Draw  title
  if (structure.title) {
    ctx.font = structure.title.style.font;
    ctx.fillStyle = structure.title.style.color;
    ctx.fillText(structure.title.text, structure.title.position.x, structure.title.position.y);
  }

  // Draw baseline
  if (structure.baseline) {
    ctx.font = structure.baseline.style.font;
    ctx.fillStyle = structure.baseline.style.color;
    drawDecoratedText(
      ctx,
      structure.baseline.text,
      structure.baseline.position,
      structure.baseline.style.underline,
      structure.baseline.style.strikethrough
    );
  }

  // Draw baseline arrow
  if (structure.baselineArrow) {
    ctx.font = structure.baselineArrow.style.font;
    ctx.fillStyle = structure.baselineArrow.style.color;
    ctx.fillText(
      structure.baselineArrow.text,
      structure.baselineArrow.position.x,
      structure.baselineArrow.position.y
    );
  }

  // Draw baseline description
  if (structure.baselineDescr) {
    ctx.font = structure.baselineDescr.style.font;
    ctx.fillStyle = structure.baselineDescr.style.color;
    ctx.fillText(
      structure.baselineDescr.text,
      structure.baselineDescr.position.x,
      structure.baselineDescr.position.y
    );
  }

  // Draw key value
  if (structure.key) {
    ctx.font = structure.key.style.font;
    ctx.fillStyle = structure.key.style.color;
    drawDecoratedText(
      ctx,
      structure.key.text,
      structure.key.position,
      structure.key.style.underline,
      structure.key.style.strikethrough
    );
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
  const locale = getters.getLocale();
  return {
    title: _t(chart.title),
    keyValue: formattedKeyValue || keyValue,
    baselineDisplay: getBaselineText(baselineCell, keyValueCell, chart.baselineMode, locale),
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
