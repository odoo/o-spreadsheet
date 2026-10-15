import {
  ColorScaleThreshold,
  ConditionalFormat,
  ConditionalFormatInternal,
  IconThreshold,
} from "../types/conditional_formatting";
import { isDefined } from "./misc";

function getCfThresholdFormula(threshold: ColorScaleThreshold | IconThreshold | undefined) {
  return threshold?.type === "formula" ? threshold.value : undefined;
}

export function getCfFormulas<T extends ConditionalFormat | ConditionalFormatInternal>(
  cf: T
): string[] {
  const rule = cf.rule;
  if (rule.type === "CellIsRule") {
    return rule.values.filter((v) => v.startsWith("="));
  } else if (rule.type === "ColorScaleRule") {
    return [
      getCfThresholdFormula(rule.minimum),
      getCfThresholdFormula(rule.maximum),
      getCfThresholdFormula(rule.midpoint),
    ].filter(isDefined);
  } else if (rule.type === "IconSetRule") {
    return [
      getCfThresholdFormula(rule.lowerInflectionPoint),
      getCfThresholdFormula(rule.upperInflectionPoint),
    ].filter(isDefined);
  }
  return [];
}

function mapCfThresholdFormula<Th extends ColorScaleThreshold | IconThreshold | undefined>(
  threshold: Th,
  callback: (formula: string) => string
): Th {
  if (threshold?.type !== "formula" || threshold.value === undefined) {
    return threshold;
  }
  return { ...threshold, value: callback(threshold.value) };
}

export function mapTCfFormulas<T extends ConditionalFormat | ConditionalFormatInternal>(
  cf: T,
  callback: (formula: string) => string
): T {
  const rule = cf.rule;
  switch (rule.type) {
    case "CellIsRule":
      return {
        ...cf,
        rule: {
          ...rule,
          values: rule.values.map((v) => (v.startsWith("=") ? callback(v) : v)),
        },
      };
    case "ColorScaleRule":
      return {
        ...cf,
        rule: {
          ...rule,
          minimum: mapCfThresholdFormula(rule.minimum, callback),
          maximum: mapCfThresholdFormula(rule.maximum, callback),
          midpoint: mapCfThresholdFormula(rule.midpoint, callback),
        },
      };
    case "IconSetRule":
      return {
        ...cf,
        rule: {
          ...rule,
          lowerInflectionPoint: mapCfThresholdFormula(rule.lowerInflectionPoint, callback),
          upperInflectionPoint: mapCfThresholdFormula(rule.upperInflectionPoint, callback),
        },
      };
  }
  return cf;
}
