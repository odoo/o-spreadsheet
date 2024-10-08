import { darkenColor, lightenColor } from ".";
import { _t } from "../translation";
import { Color } from "../types";
import { TableConfig, TableStyle, TableStyleTemplateName } from "../types/table";

export const TABLE_STYLE_CATEGORIES = {
  light: _t("Light"),
  medium: _t("Medium"),
  dark: _t("Dark"),
  custom: _t("Custom"),
};

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  hasFilters: false,
  totalRow: false,
  firstColumn: false,
  lastColumn: false,

  numberOfHeaders: 1,

  bandedRows: true,
  bandedColumns: false,

  automaticAutofill: true,

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

export type TableStyleTemplate = (colorSet: ColorSet) => Omit<TableStyle, "displayName">;

function generateTableColorSet(name: string, highlightColor: Color): ColorSet {
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

const lightColoredText: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "lightColoredText",
  primaryColor: colorSet.highlight,
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

const lightWithHeader: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "lightWithHeader",
  primaryColor: colorSet.highlight,
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

const lightAllBorders: TableStyleTemplate = (colorSet) => ({
  category: "light",
  templateName: "lightAllBorders",
  primaryColor: colorSet.highlight,
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

const mediumBandedBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "mediumBandedBorders",
  primaryColor: colorSet.highlight,
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

const mediumWhiteBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "mediumWhiteBorders",
  primaryColor: colorSet.highlight,
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

const mediumMinimalBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "mediumMinimalBorders",
  primaryColor: colorSet.highlight,
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

const mediumAllBorders: TableStyleTemplate = (colorSet) => ({
  category: "medium",
  templateName: "mediumAllBorders",
  primaryColor: colorSet.highlight,
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

const dark: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  templateName: "dark",
  primaryColor: colorSet.highlight,
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

const darkNoBorders: TableStyleTemplate = (colorSet) => ({
  category: "dark",
  templateName: "darkNoBorders",
  primaryColor: colorSet.highlight,
  wholeTable: { style: { fillColor: colorSet.light } },
  totalRow: { border: { top: { color: "#000000", style: "medium" } } }, // @compatibility: should be double line
  headerRow: { style: { fillColor: colorSet.highlight, textColor: "#FFFFFF" } },
  firstRowStripe: { style: { fillColor: colorSet.medium } },
  firstColumnStripe: { style: { fillColor: colorSet.medium } },
});

const darkTemplateInBlack = dark(COLOR_SETS.black);
darkTemplateInBlack.wholeTable!.style!.fillColor = "#737373";

const mediumMinimalBordersInBlack = mediumMinimalBorders(COLOR_SETS.black);
mediumMinimalBordersInBlack.wholeTable!.border = {
  ...mediumMinimalBordersInBlack.wholeTable!.border,
  left: { color: "#000000", style: "thin" },
  right: { color: "#000000", style: "thin" },
  horizontal: { color: "#000000", style: "thin" },
  vertical: { color: "#000000", style: "thin" },
};

function buildPreset(name: string, template: TableStyleTemplate, colorSet: ColorSet): TableStyle {
  return { ...template(colorSet), displayName: `${colorSet.name}, ${name}` };
}

export const TABLE_PRESETS: Record<string, TableStyle> = {
  None: { category: "light", templateName: "none", primaryColor: "", displayName: "none" },

  TableStyleLight1: buildPreset("TableStyleLight1", lightColoredText, COLOR_SETS.black),
  TableStyleLight2: buildPreset("TableStyleLight2", lightColoredText, COLOR_SETS.lightBlue),
  TableStyleLight3: buildPreset("TableStyleLight3", lightColoredText, COLOR_SETS.red),
  TableStyleLight4: buildPreset("TableStyleLight4", lightColoredText, COLOR_SETS.lightGreen),
  TableStyleLight5: buildPreset("TableStyleLight5", lightColoredText, COLOR_SETS.purple),
  TableStyleLight6: buildPreset("TableStyleLight6", lightColoredText, COLOR_SETS.gray),
  TableStyleLight7: buildPreset("TableStyleLight7", lightColoredText, COLOR_SETS.orange),

  TableStyleLight8: buildPreset("TableStyleLight8", lightWithHeader, COLOR_SETS.black),
  TableStyleLight9: buildPreset("TableStyleLight9", lightWithHeader, COLOR_SETS.lightBlue),
  TableStyleLight10: buildPreset("TableStyleLight10", lightWithHeader, COLOR_SETS.red),
  TableStyleLight11: buildPreset("TableStyleLight11", lightWithHeader, COLOR_SETS.lightGreen),
  TableStyleLight12: buildPreset("TableStyleLight12", lightWithHeader, COLOR_SETS.purple),
  TableStyleLight13: buildPreset("TableStyleLight13", lightWithHeader, COLOR_SETS.gray),
  TableStyleLight14: buildPreset("TableStyleLight14", lightWithHeader, COLOR_SETS.orange),

  TableStyleLight15: buildPreset("TableStyleLight15", lightAllBorders, COLOR_SETS.black),
  TableStyleLight16: buildPreset("TableStyleLight16", lightAllBorders, COLOR_SETS.lightBlue),
  TableStyleLight17: buildPreset("TableStyleLight17", lightAllBorders, COLOR_SETS.red),
  TableStyleLight18: buildPreset("TableStyleLight18", lightAllBorders, COLOR_SETS.lightGreen),
  TableStyleLight19: buildPreset("TableStyleLight19", lightAllBorders, COLOR_SETS.purple),
  TableStyleLight20: buildPreset("TableStyleLight20", lightAllBorders, COLOR_SETS.gray),
  TableStyleLight21: buildPreset("TableStyleLight21", lightAllBorders, COLOR_SETS.orange),

  TableStyleMedium1: buildPreset("TableStyleMedium1", mediumBandedBorders, COLOR_SETS.black),
  TableStyleMedium2: buildPreset("TableStyleMedium2", mediumBandedBorders, COLOR_SETS.lightBlue),
  TableStyleMedium3: buildPreset("TableStyleMedium3", mediumBandedBorders, COLOR_SETS.red),
  TableStyleMedium4: buildPreset("TableStyleMedium4", mediumBandedBorders, COLOR_SETS.lightGreen),
  TableStyleMedium5: buildPreset("TableStyleMedium5", mediumBandedBorders, COLOR_SETS.purple),
  TableStyleMedium6: buildPreset("TableStyleMedium6", mediumBandedBorders, COLOR_SETS.gray),
  TableStyleMedium7: buildPreset("TableStyleMedium7", mediumBandedBorders, COLOR_SETS.orange),

  TableStyleMedium8: buildPreset("TableStyleMedium8", mediumWhiteBorders, COLOR_SETS.black),
  TableStyleMedium9: buildPreset("TableStyleMedium9", mediumWhiteBorders, COLOR_SETS.lightBlue),
  TableStyleMedium10: buildPreset("TableStyleMedium10", mediumWhiteBorders, COLOR_SETS.red),
  TableStyleMedium11: buildPreset("TableStyleMedium11", mediumWhiteBorders, COLOR_SETS.lightGreen),
  TableStyleMedium12: buildPreset("TableStyleMedium12", mediumWhiteBorders, COLOR_SETS.purple),
  TableStyleMedium13: buildPreset("TableStyleMedium13", mediumWhiteBorders, COLOR_SETS.gray),
  TableStyleMedium14: buildPreset("TableStyleMedium14", mediumWhiteBorders, COLOR_SETS.orange),

  TableStyleMedium15: { ...mediumMinimalBordersInBlack, displayName: "Black, TableStyleMedium15" },
  TableStyleMedium16: buildPreset("TableStyleMedium16", mediumMinimalBorders, COLOR_SETS.lightBlue),
  TableStyleMedium17: buildPreset("TableStyleMedium17", mediumMinimalBorders, COLOR_SETS.red),
  TableStyleMedium18: buildPreset(
    "TableStyleMedium18",
    mediumMinimalBorders,
    COLOR_SETS.lightGreen
  ),
  TableStyleMedium19: buildPreset("TableStyleMedium19", mediumMinimalBorders, COLOR_SETS.purple),
  TableStyleMedium20: buildPreset("TableStyleMedium20", mediumMinimalBorders, COLOR_SETS.gray),
  TableStyleMedium21: buildPreset("TableStyleMedium21", mediumMinimalBorders, COLOR_SETS.orange),

  TableStyleMedium22: buildPreset("TableStyleMedium22", mediumAllBorders, COLOR_SETS.black),
  TableStyleMedium23: buildPreset("TableStyleMedium23", mediumAllBorders, COLOR_SETS.lightBlue),
  TableStyleMedium24: buildPreset("TableStyleMedium24", mediumAllBorders, COLOR_SETS.red),
  TableStyleMedium25: buildPreset("TableStyleMedium25", mediumAllBorders, COLOR_SETS.lightGreen),
  TableStyleMedium26: buildPreset("TableStyleMedium26", mediumAllBorders, COLOR_SETS.purple),
  TableStyleMedium27: buildPreset("TableStyleMedium27", mediumAllBorders, COLOR_SETS.gray),
  TableStyleMedium28: buildPreset("TableStyleMedium28", mediumAllBorders, COLOR_SETS.orange),

  TableStyleDark1: { ...darkTemplateInBlack, displayName: "Black, TableStyleDark1" },
  TableStyleDark2: buildPreset("TableStyleDark2", dark, COLOR_SETS.lightBlue),
  TableStyleDark3: buildPreset("TableStyleDark3", dark, COLOR_SETS.red),
  TableStyleDark4: buildPreset("TableStyleDark4", dark, COLOR_SETS.lightGreen),
  TableStyleDark5: buildPreset("TableStyleDark5", dark, COLOR_SETS.purple),
  TableStyleDark6: buildPreset("TableStyleDark6", dark, COLOR_SETS.gray),
  TableStyleDark7: buildPreset("TableStyleDark7", dark, COLOR_SETS.orange),

  TableStyleDark8: buildPreset("TableStyleDark8", darkNoBorders, DARK_COLOR_SETS.black),
  TableStyleDark9: buildPreset("TableStyleDark9", darkNoBorders, DARK_COLOR_SETS.redBlue),
  TableStyleDark10: buildPreset("TableStyleDark10", darkNoBorders, DARK_COLOR_SETS.purpleGreen),
  TableStyleDark11: buildPreset("TableStyleDark11", darkNoBorders, DARK_COLOR_SETS.orangeBlue),
};

export const TABLE_STYLES_TEMPLATES: Record<TableStyleTemplateName, TableStyleTemplate> = {
  none: () => ({ category: "none", templateName: "none", primaryColor: "", name: "none" }),
  lightColoredText: lightColoredText,
  lightAllBorders: lightAllBorders,
  mediumAllBorders: mediumAllBorders,
  lightWithHeader: lightWithHeader,
  mediumBandedBorders: mediumBandedBorders,
  mediumMinimalBorders: mediumMinimalBorders,
  darkNoBorders: darkNoBorders,
  mediumWhiteBorders: mediumWhiteBorders,
  dark: dark,
};

export function buildTableStyle(
  name: string,
  templateName: TableStyleTemplateName,
  primaryColor: Color
): TableStyle {
  const colorSet = generateTableColorSet("", primaryColor);
  return {
    ...TABLE_STYLES_TEMPLATES[templateName](colorSet),
    category: "custom",
    displayName: name,
  };
}
