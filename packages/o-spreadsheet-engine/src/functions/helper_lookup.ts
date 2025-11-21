import { Token } from "../formulas/tokenizer";
import { getCanonicalSymbolName } from "../helpers";
import { isZoneInside, positionToZone, zoneToXc } from "../helpers/zones";
import { _t } from "../translation";
import { CoreGetters } from "../types/core_getters";
import { CircularDependencyError, EvaluationError, InvalidReferenceError } from "../types/errors";
import { EvalContext } from "../types/functions";
import { Getters } from "../types/getters";
import { FunctionResultObject, Maybe, UID } from "../types/misc";
import { PivotCoreDefinition, PivotCoreMeasure } from "../types/pivot";
import { Range } from "../types/range";

/**
 * Get the pivot ID from the formula pivot ID.
 */
export function getPivotId(pivotFormulaId: string, getters: CoreGetters) {
  const pivotId = getters.getPivotId(pivotFormulaId);
  if (!pivotId) {
    throw new EvaluationError(_t('There is no pivot with id "%s"', pivotFormulaId));
  }
  return pivotId;
}

export function assertMeasureExist(pivotId: UID, measure: string, getters: CoreGetters) {
  const { measures } = getters.getPivotCoreDefinition(pivotId);
  if (!measures.find((m) => m.id === measure)) {
    const validMeasures = `(${measures.map((m) => m.id).join(", ")})`;
    throw new EvaluationError(
      _t(
        "The argument %s is not a valid measure. Here are the measures: %s",
        measure,
        validMeasures
      )
    );
  }
}

export function assertDomainLength(domain: Maybe<FunctionResultObject>[]) {
  if (domain.length % 2 !== 0) {
    throw new EvaluationError(_t("Function PIVOT takes an even number of arguments."));
  }
}

export function addPivotDependencies(
  evalContext: EvalContext,
  coreDefinition: PivotCoreDefinition,
  forMeasures: PivotCoreMeasure[]
) {
  //TODO This function can be very costly when used with PIVOT.VALUE and PIVOT.HEADER
  const dependencies: Range[] = [];

  if (coreDefinition.type === "SPREADSHEET" && coreDefinition.dataSet) {
    const { sheetId, zone } = coreDefinition.dataSet;
    const xc = zoneToXc(zone);
    const range = evalContext.getters.getRangeFromSheetXC(sheetId, xc);
    if (range === undefined || range.invalidXc || range.invalidSheetName) {
      throw new InvalidReferenceError();
    }
    if (
      evalContext.__originCellPosition &&
      range.sheetId === evalContext.__originSheetId &&
      isZoneInside(positionToZone(evalContext.__originCellPosition), zone)
    ) {
      throw new CircularDependencyError();
    }
    dependencies.push(range);
  }

  for (const measure of forMeasures) {
    if (measure.computedBy) {
      // const formula = evalContext.getters.getMeasureCompiledFormula(measure);
      // @ts-ignore
      const a = getPivotMeasureDependencies(evalContext.getters, coreDefinition, measure);
      dependencies.push(...truc(evalContext.getters, coreDefinition, measure));
      // dependencies.push(...formula.dependencies.filter((range) => !range.invalidXc));
    }
  }
  const originPosition = evalContext.__originCellPosition;
  if (originPosition && dependencies.length) {
    // The following line is used to reset the dependencies of the cell, to avoid
    // keeping dependencies from previous evaluation of the PIVOT formula (i.e.
    // in case the reference has been changed).
    evalContext.updateDependencies?.(originPosition);
    evalContext.addDependencies?.(originPosition, dependencies);
  }
}

function truc(
  getters: Getters,
  definition: PivotCoreDefinition,
  measure: PivotCoreMeasure,
  exploredMeasures: Set<string> = new Set()
): Range[] {
  const rangeList: Range[] = [];
  const formula = getters.getMeasureCompiledFormula(measure);
  for (const token of formula.tokens) {
    if (token.type !== "SYMBOL") {
      continue;
    }
    const existingMeasure = definition.measures.find(
      (measureCandidate) =>
        getCanonicalSymbolName(measureCandidate.id) === token.value &&
        measure.id !== measureCandidate.id
    );

    if (!existingMeasure || exploredMeasures.has(existingMeasure.id) || !existingMeasure.computedBy)
      continue;

    rangeList.push(...truc(getters, definition, existingMeasure, exploredMeasures));
  }
  // rangeList.push(...getRangesFromTokens(definition, formula.tokens, getters));
  rangeList.push(...formula.dependencies.filter((range) => !range.invalidXc));
  exploredMeasures.add(measure.id);
  return rangeList;
}

function getPivotMeasureDependencies(
  getters: Getters,
  definition: PivotCoreDefinition,
  measure: PivotCoreMeasure
): Range[] {
  const formula = getters.getMeasureCompiledFormula(measure);
  const res = getRangesFromTokens(definition, formula.tokens, getters);
  res.push(...formula.dependencies.filter((range) => !range.invalidXc));
  return res;
  const rangeList: Range[] = [];
  // get formula indirect dependencies

  rangeList.push(...getRangesFromTokens(definition, formula.tokens, getters));

  // const { columns, rows } = definition;

  rangeList.concat(formula.dependencies.filter((range) => !range.invalidXc));
  return rangeList;
}

function getRangesFromTokens(
  definition: PivotCoreDefinition,
  formulaTokens: Token[],
  getters: Getters
): Range[] {
  const rangeList: Range[] = [];
  for (const token of formulaTokens) {
    if (token.type !== "SYMBOL") {
      continue;
    }
    const existingMeasure = definition.measures.find(
      (measure) => measure.id === token.value.slice(1, -1)
    );
    if (existingMeasure && existingMeasure.computedBy) {
      const formula = getters.getMeasureCompiledFormula(existingMeasure);
      rangeList.push(...getRangesFromTokens(definition, formula.tokens, getters));
      rangeList.push(...formula.dependencies.filter((range) => !range.invalidXc));
    }
  }
  return rangeList;
}
