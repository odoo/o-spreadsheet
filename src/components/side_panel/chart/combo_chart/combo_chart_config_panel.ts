import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class ComboConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-ComboConfigPanel";

  onToggleZoom(enabled: boolean) {
    const definition = this.props.definition as ComboChartDefinition;
    const zoom = {
      ...definition.zoom,
      enabled,
    };
    if (enabled) {
      zoom.sliceable = true;
    }
    this.props.updateChart(this.props.figureId, {
      zoom,
    });
  }
}
