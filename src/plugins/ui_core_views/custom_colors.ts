import { COLOR_PICKER_DEFAULTS } from "../../constants";
import {
  colorNumberString,
  colorToRGBA,
  isColorValid,
  isDefined,
  rgba,
  rgbaToHex,
  rgbaToHSLA,
  toHex,
} from "../../helpers";
import { Color, Command, Immutable, RGBA, TableElementStyle, UID } from "../../types";
import { CoreViewPlugin, CoreViewPluginConfig } from "../core_view_plugin";

const chartColorRegex = /"(#[0-9a-fA-F]{6})"/g;

/**
 * https://tomekdev.com/posts/sorting-colors-in-js
 */
function sortWithClusters(colorsToSort: Color[]): Color[] {
  const clusters: { leadColor: RGBA; colors: RGBA[] }[] = [
    { leadColor: rgba(255, 0, 0), colors: [] }, // red
    { leadColor: rgba(255, 128, 0), colors: [] }, // orange
    { leadColor: rgba(128, 128, 0), colors: [] }, // yellow
    { leadColor: rgba(128, 255, 0), colors: [] }, // chartreuse
    { leadColor: rgba(0, 255, 0), colors: [] }, // green
    { leadColor: rgba(0, 255, 128), colors: [] }, // spring green
    { leadColor: rgba(0, 255, 255), colors: [] }, // cyan
    { leadColor: rgba(0, 127, 255), colors: [] }, // azure
    { leadColor: rgba(0, 0, 255), colors: [] }, // blue
    { leadColor: rgba(127, 0, 255), colors: [] }, // violet
    { leadColor: rgba(128, 0, 128), colors: [] }, // magenta
    { leadColor: rgba(255, 0, 128), colors: [] }, // rose
  ];

  for (const color of colorsToSort.map(colorToRGBA)) {
    let currentDistance = 500; //max distance is 441;
    let currentIndex = 0;
    clusters.forEach((cluster, clusterIndex) => {
      const distance = colorDistance(color, cluster.leadColor);
      if (currentDistance > distance) {
        currentDistance = distance;
        currentIndex = clusterIndex;
      }
    });
    clusters[currentIndex].colors.push(color);
  }
  return clusters
    .map((cluster) => cluster.colors.sort((a, b) => rgbaToHSLA(a).s - rgbaToHSLA(b).s))
    .flat()
    .map(rgbaToHex);
}

function colorDistance(color1: RGBA, color2: RGBA): number {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
  );
}

interface CustomColorState {
  // Use an object whose keys are the colors to avoid duplicates, and because history doesn't support sets
  readonly customColors: Immutable<Record<Color, true>>;
  readonly shouldUpdateColors: boolean;
}

/**
 * CustomColors plugin
 * This plugins aims to compute and keep to custom colors used in the
 * current spreadsheet
 */
export class CustomColorsPlugin extends CoreViewPlugin<CustomColorState> {
  private readonly customColors: Immutable<Record<Color, true>> = {};
  private readonly shouldUpdateColors = true;
  static getters = ["getCustomColors"] as const;

  constructor(config: CoreViewPluginConfig) {
    super(config);
    this.tryToAddColors(config.customColors ?? []);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        for (const sheetId of this.getters.getSheetIds()) {
          for (const chartId of this.getters.getChartIds(sheetId)) {
            this.tryToAddColors(this.getChartColors(chartId));
          }
        }
        break;
      case "UPDATE_CHART":
      case "CREATE_CHART":
        this.tryToAddColors(this.getChartColors(cmd.id));
        break;
      case "UPDATE_CELL":
      case "ADD_CONDITIONAL_FORMAT":
      case "SET_BORDER":
      case "SET_ZONE_BORDERS":
      case "SET_FORMATTING":
      case "CREATE_TABLE":
      case "UPDATE_TABLE":
        this.history.update("shouldUpdateColors", true);
        break;
    }
  }

  finalize() {
    if (this.shouldUpdateColors) {
      this.history.update("shouldUpdateColors", false);
      this.tryToAddColors(this.computeCustomColors());
    }
  }

  getCustomColors() {
    return sortWithClusters(Object.keys(this.customColors));
  }

  private computeCustomColors(): Color[] {
    let usedColors: Color[] = [];
    for (const sheetId of this.getters.getSheetIds()) {
      usedColors = usedColors.concat(
        this.getColorsFromCells(sheetId),
        this.getFormattingColors(sheetId),
        this.getTableColors(sheetId)
      );
    }
    return [...new Set([...usedColors])];
  }

  private getColorsFromCells(sheetId: UID): Color[] {
    const cells = Object.values(this.getters.getCells(sheetId));
    const colors: Set<Color> = new Set();
    for (const cell of cells) {
      if (cell.style?.textColor) {
        colors.add(cell.style.textColor);
      }
      if (cell.style?.fillColor) {
        colors.add(cell.style.fillColor);
      }
    }
    for (const color of this.getters.getBordersColors(sheetId)) {
      colors.add(color);
    }
    return [...colors];
  }

  private getFormattingColors(sheetId: UID): Color[] {
    const formats = this.getters.getConditionalFormats(sheetId);
    const formatColors: (Color | undefined)[] = [];
    for (const format of formats) {
      const rule = format.rule;
      if (rule.type === "CellIsRule") {
        formatColors.push(rule.style.textColor);
        formatColors.push(rule.style.fillColor);
      } else if (rule.type === "ColorScaleRule") {
        formatColors.push(colorNumberString(rule.minimum.color));
        formatColors.push(rule.midpoint ? colorNumberString(rule.midpoint.color) : undefined);
        formatColors.push(colorNumberString(rule.maximum.color));
      }
    }
    return formatColors.filter(isDefined);
  }

  private getChartColors(chartId: UID): Color[] {
    const chart = this.getters.getChart(chartId);
    if (chart === undefined) {
      return [];
    }
    const stringifiedChart = JSON.stringify(chart.getDefinition());
    const colors = stringifiedChart.matchAll(chartColorRegex);
    return [...colors].map((color) => color[1]); // color[1] is the first capturing group of the regex
  }

  private getTableColors(sheetId: UID): Color[] {
    const tables = this.getters.getTables(sheetId);
    return tables.flatMap((table) => {
      const config = table.config;
      const style = this.getters.getTableStyle(config.styleId);
      return [
        this.getTableStyleElementColors(style.wholeTable),
        config.numberOfHeaders > 0 ? this.getTableStyleElementColors(style.headerRow) : [],
        config.totalRow ? this.getTableStyleElementColors(style.totalRow) : [],
        config.bandedColumns ? this.getTableStyleElementColors(style.firstColumnStripe) : [],
        config.bandedColumns ? this.getTableStyleElementColors(style.secondColumnStripe) : [],
        config.bandedRows ? this.getTableStyleElementColors(style.firstRowStripe) : [],
        config.bandedRows ? this.getTableStyleElementColors(style.secondRowStripe) : [],
        config.firstColumn ? this.getTableStyleElementColors(style.firstColumn) : [],
        config.lastColumn ? this.getTableStyleElementColors(style.lastColumn) : [],
      ].flat();
    });
  }

  private getTableStyleElementColors(element: TableElementStyle | undefined): Color[] {
    if (!element) {
      return [];
    }
    return [
      element.style?.fillColor,
      element.style?.textColor,
      element.border?.bottom?.color,
      element.border?.top?.color,
      element.border?.left?.color,
      element.border?.right?.color,
      element.border?.horizontal?.color,
      element.border?.vertical?.color,
    ].filter(isDefined);
  }

  private tryToAddColors(colors: Color[]) {
    for (const color of colors) {
      if (!isColorValid(color)) {
        continue;
      }
      const formattedColor = toHex(color);
      if (color && !COLOR_PICKER_DEFAULTS.includes(formattedColor)) {
        this.history.update("customColors", formattedColor, true);
      }
    }
  }
}
