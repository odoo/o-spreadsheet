import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import {
  BasicChartUIDefinition,
  ChartType,
  ChartUIDefinitionUpdate,
  CommandResult,
  DispatchResult,
  Figure,
  SpreadsheetChildEnv,
} from "../../../../types/index";
import { ColorPicker } from "../../../color_picker/color_picker";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ChartTerms } from "../../../translations_terms";
import { ChartTypeSelect } from "../chart_type_selection/chart_type_selection";

interface Props {
  figure: Figure;
  onCloseSidePanel: () => void;
}

interface ChartPanelState {
  chart: BasicChartUIDefinition;
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
  panel: "configuration" | "design";
  fillColorTool: boolean;
}

export class BasicChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.BasicChartPanel";
  static components = { SelectionInput, ColorPicker, ChartTypeSelect };

  private state: ChartPanelState = useState(this.initialState(this.props.figure));

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!this.env.model.getters.getBasicChartDefinition(nextProps.figure.id)) {
        this.props.onCloseSidePanel();
        return;
      }
      if (nextProps.figure.id !== this.props.figure.id) {
        this.state.panel = "configuration";
        this.state.fillColorTool = false;
        this.state.datasetDispatchResult = undefined;
        this.state.labelsDispatchResult = undefined;
        this.state.chart = this.env.model.getters.getBasicChartDefinitionUI(
          this.env.model.getters.getActiveSheetId(),
          nextProps.figure.id
        )!;
      }
    });
  }

  get chartType() {
    return this.env.model.getters.getChartType(this.props.figure.id);
  }

  get errorMessages(): string[] {
    const cancelledReasons = [
      ...(this.state.datasetDispatchResult?.reasons || []),
      ...(this.state.labelsDispatchResult?.reasons || []),
    ];
    return cancelledReasons.map(
      (error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected
    );
  }

  get isDatasetInvalid(): boolean {
    return !!(
      this.state.datasetDispatchResult?.isCancelledBecause(CommandResult.EmptyDataSet) ||
      this.state.datasetDispatchResult?.isCancelledBecause(CommandResult.InvalidDataSet)
    );
  }

  get isLabelInvalid(): boolean {
    return !!this.state.labelsDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  updateChartType(type: ChartType) {
    this.updateChart({ type });
  }

  onSeriesChanged(ranges: string[]) {
    this.state.chart.dataSets = ranges;
  }

  updateDataSet() {
    this.state.datasetDispatchResult = this.updateChart({
      dataSets: this.state.chart.dataSets,
      dataSetsHaveTitle: this.state.chart.dataSetsHaveTitle,
    });
  }

  updateStacked() {
    this.updateChart({ stackedBar: this.state.chart.stackedBar });
  }

  updateLabelsAsText() {
    this.updateChart({ labelsAsText: this.state.chart.labelsAsText });
  }

  updateTitle() {
    this.updateChart({ title: this.state.chart.title });
  }

  updateSelect(attr: string, ev) {
    this.state.chart[attr] = ev.target.value;
    this.updateChart({ [attr]: ev.target.value });
  }

  updateLabelRange() {
    this.state.labelsDispatchResult = this.updateChart({
      labelRange: this.state.chart.labelRange || null,
    });
  }

  private updateChart(definition: ChartUIDefinitionUpdate): DispatchResult {
    return this.env.model.dispatch("UPDATE_CHART", {
      id: this.props.figure.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
      definition,
    });
  }

  onLabelRangeChanged(ranges: string[]) {
    this.state.chart.labelRange = ranges[0];
  }

  getKey(label: string) {
    return label + this.props.figure.id;
  }

  toggleColorPicker() {
    this.state.fillColorTool = !this.state.fillColorTool;
  }

  setColor(color: string) {
    this.state.chart.background = color;
    this.state.fillColorTool = false;
    this.updateChart({ background: this.state.chart.background });
  }

  activate(panel: "configuration" | "design") {
    this.state.panel = panel;
  }

  canTreatLabelsAsText() {
    return this.env.model.getters.canChartParseLabels(this.props.figure.id);
  }

  private initialState(figure: Figure): ChartPanelState {
    return {
      chart: this.env.model.getters.getBasicChartDefinitionUI(
        this.env.model.getters.getActiveSheetId(),
        figure.id
      )!,
      panel: "configuration",
      fillColorTool: false,
    };
  }
}
