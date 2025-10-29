import { ChartTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { BubbleChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { CommandResult, DispatchResult } from "../../../../types";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartLabelRange } from "../building_blocks/label_range/label_range";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

interface BubbleChartPanelState {
  yRangeDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
  xRangeDispatchResult?: DispatchResult;
  sizeRangeDispatchResult?: DispatchResult;
}

export class BubbleChartConfigPanel extends Component<
  ChartSidePanelProps<BubbleChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-BubbleChartConfigPanel";
  static components = {
    ChartLabelRange,
    ChartErrorSection,
  };
  static props = ChartSidePanelPropsObject;

  protected state: BubbleChartPanelState = useState({
    yRangeDispatchResult: undefined,
    labelsDispatchResult: undefined,
    xRangeDispatchResult: undefined,
    sizeRangeDispatchResult: undefined,
  });

  private labelRange?: string;
  private xRange?: string;
  private yRange?: string;
  private sizeRange?: string;

  setup() {
    const definition = this.props.definition;
    this.labelRange = definition.labelRange;
    this.xRange = definition.xRange;
    this.yRange = definition.yRange;
    this.sizeRange = definition.sizeRange;
  }

  get errorMessages(): string[] {
    const reasons = [
      ...(this.state.labelsDispatchResult?.reasons || []),
      ...(this.state.xRangeDispatchResult?.reasons || []),
      ...(this.state.sizeRangeDispatchResult?.reasons || []),
    ].filter((reason) => reason !== CommandResult.NoChanges);
    return reasons.map((error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected);
  }

  get isLabelInvalid(): boolean {
    return !!this.state.labelsDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  get isXAxisInvalid(): boolean {
    return !!this.state.xRangeDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  get isYAxisInvalid(): boolean {
    return !!this.state.yRangeDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  get isBubbleSizeRangeInvalid(): boolean {
    return !!this.state.sizeRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidLabelRange
    );
  }

  getLabelRange(): string {
    return this.labelRange || "";
  }

  getXAxisRange(): string {
    return this.xRange || "";
  }

  getYAxisRange(): string {
    return this.yRange || "";
  }

  getBubbleSizeRange(): string {
    return this.sizeRange || "";
  }

  onLabelRangeChanged(ranges: string[]) {
    this.labelRange = ranges[0];
    this.state.labelsDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      labelRange: this.labelRange,
    });
  }

  onLabelRangeConfirmed() {
    this.state.labelsDispatchResult = this.props.updateChart(this.props.chartId, {
      labelRange: this.labelRange,
    });
  }

  onXAxisRangeChanged(ranges: string[]) {
    this.xRange = ranges[0];
    this.state.xRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      xRange: this.xRange,
    });
  }

  onXAxisRangeConfirmed() {
    this.state.xRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      xRange: this.xRange,
    });
  }

  onYAxisRangeChanged(ranges: string[]) {
    this.xRange = ranges[0];
    this.state.yRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      yRange: this.yRange,
    });
  }

  onYAxisRangeConfirmed() {
    this.state.yRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      yRange: this.yRange,
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
}
