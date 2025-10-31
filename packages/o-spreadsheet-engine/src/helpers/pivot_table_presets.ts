import { TableStyle } from "../types/table";
import { darkenColor } from "./color";
import { TABLE_COLOR_SETS, TABLE_PRESETS, TableStyleTemplate } from "./table_presets";

const pivotLightWithLightBorders: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "pivotLightWithLightBorders",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true },
    border: { horizontal: { color: colorSet.light, style: "thin" } },
  },
  headerRow: {
    style: { bold: true },
    border: {
      top: { color: colorSet.highlight, style: "thin" },
      bottom: { color: colorSet.highlight, style: "thin" },
    },
  },
  mainSubHeaderRow: { style: { bold: true } },
  firstSubSubHeaderRow: { style: { bold: true, textColor: colorSet.highlight } },
  totalRow: {
    border: {
      top: { color: colorSet.highlight, style: "thin" },
      bottom: { color: colorSet.highlight, style: "thin" },
    },
    style: { bold: true, fillColor: "#FFFFFF" },
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

const pivotLightWithMediumBorders: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "pivotLightWithMediumBorders",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { textColor: colorSet.coloredText, skipCellGridLines: true },
    border: { horizontal: { color: colorSet.light, style: "thin" } },
  },
  firstColumn: { border: { right: { color: colorSet.highlight, style: "thin" } } },
  headerRow: {
    style: { bold: true, textColor: "#000000" },
    border: {
      top: { color: colorSet.highlight, style: "medium" },
      bottom: { color: colorSet.highlight, style: "medium" },
      left: { color: colorSet.highlight, style: "medium" },
      right: { color: colorSet.highlight, style: "medium" },
    },
  },
  measureHeaderRow: { border: { top: { color: colorSet.light, style: "thin" } } },
  mainSubHeaderRow: {
    style: { bold: true, textColor: "#000000", fillColor: colorSet.light },
  },
  firstSubSubHeaderRow: { style: { bold: true, textColor: "#000000" } },
  totalRow: {
    border: {
      top: { color: colorSet.highlight, style: "medium" },
      bottom: { color: colorSet.highlight, style: "medium" },
      left: { color: colorSet.highlight, style: "medium" },
      right: { color: colorSet.highlight, style: "medium" },
    },
    style: { bold: true, textColor: "#000000" },
  },
  firstRowStripe: {
    border: {
      bottom: { color: colorSet.highlight, style: "thin" },
      top: { color: colorSet.highlight, style: "thin" },
    },
  },
  secondRowStripe: {
    border: { bottom: { color: colorSet.highlight, style: "thin" } },
  },
  firstColumnStripe: {
    border: {
      left: { color: colorSet.highlight, style: "thin" },
      right: { color: colorSet.highlight, style: "thin" },
    },
  },
  secondColumnStripe: {
    border: {
      left: { color: colorSet.highlight, style: "thin" },
      right: { color: colorSet.highlight, style: "thin" },
    },
  },
});

const pivotLightWithGrayBands: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "PivotLightWithGrayBands",
  primaryColor: colorSet.highlight,
  wholeTable: { style: { skipCellGridLines: true } },
  headerRow: {
    style: { bold: true, fillColor: colorSet.light },
    border: {
      horizontal: { color: colorSet.light, style: "thin" },
      vertical: { color: colorSet.light, style: "thin" },
      bottom: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
  measureHeaderRow: { border: { top: { color: "#FFFFFF", style: "thin" } } },
  mainSubHeaderRow: {
    style: { bold: true },
    border: { bottom: { color: colorSet.mediumBorder, style: "thin" } },
  },
  firstSubSubHeaderRow: { style: { bold: true } },
  totalRow: {
    border: { top: { color: colorSet.mediumBorder, style: "medium" } },
    style: { bold: true, fillColor: colorSet.light },
  },
  firstRowStripe: { style: { fillColor: TABLE_COLOR_SETS.black.light } },
  secondColumnStripe: {
    style: { fillColor: TABLE_COLOR_SETS.black.light },
    border: {
      left: { color: TABLE_COLOR_SETS.black.medium, style: "thin" },
      right: { color: TABLE_COLOR_SETS.black.medium, style: "thin" },
    },
  },
});

const pivotLightWithColoredText: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "pivotLightWithColoredText",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true, textColor: colorSet.coloredText },
    border: {
      vertical: { color: colorSet.mediumBorder, style: "thin" },
      top: { color: colorSet.mediumBorder, style: "thin" },
      bottom: { color: colorSet.mediumBorder, style: "thin" },
      left: { color: colorSet.mediumBorder, style: "thin" },
      right: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
  headerRow: {
    border: {
      bottom: { color: colorSet.mediumBorder, style: "thin" },
      vertical: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
  totalRow: {
    border: { top: { color: colorSet.mediumBorder, style: "thin" } },
  },
  firstRowStripe: {
    style: { fillColor: colorSet.light },
    border: {
      top: { color: TABLE_COLOR_SETS.black.medium, style: "thin" },
      bottom: { color: TABLE_COLOR_SETS.black.medium, style: "thin" },
    },
  },
  secondColumnStripe: { style: { fillColor: colorSet.light } },
});

const pivotMediumHeavyColors: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "pivotMediumHeavyColors",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true },
    border: { horizontal: { color: colorSet.light, style: "thin" } },
  },
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

const pivotMediumLightColors: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "pivotMediumLightColors",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true },
    border: {
      top: { color: colorSet.dark, style: "medium" },
      bottom: { color: colorSet.dark, style: "medium" },
    },
  },
  headerRow: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF", bold: true } },
  measureHeaderRow: { border: { top: { color: colorSet.mediumBorder, style: "thin" } } },
  mainSubHeaderRow: { style: { fillColor: colorSet.light, bold: true } },
  firstSubSubHeaderRow: { style: { bold: true } },
  totalRow: {
    border: { top: { color: colorSet.dark, style: "thin" } },
    style: { bold: true },
  },
  firstRowStripe: {
    border: {
      bottom: { color: colorSet.mediumBorder, style: "thin" },
      top: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
  firstColumnStripe: {
    border: {
      left: { color: colorSet.mediumBorder, style: "thin" },
      right: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
});

const pivotMediumBlackHeaders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "pivotMediumBlackHeaders",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true, fillColor: colorSet.light },
    border: { vertical: { color: colorSet.mediumBorder, style: "thin" } },
  },
  headerRow: { style: { fillColor: "#000000", textColor: "#FFFFFF" } },
  measureHeaderRow: { border: { top: { color: "#FFFFFF", style: "thin" } } },
  mainSubHeaderRow: { style: { bold: true } },
  firstSubSubHeaderRow: { style: { bold: true, textColor: "#808080" } },
  secondSubSubHeaderRow: { style: { bold: true } },
  totalRow: {
    style: { fillColor: "#000000", textColor: "#FFFFFF" },
    border: { vertical: null },
  },
  firstRowStripe: {
    border: {
      bottom: { color: colorSet.mediumBorder, style: "thin" },
      top: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
});

const pivotMediumColoredTexts: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "pivotMediumBlackHeaders",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true, fillColor: colorSet.light, textColor: colorSet.coloredText },
    border: { vertical: { color: "#FFFFFF", style: "thin" } },
  },
  headerRow: {
    style: { bold: true },
    border: {
      vertical: { color: "#FFFFFF", style: "thin" },
      bottom: { color: "#FFFFFF", style: "thin" },
    },
  },
  firstColumn: { style: { fillColor: colorSet.medium } },
  measureHeaderRow: { border: { top: { color: "#FFFFFF", style: "thin" } } },
  mainSubHeaderRow: { style: { bold: true, textColor: "#000000" } },
  firstSubSubHeaderRow: { style: { bold: true } },
  secondSubSubHeaderRow: { style: { bold: true } },
  totalRow: { style: { bold: true } },
  firstRowStripe: { style: { fillColor: colorSet.medium } },
  firstColumnStripe: { style: { fillColor: colorSet.medium } },
});

const pivotDarkWithDarkHeader: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  templateName: "pivotDarkWithDarkHeader",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true, fillColor: colorSet.medium },
    border: { horizontal: { color: colorSet.light, style: "thin" } },
  },
  headerRow: { style: { bold: true, fillColor: colorSet.dark, textColor: "#FFFFFF" } },
  measureHeaderRow: { border: { top: { color: colorSet.light, style: "thin" } } },
  mainSubHeaderRow: { style: { bold: true, fillColor: colorSet.light } },
  firstSubSubHeaderRow: { style: { bold: true } },
  totalRow: { style: { bold: true, fillColor: colorSet.dark, textColor: "#FFFFFF" } },
  secondRowStripe: { style: { fillColor: colorSet.mediumBorder } },
  firstColumnStripe: {
    border: {
      left: { color: colorSet.light, style: "thin" },
      right: { color: colorSet.light, style: "thin" },
    },
  },
});

const pivotDarkWithGrayHeader: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  templateName: "pivotDarkWithGrayHeader",
  primaryColor: colorSet.highlight,
  wholeTable: { style: { skipCellGridLines: true, fillColor: colorSet.light } },
  headerRow: {
    style: { bold: true, fillColor: TABLE_COLOR_SETS.black.dark, textColor: "#FFFFFF" },
  },
  measureHeaderRow: { border: { top: { color: colorSet.light, style: "medium" } } },
  mainSubHeaderRow: { style: { bold: true, fillColor: colorSet.medium } },
  firstSubSubHeaderRow: { style: { bold: true } },
  totalRow: { style: { bold: true, fillColor: TABLE_COLOR_SETS.black.dark, textColor: "#FFFFFF" } },
  firstRowStripe: {
    border: {
      bottom: { color: colorSet.medium, style: "thin" },
      top: { color: colorSet.medium, style: "thin" },
    },
  },
  firstColumnStripe: {
    border: {
      left: { color: colorSet.mediumBorder, style: "thin" },
      right: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
});

const pivotDarkWithBlackHeader: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  templateName: "pivotDarkWithBlackHeader",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true, fillColor: colorSet.highlight, textColor: "#FFFFFF" },
  },
  headerRow: { style: { bold: true, fillColor: "#000000" } },
  measureHeaderRow: { border: { top: { color: colorSet.light, style: "thin" } } },
  mainSubHeaderRow: { style: { bold: true, fillColor: colorSet.dark } },
  firstSubSubHeaderRow: { style: { bold: true } },
  totalRow: { style: { bold: true, fillColor: "#000000" } },
  firstRowStripe: {
    border: {
      bottom: { color: colorSet.mediumBorder, style: "thin" },
      top: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
  firstColumnStripe: {
    border: {
      left: { color: colorSet.mediumBorder, style: "thin" },
      right: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
});

const pivotDarkWithFirstColumn: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  templateName: "pivotDarkWithFirstColumn",
  primaryColor: colorSet.highlight,
  wholeTable: {
    style: { skipCellGridLines: true, fillColor: colorSet.highlight, textColor: "#FFFFFF" },
    border: { vertical: { color: "#FFFFFF", style: "thin" } },
  },
  headerRow: {
    style: { fillColor: colorSet.dark },
    border: { bottom: { color: "#FFFFFF", style: "medium" } },
  },
  firstColumn: { style: { fillColor: colorSet.dark } },
  measureHeaderRow: { border: { top: { color: colorSet.light, style: "thin" } } },
  mainSubHeaderRow: { style: { bold: true } },
  firstSubSubHeaderRow: { style: { bold: true } },
  totalRow: {
    style: { bold: true, fillColor: colorSet.dark },
    border: { top: { color: "#FFFFFF", style: "medium" } },
  },
  secondRowStripe: { style: { fillColor: colorSet.mediumBorder } },
  firstColumnStripe: { style: { fillColor: colorSet.mediumBorder } },
});

export const PIVOT_TABLE_PRESETS: Record<string, TableStyle> = {
  None: { category: "light", templateName: "none", primaryColor: "", displayName: "none" },
};

const colorSets = [
  TABLE_COLOR_SETS.black,
  TABLE_COLOR_SETS.lightBlue,
  TABLE_COLOR_SETS.red,
  TABLE_COLOR_SETS.lightGreen,
  TABLE_COLOR_SETS.purple,
  TABLE_COLOR_SETS.gray,
  TABLE_COLOR_SETS.orange,
];

function addTemplatesToPresets(baseName: string, templates: TableStyleTemplate[]) {
  let index = 1;
  for (const template of templates) {
    for (const colorSet of colorSets) {
      const name = baseName + index++;
      const preset = { ...template(colorSet), displayName: `${colorSet.name}, ${name}` };
      PIVOT_TABLE_PRESETS[name] = preset;
    }
  }
}

addTemplatesToPresets("PivotTableStyleLight", [
  pivotLightWithLightBorders,
  pivotLightWithMediumBorders,
  pivotLightWithGrayBands,
  pivotLightWithColoredText,
]);

addTemplatesToPresets("PivotTableStyleMedium", [
  pivotMediumHeavyColors,
  pivotMediumLightColors,
  pivotMediumBlackHeaders,
  pivotMediumColoredTexts,
]);

addTemplatesToPresets("PivotTableStyleDark", [
  pivotDarkWithDarkHeader,
  pivotDarkWithGrayHeader,
  pivotDarkWithBlackHeader,
  pivotDarkWithFirstColumn,
]);

// Tweak some presets with the black color set
PIVOT_TABLE_PRESETS["PivotTableStyleDark1"] = {
  ...PIVOT_TABLE_PRESETS["PivotTableStyleDark1"],
  ...pivotDarkWithDarkHeader({
    ...TABLE_COLOR_SETS.black,
    mediumBorder: darkenColor(TABLE_COLOR_SETS.black.medium, 0.1),
  }),
};

PIVOT_TABLE_PRESETS["PivotTableStyleDark15"] = {
  ...PIVOT_TABLE_PRESETS["PivotTableStyleDark15"],
  ...pivotDarkWithBlackHeader({
    ...TABLE_COLOR_SETS.black,
    highlight: TABLE_COLOR_SETS.gray.dark,
    mediumBorder: TABLE_COLOR_SETS.black.medium,
  }),
};

PIVOT_TABLE_PRESETS["PivotTableStyleDark22"] = {
  ...PIVOT_TABLE_PRESETS["PivotTableStyleDark22"],
  ...pivotDarkWithFirstColumn({
    ...TABLE_COLOR_SETS.black,
    highlight: TABLE_COLOR_SETS.gray.dark,
    mediumBorder: TABLE_COLOR_SETS.black.medium,
  }),
};

export function pivotTableStyleIdToTableStyleId(pivotStyleId: string): string {
  const template = PIVOT_TABLE_PRESETS[pivotStyleId];
  if (!template) {
    return "None";
  }
  return (
    Object.keys(TABLE_PRESETS).find((tableStyleId) => {
      const tablePreset = TABLE_PRESETS[tableStyleId];
      return (
        tablePreset.category === template.category &&
        tablePreset.primaryColor === template.primaryColor
      );
    }) || "None"
  );
}
