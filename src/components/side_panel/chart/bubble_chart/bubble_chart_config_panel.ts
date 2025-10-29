import { Component, useState } from "@odoo/owl";
import { createValidRange, numberToLetters } from "../../../../helpers";
import { _t } from "../../../../translation";
import { CommandResult, DispatchResult } from "../../../../types";
import { BubbleChartDefinition } from "../../../../types/chart/bubble_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { ChartTerms } from "../../../translations_terms";
import { ChartDataSeries } from "../building_blocks/data_series/data_series";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartLabelRange } from "../building_blocks/label_range/label_range";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

interface BubbleChartPanelState {
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
  xRangeDispatchResult?: DispatchResult;
  sizeRangeDispatchResult?: DispatchResult;
}

type Props = ChartSidePanelProps<BubbleChartDefinition>;

export class BubbleChartConfigPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BubbleChartConfigPanel";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
    ChartErrorSection,
  };
  static props = ChartSidePanelPropsObject;

  protected state: BubbleChartPanelState = useState({
    datasetDispatchResult: undefined,
    labelsDispatchResult: undefined,
    xRangeDispatchResult: undefined,
    sizeRangeDispatchResult: undefined,
  });

  protected yRanges: string[] = [];
  protected labelRange?: string;
  protected datasetOrientation: "rows" | "columns" | undefined;
  private xRange?: string;
  private sizeRange?: string;

  setup() {
    const definition = this.props.definition;
    this.yRanges = definition.yRanges || [];
    this.labelRange = definition.labelRange;
    this.xRange = definition.xRange;
    this.sizeRange = definition.sizeRange;
    this.datasetOrientation = this.computeDatasetOrientation();
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

  get dataSetsHaveTitleLabel(): string {
    return this.datasetOrientation === "rows"
      ? _t("Use col %(column_name)s as headers", {
          column_name: numberToLetters(this.calculateHeaderPosition() || 0),
        })
      : _t("Use row %(row_position)s as headers", {
          row_position: this.calculateHeaderPosition() || "",
        });
  }

  getDataSeriesRanges() {
    return this.yRanges.map((dataRange, i) => ({ dataRange, dataSetId: `${i}` }));
  }

  onDataSeriesRangesChanged(ranges: string[]) {
    this.yRanges = ranges;
    this.state.datasetDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      yRanges: this.yRanges,
    });
  }

  onDataSeriesConfirmed() {
    this.datasetOrientation = this.computeDatasetOrientation();
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      yRanges: this.yRanges,
    });
  }

  onDataSeriesReordered(indexes: number[]) {
    this.yRanges = indexes.map((i) => this.yRanges[i]);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      yRanges: this.yRanges,
    });
  }

  onDataSeriesRemoved(index: number) {
    this.yRanges = this.yRanges.filter((_, i) => i !== index);
    this.state.datasetDispatchResult = this.props.updateChart(this.props.chartId, {
      yRanges: this.yRanges,
    });
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

  onUpdateDataSetsHaveTitle(dataSetsHaveTitle: boolean) {
    this.props.updateChart(this.props.chartId, {
      dataSetsHaveTitle,
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
    const dataRange = this.yRanges[0] ?? this.xRange ?? "";
    const getters = this.env.model.getters;
    const sheetId = getters.getActiveSheetId();
    const zone = createValidRange(getters, sheetId, dataRange || "")?.zone;
    if (zone) {
      return this.datasetOrientation === "rows" ? zone.left : zone.top + 1;
    }
    return undefined;
  }

  private computeDatasetOrientation(): "rows" | "columns" | undefined {
    let anyRow = false;
    let anyColumn = false;
    for (const yRange of this.yRanges) {
      const getters = this.env.model.getters;
      const sheetId = getters.getActiveSheetId();
      const zone = createValidRange(getters, sheetId, yRange)?.zone;
      if (!zone) {
        return undefined;
      }
      if (zone.top === zone.bottom) {
        anyRow = true;
      }
      if (zone.left === zone.right) {
        anyColumn = true;
      }
    }
    if (anyRow && !anyColumn) {
      return "rows";
    }
    if (!anyRow && anyColumn) {
      return "columns";
    }
    return undefined;
  }
}
