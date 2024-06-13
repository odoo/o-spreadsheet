import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { Color, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";

type ColorPickerId = undefined | "backgroundColor" | "baselineColorUp" | "baselineColorDown";

interface Props {
  figureId: UID;
  definition: ScorecardChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
}

export class ScorecardChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    RoundColorPicker,
    SidePanelCollapsible,
    Section,
    Checkbox,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  get colorsSectionTitle(): string {
    return this.props.definition.baselineMode === "progress"
      ? _t("Progress bar colors")
      : _t("Baseline colors");
  }

  get humanizeNumbersLabel(): string {
    return _t("Humanize numbers");
  }

  updateHumanizeNumbers(humanize: boolean) {
    this.props.updateChart(this.props.figureId, { humanize });
  }

  translate(term) {
    return _t(term);
  }

  updateBaselineDescr(ev) {
    this.props.updateChart(this.props.figureId, { baselineDescr: ev.target.value });
  }

  setColor(color: Color, colorPickerId: ColorPickerId) {
    switch (colorPickerId) {
      case "backgroundColor":
        this.props.updateChart(this.props.figureId, { background: color });
        break;
      case "baselineColorDown":
        this.props.updateChart(this.props.figureId, { baselineColorDown: color });
        break;
      case "baselineColorUp":
        this.props.updateChart(this.props.figureId, { baselineColorUp: color });
        break;
    }
  }
}
