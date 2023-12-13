import { canChartParseLabels, LineChart } from "../../../../helpers/figures/charts";
import { LineChartDefinition } from "../../../../types/chart";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Property } from "../../components/property/property";
import { Section } from "../../components/section/section";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class LineConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-LineConfigPanel";
  static components = { ...LineBarPieConfigPanel.components, Section, Checkbox, Property };

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.figureId);
    if (chart && chart instanceof LineChart) {
      return canChartParseLabels(chart.labelRange, this.env.model.getters);
    }
    return false;
  }

  get def() {
    return {
      stacked: {
        name: "stacked",
        type: "boolean",
        label: "Stacked linechart",
        value: (this.props.definition as LineChartDefinition).stacked,
        update: this.onUpdateStacked.bind(this),
      },
      aggregated: {
        name: "aggregated",
        type: "boolean",
        label: "Aggregated",
        value: (this.props.definition as LineChartDefinition).aggregated,
        update: this.onUpdateAggregated.bind(this),
      },
      cumulative: {
        name: "cumulative",
        type: "boolean",
        label: "Cumulative",
        value: (this.props.definition as LineChartDefinition).cumulative,
        update: this.onUpdateCumulative.bind(this),
      },
      labelsAsText: {
        name: "labelsAsText",
        type: "boolean",
        label: "Labels as text",
        value: (this.props.definition as LineChartDefinition).labelsAsText,
        hidden: !this.canTreatLabelsAsText,
        update: this.onUpdateLabelsAsText.bind(this),
      },
      dataSetsHaveTitle: {
        name: "dataSetsHaveTitle",
        type: "boolean",
        label: `Use row ${this.calculateHeaderPosition()} as headers`,
        value: (this.props.definition as LineChartDefinition).dataSetsHaveTitle,
        update: this.onUpdateDataSetsHaveTitle.bind(this),
      },
      dataSeries: {
        type: "range",
        ranges: () => this.getDataSeriesRanges(),
        required: true,
        onSelectionChanged: (ranges) => this.onDataSeriesRangesChanged(ranges),
        onSelectionConfirmed: () => this.onDataSeriesConfirmed(),
      },
      labelRange: {
        type: "range",
        ranges: () => [this.getLabelRange()],
        isInvalid: this.isLabelInvalid,
        hasSingleRange: true,
        onSelectionChanged: (ranges) => this.onLabelRangeChanged(ranges),
        onSelectionConfirmed: () => this.onLabelRangeConfirmed(),
      },
    };
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
