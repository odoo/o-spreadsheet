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
import { GaugeChart, ScorecardChart } from "../../helpers/figures/charts";
import { Color, CoreViewCommand, Immutable, RGBA, UID } from "../../types";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

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
export class CustomColorsPlugin extends UIPlugin<CustomColorState> {
  private readonly customColors: Immutable<Record<Color, true>> = {};
  private readonly configCustomColors: Color[];
  private readonly shouldUpdateColors = false;
  static getters = ["getCustomColors"] as const;

  constructor(config: UIPluginConfig) {
    super(config);
    this.configCustomColors = config.customColors;
  }

  handle(cmd: CoreViewCommand) {
    switch (cmd.type) {
      case "UPDATE_CELL":
      case "UPDATE_CHART":
      case "CREATE_CHART":
      case "ADD_CONDITIONAL_FORMAT":
      case "SET_BORDER":
      case "SET_ZONE_BORDERS":
      case "SET_FORMATTING":
        this.history.update("shouldUpdateColors", true);
    }
  }

  finalize() {
    if (this.shouldUpdateColors) {
      this.history.update("shouldUpdateColors", false);
      for (const color of this.getCustomColors()) {
        this.tryToAddColor(color);
      }
    }
  }

  getCustomColors(): Color[] {
    let usedColors: Color[] = this.configCustomColors;
    for (const sheetId of this.getters.getSheetIds()) {
      usedColors = usedColors.concat(
        this.getColorsFromCells(sheetId),
        this.getFormattingColors(sheetId),
        this.getChartColors(sheetId)
      );
    }
    return sortWithClusters([
      ...new Set(
        // remove duplicates first to check validity on a reduced
        // set of colors, then normalize to HEX and remove duplicates
        // again
        [...new Set([...usedColors, ...Object.keys(this.customColors)])]
          .filter(isColorValid)
          .map(toHex)
      ),
    ]).filter((color) => !COLOR_PICKER_DEFAULTS.includes(color));
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

  private getChartColors(sheetId: UID): Color[] {
    const charts = this.getters.getChartIds(sheetId).map((cid) => this.getters.getChart(cid));
    let chartsColors = new Set<Color>();
    for (let chart of charts) {
      if (chart === undefined) {
        continue;
      }
      const background = chart.getDefinition().background;
      if (background !== undefined) {
        chartsColors.add(background);
      }
      switch (chart.type) {
        case "gauge":
          const colors = (chart as GaugeChart).sectionRule.colors;
          chartsColors.add(colors.lowerColor);
          chartsColors.add(colors.middleColor);
          chartsColors.add(colors.upperColor);
          break;
        case "scorecard":
          const scoreChart = chart as ScorecardChart;
          chartsColors.add(scoreChart.baselineColorDown);
          chartsColors.add(scoreChart.baselineColorUp);
          break;
      }
    }
    return [...chartsColors];
  }

  private tryToAddColor(color: Color) {
    const formattedColor = toHex(color);
    if (color && !COLOR_PICKER_DEFAULTS.includes(formattedColor)) {
      this.history.update("customColors", formattedColor, true);
    }
  }
}
