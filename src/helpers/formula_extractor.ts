import {
  ColorScaleThreshold,
  ConditionalFormat,
  ConditionalFormatInternal,
  IconThreshold,
} from "../types/conditional_formatting";
import { DataValidationCriterion } from "../types/data_validation";
import { isFormula } from "./misc";

/** Get all the formulas from a conditional format */
export function getCfFormulas<T extends ConditionalFormat | ConditionalFormatInternal>(
  cf: T
): string[] {
  const formulas: string[] = [];
  mapToCfFormulas(cf, (formula) => {
    formulas.push(formula);
    return formula;
  });
  return formulas;
}

/** Map a callback to the conditional formatting threshold formula and change it in place */
function mapToCfThresholdFormula(
  threshold: ColorScaleThreshold | IconThreshold | undefined,
  callback: (formula: string) => string
) {
  if (threshold?.type !== "formula" || threshold.value === undefined) {
    return;
  }
  threshold.value = callback(threshold.value);
}

/** Map a callback to the conditional formatting formulas and change them in place */
export function mapToCfFormulas<T extends ConditionalFormat | ConditionalFormatInternal>(
  cf: T,
  callback: (formula: string) => string
): T {
  const rule = cf.rule;
  switch (rule.type) {
    case "CellIsRule":
      for (let i = 0; i < rule.values.length; i++) {
        if (isFormula(rule.values[i])) {
          rule.values[i] = callback(rule.values[i]);
        }
      }
      break;
    case "ColorScaleRule":
      mapToCfThresholdFormula(rule.minimum, callback);
      mapToCfThresholdFormula(rule.maximum, callback);
      mapToCfThresholdFormula(rule.midpoint, callback);
      break;
    case "IconSetRule":
      mapToCfThresholdFormula(rule.lowerInflectionPoint, callback);
      mapToCfThresholdFormula(rule.upperInflectionPoint, callback);
      break;
  }
  return cf;
}

export function getDvFormulas<T extends { criterion: DataValidationCriterion }>(rule: T): string[] {
  return rule.criterion.values.filter(isFormula);
}

/** Map a callback to the criterion formulas and change them in place */
export function mapDvFormulas<T extends { criterion: DataValidationCriterion }>(
  rule: T,
  callback: (formula: string) => string
): T {
  for (let i = 0; i < rule.criterion.values.length; i++) {
    if (isFormula(rule.criterion.values[i])) {
      rule.criterion.values[i] = callback(rule.criterion.values[i]);
    }
  }
  return rule;
}
