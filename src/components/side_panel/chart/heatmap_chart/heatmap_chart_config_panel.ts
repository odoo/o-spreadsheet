import { props, proxy } from "@odoo/owl";
import { numberToLetters } from "../../../../helpers/coordinates";
import { createValidRange } from "../../../../helpers/range";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { HeatmapChartDefinition } from "../../../../types/chart/heatmap_chart";
import { CommandResult, DispatchResult } from "../../../../types/commands";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { ChartTerms } from "../../../translations_terms";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartLabelRange } from "../building_blocks/label_range/label_range";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

interface HeatmapChartPanelState {
  rowRangeDispatchResult?: DispatchResult;
  columnRangeDispatchResult?: DispatchResult;
  dataRangeDispatchResult?: DispatchResult;
}

type Props = ChartSidePanelProps<HeatmapChartDefinition<string>>;

export class HeatmapChartConfigPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeatmapChartConfigPanel";
  static components = { ChartLabelRange, ChartErrorSection };
  protected props = props(chartSidePanelPropsDefinition) as unknown as Props;

  protected state: HeatmapChartPanelState = proxy({
    rowRangeDispatchResult: undefined,
    columnRangeDispatchResult: undefined,
    dataRangeDispatchResult: undefined,
  });

  private rowRange?: string;
  private columnRange?: string;
  private dataRange?: string;

  setup() {
    const definition = this.props.definition;
    this.rowRange = definition.rowRange;
    this.columnRange = definition.columnRange;
    this.dataRange = definition.dataRange;
  }

  get errorMessages(): string[] {
    const reasons = [
      ...(this.state.rowRangeDispatchResult?.reasons || []),
      ...(this.state.columnRangeDispatchResult?.reasons || []),
      ...(this.state.dataRangeDispatchResult?.reasons || []),
    ].filter((reason) => reason !== CommandResult.NoChanges);
    return reasons.map((error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected);
  }

  get isRowRangeInvalid(): boolean {
    return !!this.state.rowRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidHeatmapRowRange
    );
  }

  get isColumnRangeInvalid(): boolean {
    return !!this.state.columnRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidHeatmapColumnRange
    );
  }

  get isDataRangeInvalid(): boolean {
    return !!this.state.dataRangeDispatchResult?.isCancelledBecause(
      CommandResult.InvalidHeatmapDataRange
    );
  }

  onRowRangeChanged(ranges: string[]) {
    this.rowRange = ranges[0];
    this.state.rowRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      rowRange: this.rowRange,
    });
  }

  onRowRangeConfirmed() {
    this.state.rowRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      rowRange: this.rowRange,
    });
  }

  onColumnRangeChanged(ranges: string[]) {
    this.columnRange = ranges[0];
    this.state.columnRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      columnRange: this.columnRange,
    });
  }

  onColumnRangeConfirmed() {
    this.state.columnRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      columnRange: this.columnRange,
    });
  }

  onDataRangeChanged(ranges: string[]) {
    this.dataRange = ranges[0];
    this.state.dataRangeDispatchResult = this.props.canUpdateChart(this.props.chartId, {
      dataRange: this.dataRange,
    });
  }

  onDataRangeConfirmed() {
    this.state.dataRangeDispatchResult = this.props.updateChart(this.props.chartId, {
      dataRange: this.dataRange,
    });
  }

  getDataRangeOptions() {
    return [
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: this.props.definition.dataSetsHaveTitle ?? false,
        onChange: (dataSetsHaveTitle: boolean) => {
          this.props.updateChart(this.props.chartId, { dataSetsHaveTitle });
        },
      },
    ];
  }

  get dataSetsHaveTitleLabel(): string {
    const zone = this.getReferenceRangeZone();
    if (zone && zone.top === zone.bottom) {
      return _t("Use col %(column_name)s as headers", {
        column_name: numberToLetters(zone.left),
      });
    }
    return _t("Use row %(row_position)s as headers", { row_position: (zone?.top ?? 0) + 1 });
  }

  private getReferenceRangeZone() {
    const getters = this.env.model.getters;
    const sheetId = getters.getActiveSheetId();
    const range = this.dataRange || this.rowRange || this.columnRange || "";
    return createValidRange(getters, sheetId, range)?.zone;
  }
}
