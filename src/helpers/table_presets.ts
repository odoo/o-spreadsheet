import { darkenColor, lightenColor } from ".";
import { _t } from "../translation";
import { Color } from "../types";
import { TableConfig, TableStyle } from "../types/table";

export const TABLE_STYLE_CATEGORIES = {
  none: _t("None"),
  light: _t("Light"),
  medium: _t("Medium"),
  dark: _t("Dark"),
};

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  hasFilters: true,
  totalRow: false,
  firstColumn: false,
  lastColumn: false,

  numberOfHeaders: 1,

  bandedRows: true,
  bandedColumns: false,
  styleId: "TableStyleMedium2",
};

interface ColorSet {
  name: string;
  coloredText: Color;
  light: Color;
  medium: Color;
  dark: Color;
  mediumBorder: Color;
  highlight: Color;
}

export type TableStyleTemplate = (colorSet: ColorSet) => TableStyle;

export function generateTableColorSet(name: string, highlightColor: Color): ColorSet {
  return {
    coloredText: darkenColor(highlightColor, 0.3),
    light: lightenColor(highlightColor, 0.8),
    medium: lightenColor(highlightColor, 0.6),
    dark: darkenColor(highlightColor, 0.3),
    mediumBorder: lightenColor(highlightColor, 0.45),
    highlight: highlightColor,
    name,
  };
}

const COLOR_SETS = {
  black: {
    name: _t("Black"),
    coloredText: "#000000",
    light: "#D9D9D9",
    medium: "#A6A6A6",
    dark: "#404040",
    mediumBorder: "#000000",
    highlight: "#000000",
  },
  lightBlue: generateTableColorSet(_t("Light blue"), "#346B90"),
  red: generateTableColorSet(_t("Red"), "#C53628"),
  lightGreen: generateTableColorSet(_t("Light green"), "#748747"),
  purple: generateTableColorSet(_t("Purple"), "#6C4E65"),
  gray: {
    name: _t("Gray"),
    coloredText: "#666666",
    light: "#EEEEEE",
    medium: "#DDDDDD",
    dark: "#767676",
    mediumBorder: "#D0D0D0",
    highlight: "#A9A9A9",
  },
  orange: generateTableColorSet(_t("Orange"), "#C37034"),
};

const DARK_COLOR_SETS = {
  black: COLOR_SETS.black,
  orangeBlue: { ...COLOR_SETS.lightBlue, highlight: COLOR_SETS.orange.highlight },
  purpleGreen: { ...COLOR_SETS.lightGreen, highlight: COLOR_SETS.purple.highlight },
  redBlue: { ...COLOR_SETS.lightBlue, highlight: COLOR_SETS.red.highlight },
};

const lightTemplateColoredText: TableStyleTemplate = (colorSet) => ({
  category: "light",
  colorName: colorSet.name,
  wholeTable: {
    style: { textColor: colorSet.coloredText },
    border: {
      top: { color: colorSet.highlight, style: "thin" },
      bottom: { color: colorSet.highlight, style: "thin" },
    },
  },
  headerRow: { border: { bottom: { color: colorSet.highlight, style: "thin" } } },
  totalRow: { border: { top: { color: colorSet.highlight, style: "thin" } } },
  firstRowStripe: { style: { fillColor: colorSet.light } },
});

const lightTemplateWithHeader: TableStyleTemplate = (colorSet) => ({
  category: "light",
  colorName: colorSet.name,
  wholeTable: {
    border: {
      top: { color: colorSet.highlight, style: "thin" },
      bottom: { color: colorSet.highlight, style: "thin" },
      left: { color: colorSet.highlight, style: "thin" },
      right: { color: colorSet.highlight, style: "thin" },
    },
  },
  headerRow: {
    style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" },
    border: { bottom: { color: colorSet.highlight, style: "thin" } },
  },
  totalRow: { border: { top: { color: colorSet.highlight, style: "medium" } } }, // @compatibility: should be double line
  firstRowStripe: { border: { bottom: { color: colorSet.highlight, style: "thin" } } },
  secondRowStripe: { border: { bottom: { color: colorSet.highlight, style: "thin" } } },
});

const lightTemplateAllBorders: TableStyleTemplate = (colorSet) => ({
  category: "light",
  colorName: colorSet.name,
  wholeTable: {
    border: {
      top: { color: colorSet.highlight, style: "thin" },
      bottom: { color: colorSet.highlight, style: "thin" },
      left: { color: colorSet.highlight, style: "thin" },
      right: { color: colorSet.highlight, style: "thin" },
      horizontal: { color: colorSet.highlight, style: "thin" },
      vertical: { color: colorSet.highlight, style: "thin" },
    },
  },
  headerRow: { border: { bottom: { color: colorSet.highlight, style: "medium" } } },
  totalRow: { border: { top: { color: colorSet.highlight, style: "medium" } } }, // @compatibility: should be double line
  firstRowStripe: { style: { fillColor: colorSet.light } },
  firstColumnStripe: { style: { fillColor: colorSet.light } },
});

const mediumTemplateBandedBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  colorName: colorSet.name,
  wholeTable: {
    border: {
      top: { color: colorSet.mediumBorder, style: "thin" },
      bottom: { color: colorSet.mediumBorder, style: "thin" },
      left: { color: colorSet.mediumBorder, style: "thin" },
      right: { color: colorSet.mediumBorder, style: "thin" },
      horizontal: { color: colorSet.mediumBorder, style: "thin" },
    },
  },
  headerRow: {
    style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" },
  },
  totalRow: { border: { top: { color: colorSet.highlight, style: "medium" } } }, // @compatibility: should be double line
  firstRowStripe: { style: { fillColor: colorSet.light } },
  firstColumnStripe: { style: { fillColor: colorSet.light } },
});

const mediumTemplateWhiteBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  colorName: colorSet.name,
  wholeTable: {
    border: {
      horizontal: { color: "#FFFFFF", style: "thin" },
      vertical: { color: "#FFFFFF", style: "thin" },
    },
    style: { fillColor: colorSet.light },
  },
  headerRow: {
    border: { bottom: { color: "#FFFFFF", style: "thick" } },
    style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" },
  },
  totalRow: {
    border: { top: { color: "#FFFFFF", style: "thick" } },
    style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" },
  },
  firstColumn: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  lastColumn: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  firstRowStripe: { style: { fillColor: colorSet.medium } },
  firstColumnStripe: { style: { fillColor: colorSet.medium } },
});

const mediumTemplateMinimalBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  colorName: colorSet.name,
  wholeTable: {
    border: {
      top: { color: "#000000", style: "medium" },
      bottom: { color: "#000000", style: "medium" },
    },
  },
  totalRow: { border: { top: { color: "#000000", style: "medium" } } }, // @compatibility: should be double line
  headerRow: {
    style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" },
    border: { bottom: { color: "#000000", style: "medium" } },
  },
  firstColumn: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  lastColumn: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  firstRowStripe: { style: { fillColor: COLOR_SETS.black.light } },
  firstColumnStripe: { style: { fillColor: COLOR_SETS.black.light } },
});

const mediumTemplateAllBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  colorName: colorSet.name,
  wholeTable: {
    border: {
      top: { color: colorSet.mediumBorder, style: "thin" },
      bottom: { color: colorSet.mediumBorder, style: "thin" },
      left: { color: colorSet.mediumBorder, style: "thin" },
      right: { color: colorSet.mediumBorder, style: "thin" },
      horizontal: { color: colorSet.mediumBorder, style: "thin" },
      vertical: { color: colorSet.mediumBorder, style: "thin" },
    },
    style: { fillColor: colorSet.light },
  },
  totalRow: { border: { top: { color: colorSet.highlight, style: "medium" } } }, // @compatibility: should be double line
  firstRowStripe: { style: { fillColor: colorSet.medium } },
  firstColumnStripe: { style: { fillColor: colorSet.medium } },
});

const darkTemplate: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  colorName: colorSet.name,
  wholeTable: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  totalRow: {
    style: { fillColor: colorSet.dark, textColor: "#FFFFFF" },
    border: { top: { color: "#FFFFFF", style: "thick" } },
  },
  headerRow: {
    style: { fillColor: "#000000" },
    border: { bottom: { color: "#FFFFFF", style: "thick" } },
  },
  firstColumn: {
    style: { fillColor: colorSet.dark },
    border: { right: { color: "#FFFFFF", style: "thick" } },
  },
  lastColumn: {
    style: { fillColor: colorSet.dark },
    border: { left: { color: "#FFFFFF", style: "thick" } },
  },
  firstRowStripe: { style: { fillColor: colorSet.dark } },
  firstColumnStripe: { style: { fillColor: colorSet.dark } },
});

const darkTemplateNoBorders: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  colorName: colorSet.name,
  wholeTable: { style: { fillColor: colorSet.light } },
  totalRow: { border: { top: { color: "#000000", style: "medium" } } }, // @compatibility: should be double line
  headerRow: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  firstRowStripe: { style: { fillColor: colorSet.medium } },
  firstColumnStripe: { style: { fillColor: colorSet.medium } },
});

const darkTemplateInBlack = darkTemplate(COLOR_SETS.black);
darkTemplateInBlack.wholeTable!.style!.fillColor = "#737373";

const mediumMinimalBordersInBlack = mediumTemplateMinimalBorders(COLOR_SETS.black);
mediumMinimalBordersInBlack.wholeTable!.border = {
  ...mediumMinimalBordersInBlack.wholeTable!.border,
  left: { color: "#000000", style: "thin" },
  right: { color: "#000000", style: "thin" },
  horizontal: { color: "#000000", style: "thin" },
  vertical: { color: "#000000", style: "thin" },
};

export const TABLE_PRESETS: Record<string, TableStyle> = {
  None: { category: "none", colorName: "" },

  TableStyleLight1: lightTemplateColoredText(COLOR_SETS.black),
  TableStyleLight2: lightTemplateColoredText(COLOR_SETS.lightBlue),
  TableStyleLight3: lightTemplateColoredText(COLOR_SETS.red),
  TableStyleLight4: lightTemplateColoredText(COLOR_SETS.lightGreen),
  TableStyleLight5: lightTemplateColoredText(COLOR_SETS.purple),
  TableStyleLight6: lightTemplateColoredText(COLOR_SETS.gray),
  TableStyleLight7: lightTemplateColoredText(COLOR_SETS.orange),

  TableStyleLight8: lightTemplateWithHeader(COLOR_SETS.black),
  TableStyleLight9: lightTemplateWithHeader(COLOR_SETS.lightBlue),
  TableStyleLight10: lightTemplateWithHeader(COLOR_SETS.red),
  TableStyleLight11: lightTemplateWithHeader(COLOR_SETS.lightGreen),
  TableStyleLight12: lightTemplateWithHeader(COLOR_SETS.purple),
  TableStyleLight13: lightTemplateWithHeader(COLOR_SETS.gray),
  TableStyleLight14: lightTemplateWithHeader(COLOR_SETS.orange),

  TableStyleLight15: lightTemplateAllBorders(COLOR_SETS.black),
  TableStyleLight16: lightTemplateAllBorders(COLOR_SETS.lightBlue),
  TableStyleLight17: lightTemplateAllBorders(COLOR_SETS.red),
  TableStyleLight18: lightTemplateAllBorders(COLOR_SETS.lightGreen),
  TableStyleLight19: lightTemplateAllBorders(COLOR_SETS.purple),
  TableStyleLight20: lightTemplateAllBorders(COLOR_SETS.gray),
  TableStyleLight21: lightTemplateAllBorders(COLOR_SETS.orange),

  TableStyleMedium1: mediumTemplateBandedBorders(COLOR_SETS.black),
  TableStyleMedium2: mediumTemplateBandedBorders(COLOR_SETS.lightBlue),
  TableStyleMedium3: mediumTemplateBandedBorders(COLOR_SETS.red),
  TableStyleMedium4: mediumTemplateBandedBorders(COLOR_SETS.lightGreen),
  TableStyleMedium5: mediumTemplateBandedBorders(COLOR_SETS.purple),
  TableStyleMedium6: mediumTemplateBandedBorders(COLOR_SETS.gray),
  TableStyleMedium7: mediumTemplateBandedBorders(COLOR_SETS.orange),

  TableStyleMedium8: mediumTemplateWhiteBorders(COLOR_SETS.black),
  TableStyleMedium9: mediumTemplateWhiteBorders(COLOR_SETS.lightBlue),
  TableStyleMedium10: mediumTemplateWhiteBorders(COLOR_SETS.red),
  TableStyleMedium11: mediumTemplateWhiteBorders(COLOR_SETS.lightGreen),
  TableStyleMedium12: mediumTemplateWhiteBorders(COLOR_SETS.purple),
  TableStyleMedium13: mediumTemplateWhiteBorders(COLOR_SETS.gray),
  TableStyleMedium14: mediumTemplateWhiteBorders(COLOR_SETS.orange),

  TableStyleMedium15: mediumMinimalBordersInBlack,
  TableStyleMedium16: mediumTemplateMinimalBorders(COLOR_SETS.lightBlue),
  TableStyleMedium17: mediumTemplateMinimalBorders(COLOR_SETS.red),
  TableStyleMedium18: mediumTemplateMinimalBorders(COLOR_SETS.lightGreen),
  TableStyleMedium19: mediumTemplateMinimalBorders(COLOR_SETS.purple),
  TableStyleMedium20: mediumTemplateMinimalBorders(COLOR_SETS.gray),
  TableStyleMedium21: mediumTemplateMinimalBorders(COLOR_SETS.orange),

  TableStyleMedium22: mediumTemplateAllBorders(COLOR_SETS.black),
  TableStyleMedium23: mediumTemplateAllBorders(COLOR_SETS.lightBlue),
  TableStyleMedium24: mediumTemplateAllBorders(COLOR_SETS.red),
  TableStyleMedium25: mediumTemplateAllBorders(COLOR_SETS.lightGreen),
  TableStyleMedium26: mediumTemplateAllBorders(COLOR_SETS.purple),
  TableStyleMedium27: mediumTemplateAllBorders(COLOR_SETS.gray),
  TableStyleMedium28: mediumTemplateAllBorders(COLOR_SETS.orange),

  TableStyleDark1: darkTemplateInBlack,
  TableStyleDark2: darkTemplate(COLOR_SETS.lightBlue),
  TableStyleDark3: darkTemplate(COLOR_SETS.red),
  TableStyleDark4: darkTemplate(COLOR_SETS.lightGreen),
  TableStyleDark5: darkTemplate(COLOR_SETS.purple),
  TableStyleDark6: darkTemplate(COLOR_SETS.gray),
  TableStyleDark7: darkTemplate(COLOR_SETS.orange),

  TableStyleDark8: darkTemplateNoBorders(DARK_COLOR_SETS.black),
  TableStyleDark9: darkTemplateNoBorders(DARK_COLOR_SETS.redBlue),
  TableStyleDark10: darkTemplateNoBorders(DARK_COLOR_SETS.purpleGreen),
  TableStyleDark11: darkTemplateNoBorders(DARK_COLOR_SETS.orangeBlue),
};

export const TABLE_STYLES_TEMPLATES: TableStyleTemplate[] = [
  lightTemplateColoredText,
  lightTemplateAllBorders,
  mediumTemplateAllBorders,
  lightTemplateWithHeader,
  mediumTemplateBandedBorders,
  mediumTemplateMinimalBorders,
  darkTemplateNoBorders,
  mediumTemplateWhiteBorders,
  darkTemplate,
];
