import { UID } from "@odoo/o-spreadsheet-engine";
import { Component } from "@odoo/owl";
import { DispatchResult } from "../../../../..";
import { SpreadsheetChildEnv } from "../../../../../types";
import {
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapColorScaleOptions,
} from "../../../../../types/chart/tree_map_chart";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";

interface Props {
  chartId: UID;
  definition: TreeMapChartDefinition;
  onColorChanged: (colors: TreeMapColorScaleOptions) => DispatchResult;
}

export class TreeMapColorScale extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapColorScale";
  static components = { RoundColorPicker };
  static props = {
    chartId: String,
    definition: Object,
    onColorChanged: Function,
  };

  get coloringOptions() {
    const coloringOptions =
      this.props.definition.coloringOptions ?? TreeMapChartDefaults.coloringOptions;
    if (coloringOptions.type !== "colorScale") {
      throw new Error("Coloring options is not a color scale");
    }
    return coloringOptions;
  }

  setColorScaleColor(point: "minColor" | "midColor" | "maxColor", color: string) {
    this.props.onColorChanged({ ...this.coloringOptions, [point]: color });
  }
}
