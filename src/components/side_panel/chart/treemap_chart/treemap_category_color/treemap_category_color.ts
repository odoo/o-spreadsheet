import { Component } from "@odoo/owl";
import { ChartConfiguration } from "chart.js";
import { DispatchResult, UID } from "../../../../..";
import { deepCopy, removeIndexesFromArray } from "../../../../../helpers";
import { SpreadsheetChildEnv } from "../../../../../types";
import {
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapChartRuntime,
  TreeMapTree,
} from "../../../../../types/chart/tree_map_chart";
import { getTreeMapGroupColors } from "../../../../figures/chart/chartJs/tree_map_colors_plugin";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";

interface Props {
  figureId: UID;
  definition: TreeMapChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
}

export class TreeMapCategoryColors extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapCategoryColors";
  static components = {
    Checkbox,
    RoundColorPicker,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
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
      this.props.figureId
    ) as TreeMapChartRuntime;
    const config = runtime.chartJsConfig as ChartConfiguration<"treemap">;
    const tree = config.data.datasets[0]?.tree as TreeMapTree;
    if (!tree) {
      return [];
    }
    return getTreeMapGroupColors(this.props.definition, tree);
  }

  setGroupColor(group: string, color: string) {
    const coloringOptions = deepCopy(this.coloringOptions);
    const index = coloringOptions.colors.findIndex((c) => c.group === group);
    if (color === "") {
      coloringOptions.colors = removeIndexesFromArray(coloringOptions.colors, [index]);
    } else if (index === -1) {
      coloringOptions.colors.push({ group, color });
    } else {
      coloringOptions.colors[index].color = color;
    }
    this.props.updateChart(this.props.figureId, { coloringOptions });
  }

  setHighlightForBigValues(highlightBigValues: boolean) {
    if (this.coloringOptions.type !== "categoryColor") {
      throw new Error("Coloring options is not solid color");
    }
    this.props.updateChart(this.props.figureId, {
      coloringOptions: { ...this.coloringOptions, highlightBigValues },
    });
  }
}
