import { BACKGROUND_CHART_COLOR } from "../../../constants";
import { CoreGetters, Getters, UID } from "../../../types";
import { BarChartDefinition } from "../../../types/chart/bar_chart";
import {
  ChartCreationContext,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { ComboBarChartRuntime } from "../../../types/chart/common_bar_combo";
import { CellErrorType } from "../../../types/errors";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import {
  chartFontColor,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
} from "./chart_common";
import { ComboBarChart, createComboBarChartRuntime } from "./chart_common_bar_combo";

export class BarChart extends ComboBarChart {
  constructor(definition: BarChartDefinition, sheetId: UID, getters: CoreGetters) {
    super("bar", definition, sheetId, getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) return undefined;
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
    const labelRange = toExcelLabelRange(
      this.getters,
      this.labelRange,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], this.dataSetsHaveTitle)
    );
    return {
      ...(this.getDefinition() as BarChartDefinition),
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
      verticalAxisPosition: this.verticalAxisPosition,
    };
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): BarChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: false,
      stacked: false,
      aggregated: false,
      legendPosition: "top",
      title: context.title || "",
      labelRange: context.auxiliaryRange || undefined,
      type: "bar",
      dataSetDesign: context.dataSetDesign,
    };
  }
}

export function createBarChartRuntime(chart: BarChart, getters: Getters): ComboBarChartRuntime {
  return createComboBarChartRuntime(chart, getters);
}
