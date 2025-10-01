import {
  TreeMapCategoryColorOptions,
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/tree_map_chart";
import { Component } from "@odoo/owl";
import { ChartConfiguration } from "chart.js";
import { DispatchResult, UID } from "../../../../..";
import { deepCopy } from "../../../../../helpers";
import { SpreadsheetChildEnv } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";

interface Props {
  chartId: UID;
  definition: TreeMapChartDefinition;
  onColorChanged: (colors: TreeMapCategoryColorOptions) => DispatchResult;
}

export class TreeMapCategoryColors extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapCategoryColors";
  static components = {
    Checkbox,
    RoundColorPicker,
  };
  static props = {
    chartId: String,
    definition: Object,
    onColorChanged: Function,
  };

  get coloringOptions() {
    const coloringOptions =
      this.props.definition.coloringOptions ?? TreeMapChartDefaults.coloringOptions;
    if (coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    return coloringOptions;
  }

  getTreeGroupAndColors() {
    const runtime = this.env.model.getters.getChartRuntime(
      this.props.chartId
    ) as TreeMapChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"treemap">;
    return config.data.datasets[0]?.groupColors || [];
  }

  onGroupColorChanged(index: number, color: string) {
    const coloringOptions = deepCopy(this.coloringOptions);
    coloringOptions.colors[index] = color || undefined; // color picker returns empty string for no color
    this.props.onColorChanged(coloringOptions);
  }

  useValueBasedGradient(useValueBasedGradient: boolean) {
    if (this.coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    this.props.onColorChanged({ ...this.coloringOptions, useValueBasedGradient });
  }
}
