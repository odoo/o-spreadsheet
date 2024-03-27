import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import {
  ChartWithAxisDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { ChartTerms } from "../../../translations_terms";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartTitle } from "../building_blocks/title/title";

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition;
  canUpdateChart: (definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
}

export class GenericChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GenericChartDesignPanel";
  static components = { RoundColorPicker, ChartTitle, Section };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  get title() {
    return _t(this.props.definition.title);
  }

  updateBackgroundColor(color: Color) {
    this.props.updateChart(this.props.figureId, {
      background: color,
    });
  }

  updateTitle(title: string) {
    this.props.updateChart(this.props.figureId, { title });
  }

  updateSelect(attr: string, ev) {
    this.props.updateChart(this.props.figureId, {
      [attr]: ev.target.value,
    });
  }

  get backgroundColorTitle() {
    return ChartTerms.BackgroundColor;
  }
}
