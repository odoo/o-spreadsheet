import { TableStyle } from "../types/table";
import { TABLE_COLOR_SETS, TableColorSet, TableStyleTemplate } from "./table_presets";

// ADRM TODO uncopy ?
function buildPreset(
  name: string,
  template: TableStyleTemplate,
  colorSet: TableColorSet
): TableStyle {
  return { ...template(colorSet), displayName: `${colorSet.name}, ${name}` };
}

const pivotLightWithLightBorders: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "pivotLightWithLightBorders",
  primaryColor: colorSet.highlight,
  wholeTable: { border: { horizontal: { color: colorSet.light, style: "thin" } } },
  headerRow: {
    style: { bold: true },
    border: {
      top: { color: colorSet.highlight, style: "thin" },
      bottom: { color: colorSet.highlight, style: "thin" },
    },
  },
  mainSubHeaderRow: { style: { bold: true } },
  firstSubSubHeaderRow: { style: { bold: true, textColor: colorSet.highlight } }, // ADRM TODO: text color is a bid sad and not flashy. Maybe add more flashy colors to colorsets ? Or change colorsets ? Or whatever ?
  totalRow: {
    border: {
      top: { color: colorSet.highlight, style: "thin" },
      bottom: { color: colorSet.highlight, style: "thin" },
    },
    style: { bold: true },
  },
  firstRowStripe: {
    style: { fillColor: colorSet.light },
    border: {
      bottom: { color: colorSet.medium, style: "thin" },
      top: { color: colorSet.medium, style: "thin" },
      vertical: { color: colorSet.medium, style: "thin" },
    },
  },
  secondColumnStripe: {
    style: { fillColor: colorSet.light },
    border: {
      left: { color: colorSet.medium, style: "thin" },
      right: { color: colorSet.medium, style: "thin" },
      horizontal: { color: colorSet.medium, style: "thin" },
    },
  },
});

const pivotMediumSeries1: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "pivotMediumSerie1",
  primaryColor: colorSet.highlight,
  wholeTable: { border: { horizontal: { color: colorSet.light, style: "thin" } } },
  headerRow: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  measureHeaderRow: { border: { top: { color: colorSet.light, style: "thin" } } },
  mainSubHeaderRow: { style: { fillColor: colorSet.mediumBorder, textColor: "#FFFFFF" } },
  firstSubSubHeaderRow: {
    style: { fillColor: colorSet.light },
    border: { bottom: { color: colorSet.highlight, style: "thin" } },
  },
  totalRow: {
    border: { top: { color: colorSet.highlight, style: "medium" } }, // @compatibility: should be double line
    style: { bold: true },
  },
  firstRowStripe: {
    border: {
      bottom: { color: colorSet.highlight, style: "thin" },
      top: { color: colorSet.highlight, style: "thin" },
    },
  },
  firstColumnStripe: {
    border: {
      left: { color: colorSet.highlight, style: "thin" },
      right: { color: colorSet.highlight, style: "thin" },
    },
  },
});

console.log(TABLE_COLOR_SETS.orange);

export const PIVOT_TABLE_PRESETS: Record<string, TableStyle> = {
  None: { category: "light", templateName: "none", primaryColor: "", displayName: "none" },

  PivotTableStyleLight1: buildPreset(
    "PivotTableStyleLight1",
    pivotLightWithLightBorders,
    TABLE_COLOR_SETS.black
  ),
  PivotTableStyleLight2: buildPreset(
    "PivotTableStyleLight2",
    pivotLightWithLightBorders,
    TABLE_COLOR_SETS.lightBlue
  ),
  PivotTableStyleLight3: buildPreset(
    "PivotTableStyleLight3",
    pivotLightWithLightBorders,
    TABLE_COLOR_SETS.red
  ),
  PivotTableStyleLight4: buildPreset(
    "PivotTableStyleLight4",
    pivotLightWithLightBorders,
    TABLE_COLOR_SETS.lightGreen
  ),
  PivotTableStyleLight5: buildPreset(
    "PivotTableStyleLight5",
    pivotLightWithLightBorders,
    TABLE_COLOR_SETS.purple
  ),
  PivotTableStyleLight6: buildPreset(
    "PivotTableStyleLight6",
    pivotLightWithLightBorders,
    TABLE_COLOR_SETS.gray
  ),
  PivotTableStyleLight7: buildPreset(
    "PivotTableStyleLight7",
    pivotLightWithLightBorders,
    TABLE_COLOR_SETS.orange
  ),

  PivotTableStyleMedium1: buildPreset(
    "PivotTableStyleMedium1",
    pivotMediumSeries1,
    TABLE_COLOR_SETS.black
  ),
  PivotTableStyleMedium2: buildPreset(
    "PivotTableStyleMedium2",
    pivotMediumSeries1,
    TABLE_COLOR_SETS.lightBlue
  ),
  PivotTableStyleMedium3: buildPreset(
    "PivotTableStyleMedium3",
    pivotMediumSeries1,
    TABLE_COLOR_SETS.red
  ),
  PivotTableStyleMedium4: buildPreset(
    "PivotTableStyleMedium4",
    pivotMediumSeries1,
    TABLE_COLOR_SETS.lightGreen
  ),
  PivotTableStyleMedium5: buildPreset(
    "PivotTableStyleMedium5",
    pivotMediumSeries1,
    TABLE_COLOR_SETS.purple
  ),
  PivotTableStyleMedium6: buildPreset(
    "PivotTableStyleMedium6",
    pivotMediumSeries1,
    TABLE_COLOR_SETS.gray
  ),
  PivotTableStyleMedium7: buildPreset(
    "PivotTableStyleMedium7",
    pivotMediumSeries1,
    TABLE_COLOR_SETS.orange
  ),
};
