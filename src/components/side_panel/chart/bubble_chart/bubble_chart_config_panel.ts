import { ChartTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { BubbleChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { useState } from "@odoo/owl";
import { CommandResult, DispatchResult } from "../../../../types";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

interface BubbleChartPanelState {
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
  xRangeDispatchResult?: DispatchResult;
  sizeRangeDispatchResult?: DispatchResult;
}

export class BubbleChartConfigPanel extends GenericChartConfigPanel<
  ChartSidePanelProps<BubbleChartDefinition>
> {
  static template = "o-spreadsheet-BubbleChartConfigPanel";
  static props = ChartSidePanelPropsObject;

  protected state: BubbleChartPanelState = useState({
    yRangeDispatchResult: undefined,
    labelsDispatchResult: undefined,
    xRangeDispatchResult: undefined,
    sizeRangeDispatchResult: undefined,
  });

  private xRange?: string;
  private sizeRange?: string;

  setup() {
    super.setup();
    const definition = this.props.definition;
    this.xRange = definition.xRange;
    this.sizeRange = definition.sizeRange;
  }

  get errorMessages(): string[] {
    const reasons = [
      ...(this.state.datasetDispatchResult?.reasons || []),
      ...(this.state.xRangeDispatchResult?.reasons || []),
      ...(this.state.labelsDispatchResult?.reasons || []),
      ...(this.state.sizeRangeDispatchResult?.reasons || []),
    ].filter((reason) => reason !== CommandResult.NoChanges);
    return reasons.map((error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected);
  }

  get isLabelInvalid(): boolean {
    return !!this.state.labelsDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  get isXDataInvalid(): boolean {
    return !!this.state.xRangeDispatchResult?.isCancelledBecause(CommandResult.InvalidXRange);
  }

  get isYDataInvalid(): boolean {
    return !!this.state.datasetDispatchResult?.isCancelledBecause(CommandResult.InvalidYRange);
  }

  get isBubbleSizeRangeInvalid(): boolean {
    return !!this.state.sizeRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidBubbleSizeRange
    );
  }

  onXDataRangeChanged(ranges: string[]) {
    this.xRange = ranges[0];
    this.state.xRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      xRange: this.xRange,
    });
  }

  onXDataRangeConfirmed() {
    this.state.xRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      xRange: this.xRange,
    });
  }

  onBubbleSizeRangeChanged(ranges: string[]) {
    this.sizeRange = ranges[0];
    this.state.sizeRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      sizeRange: this.sizeRange,
    });
  }

  onBubbleSizeRangeConfirmed() {
    this.state.sizeRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      sizeRange: this.sizeRange,
    });
  }

  getLabelRangeOptions() {
    const definition = this.props.definition;
    return [
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  calculateHeaderPosition(): number | undefined {
    if (this.isYDataInvalid) {
      return undefined;
    }
    const dataRange = this.dataSets[0]?.dataRange ?? this.xRange ?? "";
    const getters = this.env.model.getters;
    const sheetId = getters.getActiveSheetId();
    const zone = createValidRange(getters, sheetId, dataRange || "")?.zone;
    if (zone) {
      return this.datasetOrientation === "rows" ? zone.left : zone.top + 1;
    }
    return undefined;
  }
}
