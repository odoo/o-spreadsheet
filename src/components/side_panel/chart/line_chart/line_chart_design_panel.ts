import { LineChartDefinition } from "../../../../types/chart";
import { Checkbox } from "../../components/checkbox/checkbox";
import { GeneralSeriesEditor } from "../building_blocks/general_series/general_serie_editor";
import { ChartWithAxisDesignPanel } from "../chart_with_axis/design_panel";

export class LinechartDesignPanel extends ChartWithAxisDesignPanel {
  static template = "o-spreadsheet-LinechartDesignPanel";
  static components = {
    ...ChartWithAxisDesignPanel.components,
    Checkbox,
    GeneralSeriesEditor,
  };

  shouldShowDataSerieArea(): boolean {
    return (this.props.definition as LineChartDefinition).fillArea ?? false;
  }

  updateFillArea(fillArea: boolean) {
    this.props.updateChart(this.props.figureId, {
      fillArea,
    });
  }
}
