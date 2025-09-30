import { UID } from "@odoo/o-spreadsheet-engine";
import { _t } from "../../../../translation";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { DispatchResult, GenericDefinition } from "../../../../types/index";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { ChartShowDataMarkers } from "../building_blocks/show_data_markers/show_data_markers";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: ComboChartDefinition;
  canUpdateChart: (
    chartId: UID,
    definition: GenericDefinition<ComboChartDefinition>
  ) => DispatchResult;
  updateChart: (
    chartId: UID,
    definition: GenericDefinition<ComboChartDefinition>
  ) => DispatchResult;
}

export class ComboChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-ComboChartDesignPanel";
  static components = {
    ...GenericZoomableChartDesignPanel.components,
    ChartShowDataMarkers,
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
    this.props.updateChart(this.props.chartId, { dataSets });
  }

  getDataSeriesType(index: number) {
    const dataSets = this.props.definition.dataSets as ComboChartDefinition["dataSets"];
    if (!dataSets?.[index]) {
      return "bar";
    }
    return dataSets[index].type ?? "line";
  }
}
