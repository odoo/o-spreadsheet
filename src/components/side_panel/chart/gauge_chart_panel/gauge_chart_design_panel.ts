import { Component, useState } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/index";
import { GaugeChartDefinition, SectionRule } from "../../../../types/chart/gauge_chart";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { ColorPicker } from "../../../color_picker/color_picker";
import { css } from "../../../helpers/css";
import { ChartTerms } from "../../../translations_terms";

css/* scss */ `
  .o-gauge-color-set {
    .o-gauge-color-set-color-button {
      display: inline-block;
      border: 1px solid #dadce0;
      border-radius: 4px;
      cursor: pointer;
      padding: 1px 2px;
    }
    .o-gauge-color-set-color-button:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }
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
  updateChart: (definition: Partial<GaugeChartDefinition>) => DispatchResult;
}

interface PanelState {
  openedMenu?: GaugeMenu;
  sectionRuleDispatchResult?: DispatchResult;
}

export class GaugeChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartDesignPanel";
  static components = { ColorPicker };

  private state: PanelState = useState({
    openedMenu: undefined,
    sectionRuleDispatchResult: undefined,
  });

  get designErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.sectionRuleDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  updateBackgroundColor(color: string) {
    this.state.openedMenu = undefined;
    this.props.updateChart({
      background: color,
    });
  }

  updateTitle(ev) {
    this.props.updateChart({
      title: ev.target.value,
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

  updateInflectionPointValue(attr: string, ev) {
    const sectionRule = deepCopy(this.props.definition.sectionRule);
    sectionRule[attr].value = ev.target.value;
    this.updateSectionRule(sectionRule);
  }

  updateInflectionPointType(attr: string, ev) {
    const sectionRule = deepCopy(this.props.definition.sectionRule);
    sectionRule[attr].type = ev.target.value;
    this.updateSectionRule(sectionRule);
  }

  updateSectionColor(target: string, color: string) {
    const sectionRule = deepCopy(this.props.definition.sectionRule);
    sectionRule.colors[target] = color;
    this.updateSectionRule(sectionRule);
    this.closeMenus();
  }

  updateRangeMin(ev) {
    let sectionRule = deepCopy(this.props.definition.sectionRule);
    sectionRule = {
      ...sectionRule,
      rangeMin: ev.target.value,
    };
    this.updateSectionRule(sectionRule);
  }

  updateRangeMax(ev) {
    let sectionRule = deepCopy(this.props.definition.sectionRule);
    sectionRule = {
      ...sectionRule,
      rangeMax: ev.target.value,
    };
    this.updateSectionRule(sectionRule);
  }

  toggleMenu(menu: GaugeMenu) {
    const isSelected: boolean = this.state.openedMenu === menu;
    this.closeMenus();
    if (!isSelected) {
      this.state.openedMenu = menu;
    }
  }

  private updateSectionRule(sectionRule: SectionRule) {
    this.state.sectionRuleDispatchResult = this.props.updateChart({
      sectionRule,
    });
  }

  private closeMenus() {
    this.state.openedMenu = undefined;
  }
}
