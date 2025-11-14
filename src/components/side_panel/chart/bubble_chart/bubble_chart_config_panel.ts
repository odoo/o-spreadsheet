import { BubbleChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { useState } from "@odoo/owl";
import { CommandResult, DispatchResult } from "../../../../types";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

interface BubbleChartPanelState {
  xRangeDispatchResult?: DispatchResult;
  sizeRangeDispatchResult?: DispatchResult;
}

export class BubbleChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-BubbleChartConfigPanel";

  protected bubbleState: BubbleChartPanelState = useState({
    xRangeDispatchResult: undefined,
    sizeRangeDispatchResult: undefined,
  });

  private xRange?: string;
  private sizeRange?: string;

  setup() {
    super.setup();
    const definition = this.props.definition as BubbleChartDefinition;
    this.xRange = definition.xRange;
    this.sizeRange = definition.sizeRange;
  }

  get errorMessages(): string[] {
    const baseMessages = super.errorMessages;
    const extraReasons = [
      ...(this.bubbleState.xRangeDispatchResult?.reasons || []),
      ...(this.bubbleState.sizeRangeDispatchResult?.reasons || []),
    ].filter((reason) => reason !== CommandResult.NoChanges);
    if (!extraReasons.length) {
      return baseMessages;
    }
    const extraMessages = extraReasons.map(
      (error) => this.chartTerms.Errors[error] || this.chartTerms.Errors.Unexpected
    );
    return [...baseMessages, ...extraMessages];
  }

  getLabelRangeOptions() {
    return [];
  }

  getXAxisRange(): string {
    return this.xRange || "";
  }

  onXAxisRangeChanged(ranges: string[]) {
    this.xRange = ranges[0];
    this.bubbleState.xRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      xRange: this.xRange,
    });
  }

  onXAxisRangeConfirmed() {
    this.bubbleState.xRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      xRange: this.xRange,
    });
  }

  get isXAxisInvalid(): boolean {
    return !!this.bubbleState.xRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidLabelRange
    );
  }

  getBubbleSizeRange(): string {
    return this.sizeRange || "";
  }

  onBubbleSizeRangeChanged(ranges: string[]) {
    this.sizeRange = ranges[0];
    this.bubbleState.sizeRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      sizeRange: this.sizeRange,
    });
  }

  onBubbleSizeRangeConfirmed() {
    this.bubbleState.sizeRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      sizeRange: this.sizeRange,
    });
  }

  get isBubbleSizeRangeInvalid(): boolean {
    return !!this.bubbleState.sizeRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidLabelRange
    );
  }
}
