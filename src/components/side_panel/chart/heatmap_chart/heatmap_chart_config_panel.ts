import { proxy, useProps } from "@odoo/owl";
import { numberToLetters } from "../../../../helpers/coordinates";
import { createValidRange } from "../../../../helpers/range";
import { _t } from "../../../../translation";
import {
  HeatmapChartDefinition,
  HeatmapRangeKey,
  INVALID_RANGE_RESULTS,
} from "../../../../types/chart/heatmap_chart";
import { CommandResult, DispatchResult } from "../../../../types/commands";
import { OSComponent } from "../../../os_component";
import { ChartTerms } from "../../../translations_terms";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartLabelRange } from "../building_blocks/label_range/label_range";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

type Props = ChartSidePanelProps<HeatmapChartDefinition<string>>;

export class HeatmapChartConfigPanel extends OSComponent {
  static template = "o-spreadsheet-HeatmapChartConfigPanel";
  static components = { ChartLabelRange, ChartErrorSection };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as Props;

  protected state: Partial<Record<HeatmapRangeKey, DispatchResult>> = proxy({});

  private ranges: Partial<Record<HeatmapRangeKey, string>> = {};

  setup() {
    const definition = this.props.definition;
    this.ranges = {
      xRange: definition.xRange,
      yRange: definition.yRange,
      sizeRange: definition.sizeRange,
    };
  }

  get errorMessages(): string[] {
    const reasons = [
      ...(this.state.xRange?.reasons || []),
      ...(this.state.yRange?.reasons || []),
      ...(this.state.sizeRange?.reasons || []),
    ].filter((reason) => reason !== CommandResult.NoChanges);
    return reasons.map((error) => ChartTerms.Errors[error] || ChartTerms.Errors.Unexpected);
  }

  getRange(key: HeatmapRangeKey): string {
    return this.ranges[key] || "";
  }

  isRangeInvalid(key: HeatmapRangeKey): boolean {
    return !!this.state[key]?.isCancelledBecause(INVALID_RANGE_RESULTS[key]);
  }

  onRangeChanged(key: HeatmapRangeKey, ranges: string[]) {
    this.ranges[key] = ranges[0];
    this.state[key] = this.props.canUpdateChart(this.props.chartId, { [key]: this.ranges[key] });
  }

  onRangeConfirmed(key: HeatmapRangeKey) {
    this.state[key] = this.props.updateChart(this.props.chartId, { [key]: this.ranges[key] });
  }

  onUpdateDataSetsHaveTitle(dataSetsHaveTitle: boolean) {
    this.props.updateChart(this.props.chartId, { dataSetsHaveTitle });
  }

  getSizeRangeOptions() {
    return [
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: this.props.definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  get dataSetsHaveTitleLabel(): string {
    const getters = this.model().getters;
    const sheetId = getters.getActiveSheetId();
    const rangeXc = this.ranges.sizeRange || this.ranges.xRange || this.ranges.yRange || "";
    const zone = createValidRange(getters, sheetId, rangeXc)?.zone;
    if (zone && zone.top === zone.bottom && zone.left !== zone.right) {
      return _t("Use col %(column_name)s as headers", {
        column_name: numberToLetters(zone.left),
      });
    }
    return _t("Use row %(row_position)s as headers", {
      row_position: zone ? zone.top + 1 : "",
    });
  }
}
