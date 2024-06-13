import { _t } from "../../../../translation";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { DispatchResult, UID } from "../../../../types/index";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

interface Props {
  figureId: UID;
  definition: ComboChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ComboChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ComboChartDefinition>) => DispatchResult;
}

export class ComboChartDesignPanel extends ChartWithAxisDesignPanel<Props> {
  static template = "o-spreadsheet-ComboChartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    RadioSelection,
  };
  seriesTypeChoices = [
    { value: "bar", label: _t("Bar") },
    { value: "line", label: _t("Line") },
  ];

  updateDataSeriesType(index: number, type: "bar" | "line") {
    const dataSets = [...this.props.definition.dataSets];
    if (!dataSets?.[index]) {
      return;
    }
    dataSets[index] = {
      ...dataSets[index],
      type,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSeriesType(index: number) {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[index]) {
      return "bar";
    }
    return dataSets[index].type ?? "line";
  }
}
