import { _t } from "../../../../translation";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { DispatchResult, UID } from "../../../../types/index";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  figureId: UID;
  definition: ComboChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ComboChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ComboChartDefinition>) => DispatchResult;
}

export class ComboChartDesignPanel extends ChartWithAxisDesignPanel<Props> {
  static template = "o-spreadsheet-ComboChartDesignPanel";
  seriesTypeChoices = [
    { value: "bar", label: _t("Bar") },
    { value: "line", label: _t("Line") },
  ];

  updateDataSeriesType(type: "bar" | "line") {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[this.state.index]) {
      return;
    }
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      type,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSeriesType() {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) {
      return "bar";
    }
    return dataSets[this.state.index].type ?? "line";
  }
}
