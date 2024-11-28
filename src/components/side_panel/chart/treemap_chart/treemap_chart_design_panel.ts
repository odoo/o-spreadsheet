import { Component } from "@odoo/owl";
import {
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapColorScaleOptions,
  TreeMapSolidColorOptions,
} from "../../../../types/chart/tree_map_chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { TextStyler } from "../building_blocks/text_styler/text_styler";

interface Props {
  figureId: UID;
  definition: TreeMapChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<TreeMapChartDefinition>) => DispatchResult;
}

const DEFAULT_COLOR_SCALE: TreeMapColorScaleOptions = {
  type: "colorScale",
  minColor: "#FFF5EB",
  midColor: "#FD8D3C",
  maxColor: "#7F2704",
};

const DEFAULT_SOLID_COLOR: TreeMapSolidColorOptions = {
  type: "solidColor",
  colors: [],
  hasGradient: true,
};

export class TreeMapChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TreeMapChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    Section,
    SidePanelCollapsible,
    Checkbox,
    TextStyler,
    RoundColorPicker,
    BadgeSelection,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  defaults = TreeMapChartDefaults;

  get showHeaders() {
    return this.props.definition.showHeaders ?? TreeMapChartDefaults.showHeaders;
  }

  get showValues() {
    return this.props.definition.showValues ?? TreeMapChartDefaults.showValues;
  }

  get showLabels() {
    return this.props.definition.showLabels ?? TreeMapChartDefaults.showLabels;
  }

  get coloringOptions() {
    return this.props.definition.coloringOptions ?? TreeMapChartDefaults.coloringOptions;
  }

  changeColoringOption(option: "solidColor" | "colorScale") {
    if (option === "solidColor") {
      this.props.updateChart(this.props.figureId, { coloringOptions: DEFAULT_SOLID_COLOR });
    } else {
      this.props.updateChart(this.props.figureId, { coloringOptions: DEFAULT_COLOR_SCALE });
    }
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

  get currentColorOption() {
    return this.coloringOptions.type;
  }

  get coloringOptionChoices() {
    return [
      { label: "Solid color", value: "solidColor" },
      { label: "Color scale", value: "colorScale" },
    ];
  }
}
