import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class BarConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-BarConfigPanel";

  onUpdateStacked(ev) {
    this.props.updateChart(this.props.figureId, {
      stacked: ev.target.checked,
    });
  }
}
