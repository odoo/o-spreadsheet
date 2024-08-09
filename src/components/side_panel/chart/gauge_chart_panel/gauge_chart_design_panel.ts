import { Component, useState } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/index";
import { GaugeChartDefinition, SectionRule } from "../../../../types/chart/gauge_chart";
import {
  Color,
  CommandResult,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { css } from "../../../helpers/css";
import { ChartTerms } from "../../../translations_terms";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";

css/* scss */ `
  .o-gauge-color-set {
    table {
      table-layout: fixed;
      margin-top: 2%;
      display: table;
      text-align: left;
      font-size: 12px;
      line-height: 18px;
      width: 100%;
      font-size: 12px;
    }

    td {
      box-sizing: border-box;
      height: 30px;
      padding: 6px 0;
    }
    th.o-gauge-color-set-colorPicker {
      width: 8%;
    }
    th.o-gauge-color-set-text {
      width: 40%;
    }
    th.o-gauge-color-set-value {
      width: 22%;
    }
    th.o-gauge-color-set-type {
      width: 30%;
    }
    input,
    select {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
  }
`;

interface PanelState {
  sectionRuleDispatchResult?: DispatchResult;
  sectionRule: SectionRule;
}

interface Props {
  figureId: UID;
  definition: GaugeChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
}

export class GaugeChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartDesignPanel";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
    GeneralDesignEditor,
    ChartErrorSection,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  protected state!: PanelState;

  setup() {
    this.state = useState<PanelState>({
      sectionRuleDispatchResult: undefined,
      sectionRule: deepCopy(this.props.definition.sectionRule),
    });
  }

  get designErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.sectionRuleDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  isRangeMinInvalid() {
    return !!(
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.EmptyGaugeRangeMin) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.GaugeRangeMinNaN) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(
        CommandResult.GaugeRangeMinBiggerThanRangeMax
      )
    );
  }

  isRangeMaxInvalid() {
    return !!(
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.EmptyGaugeRangeMax) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(CommandResult.GaugeRangeMaxNaN) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(
        CommandResult.GaugeRangeMinBiggerThanRangeMax
      )
    );
  }

  // ---------------------------------------------------------------------------
  // COLOR_SECTION_TEMPLATE
  // ---------------------------------------------------------------------------

  get isLowerInflectionPointInvalid() {
    return !!(
      this.state.sectionRuleDispatchResult?.isCancelledBecause(
        CommandResult.GaugeLowerInflectionPointNaN
      ) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(
        CommandResult.GaugeLowerBiggerThanUpper
      )
    );
  }

  get isUpperInflectionPointInvalid() {
    return !!(
      this.state.sectionRuleDispatchResult?.isCancelledBecause(
        CommandResult.GaugeUpperInflectionPointNaN
      ) ||
      this.state.sectionRuleDispatchResult?.isCancelledBecause(
        CommandResult.GaugeLowerBiggerThanUpper
      )
    );
  }

  updateSectionColor(target: string, color: Color) {
    const sectionRule = deepCopy(this.state.sectionRule);
    sectionRule.colors[target] = color;
    this.updateSectionRule(sectionRule);
  }

  updateSectionRule(sectionRule: SectionRule) {
    this.state.sectionRuleDispatchResult = this.props.updateChart(this.props.figureId, {
      sectionRule,
    });
    if (this.state.sectionRuleDispatchResult.isSuccessful) {
      this.state.sectionRule = deepCopy(sectionRule);
    }
  }

  canUpdateSectionRule(sectionRule: SectionRule) {
    this.state.sectionRuleDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      sectionRule,
    });
  }
}
