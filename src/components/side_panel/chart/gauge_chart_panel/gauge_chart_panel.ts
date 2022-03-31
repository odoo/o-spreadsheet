import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/index";
import {
  ChartType,
  CommandResult,
  DispatchResult,
  Figure,
  GaugeChartUIDefinition,
  GaugeChartUIDefinitionUpdate,
  SpreadsheetChildEnv,
} from "../../../../types/index";
import { ColorPicker } from "../../../color_picker/color_picker";
import { css } from "../../../helpers/css";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";
import { ChartTypeSelect } from "../chart_type_selection/chart_type_selection";

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
  figure: Figure;
  onCloseSidePanel: () => void;
}

interface PanelState {
  chart: GaugeChartUIDefinition;
  panel: "configuration" | "design";
  openedMenu?: GaugeMenu;
  dataRangeDispatchResult?: DispatchResult;
  sectionRuleDispatchResult?: DispatchResult;
}

export class GaugeChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.GaugeChartPanel";
  static components = { SelectionInput, ChartTypeSelect, ColorPicker };

  private state: PanelState = useState(this.initialState(this.props.figure));
  private sheetId = this.env.model.getters.getActiveSheetId();

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!this.env.model.getters.isChartDefined(nextProps.figure.id)) {
        this.props.onCloseSidePanel();
        return;
      }
      if (nextProps.figure.id !== this.props.figure.id) {
        this.state.panel = "configuration";
        this.state.dataRangeDispatchResult = undefined;
        this.state.sectionRuleDispatchResult = undefined;
        this.sheetId = this.env.model.getters.getActiveSheetId();
        this.state.chart = this.getGaugeChartDefinitionUI(this.sheetId, nextProps.figure.id)!;
      }
    });
  }

  activate(panel: "configuration" | "design") {
    this.state.panel = panel;
  }

  private initialState(figure: Figure): PanelState {
    return {
      chart: this.getGaugeChartDefinitionUI(this.env.model.getters.getActiveSheetId(), figure.id)!,
      panel: "configuration",
      dataRangeDispatchResult: undefined,
      sectionRuleDispatchResult: undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION TEMPLATE
  // ---------------------------------------------------------------------------

  get configurationErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.dataRangeDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isDataRangeInvalid(): boolean {
    return !!(
      this.state.dataRangeDispatchResult?.isCancelledBecause(CommandResult.EmptyGaugeDataRange) ||
      this.state.dataRangeDispatchResult?.isCancelledBecause(CommandResult.InvalidGaugeDataRange)
    );
  }

  updateChartType(type: ChartType) {
    return this.env.model.dispatch("UPDATE_CHART", {
      id: this.props.figure.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
      definition: { type },
    });
  }

  onDataRangeChanged(ranges: string[]) {
    this.state.chart.dataRange = ranges[0];
  }

  updateDataRange() {
    this.state.dataRangeDispatchResult = this.updateChart({
      dataRange: this.state.chart.dataRange,
    });
  }

  getKey(label: string) {
    return label + this.props.figure.id;
  }

  // ---------------------------------------------------------------------------
  // DESIGN_TEMPLATE
  // ---------------------------------------------------------------------------

  get designErrorMessages(): string[] {
    const cancelledReasons = [...(this.state.sectionRuleDispatchResult?.reasons || [])];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  updateBackgroundColor(color: string) {
    this.state.chart.background = color;
    this.updateChart({ background: this.state.chart.background });
    this.closeMenus();
  }

  updateTitle() {
    this.updateChart({ title: this.state.chart.title });
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
    this.state.chart.sectionRule[attr].value = ev.target.value;
    this.updateSectionRule();
  }

  updateInflectionPointType(attr: string, ev) {
    this.state.chart.sectionRule[attr].type = ev.target.value;
    this.updateSectionRule();
  }

  updateSectionColor(target: string, color: string) {
    if (this.state.chart.sectionRule) {
      this.state.chart.sectionRule.colors[target] = color;
    }
    this.updateSectionRule();
    this.closeMenus();
  }

  // ---------------------------------------------------------------------------
  // GLOBAL
  // ---------------------------------------------------------------------------

  toggleMenu(menu: GaugeMenu) {
    const isSelected: boolean = this.state.openedMenu === menu;
    this.closeMenus();
    if (!isSelected) {
      this.state.openedMenu = menu;
    }
  }

  updateSectionRule() {
    this.state.sectionRuleDispatchResult = this.updateChart({
      sectionRule: this.state.chart.sectionRule,
    });
  }

  private closeMenus() {
    this.state.openedMenu = undefined;
  }

  private updateChart(definition: GaugeChartUIDefinitionUpdate): DispatchResult {
    return this.env.model.dispatch("UPDATE_CHART", {
      id: this.props.figure.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
      definition,
    });
  }

  private getGaugeChartDefinitionUI(
    sheetId: string,
    figureId: string
  ): GaugeChartUIDefinition | undefined {
    return deepCopy(this.env.model.getters.getGaugeChartDefinitionUI(sheetId, figureId));
  }
}
