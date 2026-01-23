import { UID } from "@odoo/o-spreadsheet-engine";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { CustomisableSeriesChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import { ComboChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { ChartShowDataMarkers } from "../building_blocks/show_data_markers/show_data_markers";
import { ChartSidePanelProps } from "../common";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

export class ComboChartDesignPanel extends GenericZoomableChartDesignPanel<
  ChartSidePanelProps<ComboChartDefinition<string>>
> {
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

  updateDataSeriesType(dataSetId: UID, type: "bar" | "line") {
    const dataSetStyles = { ...this.props.definition.dataSetStyles };
    dataSetStyles[dataSetId] = {
      ...dataSetStyles[dataSetId],
      type,
    };
    this.props.updateChart(this.props.chartId, { dataSetStyles });
  }

  getDataSeriesType(dataSetId: UID) {
    const dataSetStyles = this.props.definition
      .dataSetStyles as ComboChartDefinition["dataSetStyles"];
    const type = dataSetStyles?.[dataSetId]?.type;
    if (!type) {
      const runtime = this.env.model.getters.getChartRuntime(
        this.props.chartId
      ) as CustomisableSeriesChartRuntime;
      const dataSetIndex = runtime.customisableSeries.findIndex(
        (series) => series.dataSetId === dataSetId
      );
      return dataSetIndex === 0 ? "bar" : "line";
    }
    return type;
  }
}
