import { canChartParseLabels, LineChart } from "../../../../helpers/figures/charts";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class LineConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-LineConfigPanel";
  static components = { ...LineBarPieConfigPanel.components, Section, Checkbox };

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.figureId);
    if (chart && chart instanceof LineChart) {
      return canChartParseLabels(chart.labelRange, this.env.model.getters);
    }
    return false;
  }

  onUpdateLabelsAsText(ev) {
    this.props.updateChart(this.props.figureId, {
      labelsAsText: ev.target.checked,
    });
  }

  onUpdateStacked(ev) {
    this.props.updateChart(this.props.figureId, {
      stacked: ev.target.checked,
    });
  }

  onUpdateAggregated(ev) {
    this.props.updateChart(this.props.figureId, {
      aggregated: ev.target.checked,
    });
  }

  onUpdateCumulative(ev) {
    this.props.updateChart(this.props.figureId, {
      cumulative: ev.target.checked,
    });
  }
}
