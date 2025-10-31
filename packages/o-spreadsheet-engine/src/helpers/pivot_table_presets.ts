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
    border: { top: { color: colorSet.highlight, style: "thin" } }, // @compatibility: should be double line
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

export const PIVOT_TABLE_PRESETS: Record<string, TableStyle> = {
  None: { category: "light", templateName: "none", primaryColor: "", displayName: "none" },

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
