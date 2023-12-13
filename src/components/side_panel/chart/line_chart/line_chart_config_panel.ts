import { canChartParseLabels, LineChart } from "../../../../helpers/figures/charts";
import { LineChartDefinition } from "../../../../types/chart";
import { SelectionInput } from "../../../selection_input/selection_input";
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
    //TODO Type this properly
    return {
      stacked: {
        component: Checkbox,
        props: {
          name: "stacked",
          label: "Stacked linechart",
          value: (this.props.definition as LineChartDefinition).stacked,
          update: this.onUpdateStacked.bind(this),
        },
      },
      aggregated: {
        component: Checkbox,
        props: {
          name: "aggregated",
          label: "Aggregated",
          value: (this.props.definition as LineChartDefinition).aggregated,
          update: this.onUpdateAggregated.bind(this),
        },
      },
      cumulative: {
        component: Checkbox,
        props: {
          name: "cumulative",
          label: "Cumulative",
          value: (this.props.definition as LineChartDefinition).cumulative,
          update: this.onUpdateCumulative.bind(this),
        },
      },
      labelsAsText: {
        component: Checkbox,
        props: {
          name: "labelsAsText",
          label: "Labels as text",
          value: (this.props.definition as LineChartDefinition).labelsAsText,
          hidden: !this.canTreatLabelsAsText,
          update: this.onUpdateLabelsAsText.bind(this),
        },
      },
      dataSetsHaveTitle: {
        component: Checkbox,
        props: {
          name: "dataSetsHaveTitle",
          label: `Use row ${this.calculateHeaderPosition()} as headers`,
          value: (this.props.definition as LineChartDefinition).dataSetsHaveTitle,
          update: this.onUpdateDataSetsHaveTitle.bind(this),
        },
      },
      dataSeries: {
        component: SelectionInput,
        props: {
          ranges: () => this.getDataSeriesRanges(),
          required: true,
          onSelectionChanged: (ranges) => this.onDataSeriesRangesChanged(ranges),
          onSelectionConfirmed: () => this.onDataSeriesConfirmed(),
        },
      },
      labelRange: {
        component: SelectionInput,
        props: {
          ranges: () => [this.getLabelRange()],
          isInvalid: this.isLabelInvalid,
          hasSingleRange: true,
          onSelectionChanged: (ranges) => this.onLabelRangeChanged(ranges),
          onSelectionConfirmed: () => this.onLabelRangeConfirmed(),
        },
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
