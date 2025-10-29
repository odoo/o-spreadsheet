import { _t } from "@odoo/o-spreadsheet-engine";
import { ChartTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { numberToLetters } from "@odoo/o-spreadsheet-engine/helpers/coordinates";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { isXcRepresentation, toUnboundedZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { BubbleChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { ChartDatasetOrientation, CommandResult, DispatchResult } from "../../../../types";
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
    this.yRange = definition.dataSets[0]?.dataRange;
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

  get isXDataInvalid(): boolean {
    return !!this.state.xRangeDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  get isYDataInvalid(): boolean {
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

  getXDataRange(): string {
    return this.xRange || "";
  }

  getYDataRange(): string {
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

  onYDataRangeChanged(ranges: string[]) {
    this.yRange = ranges[0];
    const dataSets = this.props.definition.dataSets;
    dataSets[0] = { ...dataSets[0], dataRange: this.getYDataRange() };
    this.state.yRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      dataSets,
    });
  }

  onYDataRangeConfirmed() {
    const dataSets = this.props.definition.dataSets;
    dataSets[0] = { ...dataSets[0], dataRange: this.getYDataRange() };
    this.state.yRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      dataSets,
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

  onUpdateDataSetsHaveTitle(dataSetsHaveTitle: boolean) {
    this.props.updateChart(this.props.chartId, {
      dataSetsHaveTitle,
    });
  }

  private computeDatasetOrientation(): ChartDatasetOrientation | undefined {
    const dataRange = this.yRange ?? this.xRange ?? "";
    if (!dataRange) {
      return undefined;
    }
    if (!isXcRepresentation(dataRange)) {
      return undefined;
    }
    const zone = toUnboundedZone(dataRange);
    if (zone.bottom === undefined || zone.right === undefined) {
      return undefined;
    }
    if (zone.top === zone.bottom) {
      return "rows";
    }
    if (zone.left === zone.right) {
      return "columns";
    }
    return undefined;
  }

  calculateHeaderPosition(): number | undefined {
    if (this.isYDataInvalid) {
      return undefined;
    }
    const dataRange = this.yRange ?? this.xRange ?? "";
    const getters = this.env.model.getters;
    const sheetId = getters.getActiveSheetId();
    const zone = createValidRange(getters, sheetId, dataRange || "")?.zone;
    if (zone) {
      return this.computeDatasetOrientation() === "rows" ? zone.left : zone.top + 1;
    }
    return undefined;
  }

  get dataSetsHaveTitleLabel(): string {
    return this.computeDatasetOrientation() === "rows"
      ? _t("Use col %(column_name)s as headers", {
          column_name: numberToLetters(this.calculateHeaderPosition() || 0),
        })
      : _t("Use row %(row_position)s as headers", {
          row_position: this.calculateHeaderPosition() || "",
        });
  }
}
