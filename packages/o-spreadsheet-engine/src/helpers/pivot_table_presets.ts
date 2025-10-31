import { PivotTableStyle } from "../types/pivot";
import { TABLE_COLOR_SETS, TableColorSet } from "./table_presets";

export type PivotTableStyleTemplate = (
  colorSet: TableColorSet
) => Omit<PivotTableStyle, "displayName">; // ADRM TODO:what was template name used for actually ?

// ADRM TODO uncopy ?
function buildPreset(
  name: string,
  template: PivotTableStyleTemplate,
  colorSet: TableColorSet
): PivotTableStyle {
  return { ...template(colorSet), displayName: `${colorSet.name}, ${name}` };
}

const pivotMediumSeries1: PivotTableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "pivotMediumSerie1",
  primaryColor: colorSet.highlight,
  wholeTable: {
    border: { horizontal: { color: colorSet.light, style: "thin" } },
  },
  headerRow: {
    style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" },
  },
  mainSubHeaderRow: {
    style: { fillColor: colorSet.mediumBorder, textColor: "#FFFFFF" },
  },
  firstSubSubHeaderRow: {
    style: { fillColor: colorSet.light },
  },
  totalRow: { border: { top: { color: colorSet.highlight, style: "thin" } } },
  firstRowStripe: { style: { fillColor: colorSet.light } },
  firstColumnStripe: { style: { fillColor: colorSet.light } },
});

export const PIVOT_TABLE_PRESETS: Record<string, PivotTableStyle> = {
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
