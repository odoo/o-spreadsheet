import { ICON_SETS } from "../../components/icons/icons";
import {
  ColorScaleMidPointThreshold,
  ColorScaleThreshold,
  ConditionalFormat,
  ConditionalFormattingOperatorValues,
  IconThreshold,
} from "../../types";
import { ExcelIconSet, XLSXConditionalFormat, XLSXDxf } from "../../types/xlsx";
import { WarningTypes, XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { convertColor, hexaToInt } from "./color_conversion";
import {
  CF_THRESHOLD_CONVERSION_MAP,
  CF_TYPE_CONVERSION_MAP,
  ICON_SET_CONVERSION_MAP,
  SUPPORTED_CF_TYPES,
  convertCFCellIsOperator,
} from "./conversion_maps";
import { convertStyle } from "./style_conversion";

export function convertConditionalFormats(
  xlsxCfs: XLSXConditionalFormat[],
  dxfs: XLSXDxf[],
  warningManager: XLSXImportWarningManager
): ConditionalFormat[] {
  const cfs: ConditionalFormat[] = [];
  let cfId = 1;
  for (let cf of xlsxCfs) {
    if (cf.cfRules.length === 0) continue;

    addCfConversionWarnings(cf, dxfs, warningManager);

    const rule = cf.cfRules[0];
    let operator: ConditionalFormattingOperatorValues | undefined;
    const values: string[] = [];

    if (
      rule.dxfId === undefined &&
      !(rule.type === "colorScale" || rule.type === "iconSet" || rule.type === "dataBar")
    )
      continue;
    switch (rule.type) {
      case "aboveAverage":
      case "containsErrors":
      case "notContainsErrors":
      case "duplicateValues":
      case "expression":
      case "top10":
      case "uniqueValues":
      case "timePeriod":
        // Not supported
        continue;
      case "dataBar":
        const dataBar = convertDataBar(cfId++, cf);
        if (dataBar) {
          cfs.push(dataBar);
        }
        continue;
      case "colorScale":
        const colorScale = convertColorScale(cfId++, cf);
        if (colorScale) {
          cfs.push(colorScale);
        }
        continue;
      case "iconSet":
        const iconSet = convertIconSet(cfId++, cf, warningManager);
        if (iconSet) {
          cfs.push(iconSet);
        }
        continue;
      case "containsText":
      case "notContainsText":
      case "beginsWith":
      case "endsWith":
        if (!rule.text) continue;
        operator = CF_TYPE_CONVERSION_MAP[rule.type]!;
        values.push(rule.text);
        break;
      case "containsBlanks":
      case "notContainsBlanks":
        operator = CF_TYPE_CONVERSION_MAP[rule.type]!;
        break;
      case "cellIs":
        if (!rule.operator || !rule.formula || rule.formula.length === 0) continue;
        operator = convertCFCellIsOperator(rule.operator);
        values.push(rule.formula[0]);
        if (rule.formula.length === 2) {
          values.push(rule.formula[1]);
        }
        break;
    }
    if (operator && rule.dxfId !== undefined) {
      cfs.push({
        id: (cfId++).toString(),
        ranges: cf.sqref,
        stopIfTrue: rule.stopIfTrue,
        rule: {
          type: "CellIsRule",
          operator: operator,
          values: values,
          style: convertStyle(
            { fontStyle: dxfs[rule.dxfId].font, fillStyle: dxfs[rule.dxfId].fill },
            warningManager
          ),
        },
      });
    }
  }
  return cfs;
}

function convertDataBar(id: number, xlsxCf: XLSXConditionalFormat): ConditionalFormat | undefined {
  const dataBar = xlsxCf.cfRules[0].dataBar;
  if (!dataBar) return undefined;

  const color = hexaToInt(convertColor(dataBar.color) || "#FFFFFF");

  return {
    id: id.toString(),
    stopIfTrue: xlsxCf.cfRules[0].stopIfTrue,
    ranges: xlsxCf.sqref,
    rule: {
      type: "DataBarRule",
      color,
    },
  };
}

function convertColorScale(
  id: number,
  xlsxCf: XLSXConditionalFormat
): ConditionalFormat | undefined {
  const scale = xlsxCf.cfRules[0].colorScale;
  if (
    !scale ||
    scale.cfvos.length !== scale.colors.length ||
    scale.cfvos.length < 2 ||
    scale.cfvos.length > 3
  ) {
    return undefined;
  }

  const thresholds: ColorScaleThreshold[] = [];
  for (let i = 0; i < scale.cfvos.length; i++) {
    thresholds.push({
      color: hexaToInt(convertColor(scale.colors[i]) || "#FFFFFF"),
      type: CF_THRESHOLD_CONVERSION_MAP[scale.cfvos[i].type],
      value: scale.cfvos[i].value,
    });
  }

  const minimum = thresholds[0];
  const maximum = thresholds.length === 2 ? thresholds[1] : thresholds[2];
  const midpoint =
    thresholds.length === 3 ? (thresholds[1] as ColorScaleMidPointThreshold) : undefined;

  return {
    id: id.toString(),
    stopIfTrue: xlsxCf.cfRules[0].stopIfTrue,
    ranges: xlsxCf.sqref,
    rule: { type: "ColorScaleRule", minimum, midpoint, maximum },
  };
}

/**
 * Convert Icons Sets.
 *
 * In the Xlsx extension of OpenXml, the IconSets can either be simply an IconSet, or a list of Icons
 *  (ie. their respective IconSet and their id in this set).
 *
 * In the case of a list of icons :
 *  - The order of the icons is lower => middle => upper
 *  - The their ids are :  0 : bad, 1 : neutral, 2 : good
 */
function convertIconSet(
  id: number,
  xlsxCf: XLSXConditionalFormat,
  warningManager: XLSXImportWarningManager
): ConditionalFormat | undefined {
  const xlsxIconSet = xlsxCf.cfRules[0].iconSet;
  if (!xlsxIconSet) return undefined;
  let cfVos = xlsxIconSet.cfvos;
  let cfIcons = xlsxIconSet.cfIcons;
  if (cfVos.length < 3 || (cfIcons && cfIcons.length < 3)) {
    return undefined;
  }

  // We don't support icon sets with more than 3 icons, so take the extrema and the middle.
  if (cfVos.length > 3) {
    cfVos = [cfVos[0], cfVos[Math.floor(cfVos.length / 2)], cfVos[cfVos.length - 1]];
  }
  if (cfIcons && cfIcons.length > 3) {
    cfIcons = [cfIcons[0], cfIcons[Math.floor(cfIcons.length / 2)], cfIcons[cfIcons.length - 1]];
  }

  // In xlsx, the thresholds are NOT in the first cfVo, but on the second and third
  const thresholds: IconThreshold[] = [];
  for (let i = 1; i <= 2; i++) {
    const type = CF_THRESHOLD_CONVERSION_MAP[cfVos[i].type];
    if (type === "value") {
      return undefined;
    }
    thresholds.push({
      value: cfVos[i].value || "",
      operator: cfVos[i].gte ? "ge" : "gt",
      type: type,
    });
  }
  let icons = {
    lower: cfIcons
      ? convertIcons(cfIcons[0].iconSet, cfIcons[0].iconId)
      : convertIcons(xlsxIconSet.iconSet, 0),
    middle: cfIcons
      ? convertIcons(cfIcons[1].iconSet, cfIcons[1].iconId)
      : convertIcons(xlsxIconSet.iconSet, 1),
    upper: cfIcons
      ? convertIcons(cfIcons[2].iconSet, cfIcons[2].iconId)
      : convertIcons(xlsxIconSet.iconSet, 2),
  };

  if (xlsxIconSet.reverse) {
    icons = { upper: icons.lower, middle: icons.middle, lower: icons.upper };
  }

  // We don't support empty icons in an IconSet, put a dot icon instead
  for (let key of Object.keys(icons)) {
    if (!icons[key]) {
      warningManager.generateNotSupportedWarning(WarningTypes.CfIconSetEmptyIconNotSupported);
      switch (key) {
        case "upper":
          icons[key] = ICON_SETS.dots.good;
          break;
        case "middle":
          icons[key] = ICON_SETS.dots.neutral;
          break;
        case "lower":
          icons[key] = ICON_SETS.dots.bad;
          break;
      }
    }
  }
  return {
    id: id.toString(),
    stopIfTrue: xlsxCf.cfRules[0].stopIfTrue,
    ranges: xlsxCf.sqref,
    rule: {
      type: "IconSetRule",
      icons: icons,
      upperInflectionPoint: thresholds[1],
      lowerInflectionPoint: thresholds[0],
    },
  };
}

/**
 * Convert an icon from a XLSX.
 *
 * The indexes are : 0 : bad, 1 : neutral, 2 : good
 */
function convertIcons(xlsxIconSet: ExcelIconSet, index: number): string {
  const iconSet = ICON_SET_CONVERSION_MAP[xlsxIconSet];
  if (!iconSet) return "";

  return index === 0
    ? ICON_SETS[iconSet].bad
    : index === 1
    ? ICON_SETS[iconSet].neutral
    : ICON_SETS[iconSet].good;
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function addCfConversionWarnings(
  cf: XLSXConditionalFormat,
  dxfs: XLSXDxf[],
  warningManager: XLSXImportWarningManager
) {
  if (cf.cfRules.length > 1) {
    warningManager.generateNotSupportedWarning(WarningTypes.MultipleRulesCfNotSupported);
  }
  if (!SUPPORTED_CF_TYPES.includes(cf.cfRules[0].type)) {
    warningManager.generateNotSupportedWarning(WarningTypes.CfTypeNotSupported, cf.cfRules[0].type);
  }
  if (cf.cfRules[0].dxfId) {
    const dxf = dxfs[cf.cfRules[0].dxfId];
    if (dxf.border) {
      warningManager.generateNotSupportedWarning(WarningTypes.CfFormatBorderNotSupported);
    }
    if (dxf.alignment) {
      warningManager.generateNotSupportedWarning(WarningTypes.CfFormatAlignmentNotSupported);
    }
    if (dxf.numFmt) {
      warningManager.generateNotSupportedWarning(WarningTypes.CfFormatNumFmtNotSupported);
    }
  }
}
