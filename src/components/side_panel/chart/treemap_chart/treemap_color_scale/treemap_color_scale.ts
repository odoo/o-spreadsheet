import { Component } from "@odoo/owl";
import { DispatchResult, UID } from "../../../../..";
import { SpreadsheetChildEnv } from "../../../../../types";
import {
  TreeMapChartDefaults,
  TreeMapChartDefinition,
} from "../../../../../types/chart/tree_map_chart";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";

interface Props {
  figureId: UID;
  definition: TreeMapChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
}

export class TreeMapColorScale extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapColorScale";
  static components = { RoundColorPicker };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  get coloringOptions() {
    const coloringOptions =
      this.props.definition.coloringOptions ?? TreeMapChartDefaults.coloringOptions;
    if (coloringOptions.type !== "colorScale") {
      throw new Error("Coloring options is not a color scale");
    }
    return coloringOptions;
  }

  getColorScaleColor(point: "minColor" | "midColor" | "maxColor") {
    if (this.coloringOptions.type !== "colorScale") {
      throw new Error("Coloring options is not a color scale");
    }
    return this.coloringOptions[point];
  }

  setColorScaleColor(point: "minColor" | "midColor" | "maxColor", color: string) {
    if (this.coloringOptions.type !== "colorScale") {
      throw new Error("Coloring options is not a color scale");
    }
    this.props.updateChart(this.props.figureId, {
      coloringOptions: { ...this.coloringOptions, [point]: color },
    });
  }
}
