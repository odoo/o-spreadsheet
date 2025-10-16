import { SCATTER_MAX_POINT_RADIUS, SCATTER_MIN_POINT_RADIUS } from "../../../../constants";
import { adjustPointSizeRadius } from "../../../../helpers/figures/charts";
import { DispatchResult, UID } from "../../../../types";
import {
  ScatterChartDefinition,
  ScatterPointSizeMode,
  ScatterShowValuesMode,
} from "../../../../types/chart/scatter_chart";
import { ChartTerms } from "../../../translations_terms";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { Section } from "../../components/section/section";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: ScatterChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<ScatterChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<ScatterChartDefinition>) => DispatchResult;
}

export class ScatterChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-ScatterChartDesignPanel";
  static components = {
    ...GenericZoomableChartDesignPanel.components,
    RadioSelection,
    Section,
  };

  chartTerms = ChartTerms;

  showValuesModes = [
    { value: "value", label: ChartTerms.ShowValuesModes.Value },
    { value: "label", label: ChartTerms.ShowValuesModes.Label },
  ];

  pointSizeModes = [
    { value: "fixed", label: ChartTerms.PointSizeModes.Fixed },
    { value: "range", label: ChartTerms.PointSizeModes.Range },
    { value: "value", label: ChartTerms.PointSizeModes.Value },
  ];

  get showValuesMode(): ScatterShowValuesMode {
    return this.props.definition.showValuesMode ?? "value";
  }

  onShowValuesModeChanged(mode: string) {
    const showValuesMode: ScatterShowValuesMode = mode === "label" ? "label" : "value";
    this.props.updateChart(this.props.chartId, {
      showValuesMode,
    });
  }

  getPointSizeMode(index: number): ScatterPointSizeMode {
    const mode = this.props.definition.dataSets?.[index]?.pointSizeMode;
    if (mode === "range" || mode === "value") {
      return mode;
    }
    return "fixed";
  }

  onPointSizeModeChanged(index: number, mode: string) {
    const pointSizeMode: ScatterPointSizeMode =
      mode === "range" || mode === "value" ? (mode as ScatterPointSizeMode) : "fixed";
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[index]) {
      return;
    }
    const updatedDataSet = {
      ...dataSets[index],
      pointSizeMode,
      pointSize:
        pointSizeMode === "fixed"
          ? adjustPointSizeRadius(dataSets[index].pointSize)
          : dataSets[index].pointSize,
    };
    dataSets[index] = updatedDataSet;
    this.props.updateChart(this.props.chartId, { dataSets });
  }

  getPointSizeValue(index: number): number {
    const size = this.props.definition.dataSets?.[index]?.pointSize;
    return adjustPointSizeRadius(size);
  }

  onPointSizeValueChanged(index: number, ev: InputEvent) {
    const value = Number((ev.target as HTMLInputElement).value);
    const pointSize = adjustPointSizeRadius(value);
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[index]) {
      return;
    }
    dataSets[index] = { ...dataSets[index], pointSize };
    this.props.updateChart(this.props.chartId, { dataSets });
  }

  hasPointSizeRange(index: number): boolean {
    return Boolean(this.props.definition.dataSets?.[index]?.pointSizeRange);
  }

  get pointSizeMin() {
    return SCATTER_MIN_POINT_RADIUS;
  }

  get pointSizeMax() {
    return SCATTER_MAX_POINT_RADIUS;
  }
}
