import { Component, useExternalListener, useState } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/index";
import { _t } from "../../../../translation";
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
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { ColorPickerWidget } from "./../../../color_picker/color_picker_widget";

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

type GaugeMenu =
  | "backgroundColor"
  | "sectionColor-lowerColor"
  | "sectionColor-middleColor"
  | "sectionColor-upperColor";

interface Props {
  figureId: UID;
  definition: GaugeChartDefinition;
  canUpdateChart: (figureId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<GaugeChartDefinition>) => DispatchResult;
}

interface PanelState {
  title: string;
  openedMenu?: GaugeMenu;
  sectionRuleDispatchResult?: DispatchResult;
  sectionRule: SectionRule;
}

export class GaugeChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartDesignPanel";
  static components = { ColorPickerWidget, ValidationMessages };

  private state: PanelState = useState({
    title: "",
    openedMenu: undefined,
    sectionRuleDispatchResult: undefined,
    sectionRule: deepCopy(this.props.definition.sectionRule),
  });

  setup() {
    this.state.title = _t(this.props.definition.title);
    useExternalListener(window, "click", this.closeMenus);
  }

  get designErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.sectionRuleDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  updateBackgroundColor(color: Color) {
    this.state.openedMenu = undefined;
    this.props.updateChart(this.props.figureId, {
      background: color,
    });
  }

  updateTitle() {
    this.props.updateChart(this.props.figureId, {
      title: this.state.title,
    });
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
    this.closeMenus();
  }

  toggleMenu(menu: GaugeMenu) {
    const isSelected: boolean = this.state.openedMenu === menu;
    this.closeMenus();
    if (!isSelected) {
      this.state.openedMenu = menu;
    }
  }

  updateSectionRule(sectionRule: SectionRule) {
    this.state.sectionRuleDispatchResult = this.props.updateChart(this.props.figureId, {
      sectionRule,
    });
  }

  canUpdateSectionRule(sectionRule: SectionRule) {
    this.state.sectionRuleDispatchResult = this.props.canUpdateChart(this.props.figureId, {
      sectionRule,
    });
  }

  private closeMenus() {
    this.state.openedMenu = undefined;
  }
}

GaugeChartDesignPanel.props = {
  figureId: String,
  definition: Object,
  updateChart: Function,
  canUpdateChart: Function,
};
