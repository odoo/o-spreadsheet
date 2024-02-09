import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { Color, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { ChartTerms } from "../../../translations_terms";
import { Checkbox } from "../../components/checkbox/checkbox";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartTitle } from "../building_blocks/title/title";

type ColorPickerId = undefined | "backgroundColor" | "baselineColorUp" | "baselineColorDown";

interface Props {
  figureId: UID;
  definition: ScorecardChartDefinition;
  canUpdateChart: (figureId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ScorecardChartDefinition>) => DispatchResult;
}

export class ScorecardChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChartDesignPanel";
  static components = { RoundColorPicker, ChartTitle, Section, Checkbox };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  get title(): string {
    return _t(this.props.definition.title);
  }

  get humanizeNumbersLabel(): string {
    return _t("Humanize numbers");
  }

  updateTitle(title: string) {
    this.props.updateChart(this.props.figureId, { title });
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

  get backgroundColorTitle() {
    return ChartTerms.BackgroundColor;
  }
}
