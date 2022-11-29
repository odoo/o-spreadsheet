import * as owl from "@odoo/owl";
import { uuidv4 } from "../../helpers/index";
import { ChartFigure, ChartTypes, CreateChartDefinition, SpreadsheetEnv } from "../../types/index";
import { SelectionInput } from "../selection_input";
import { chartTerms } from "./translations_terms";

const Component = owl.Component;
const { useState } = owl;
const { xml } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-chart">
    <div class="o-section">
      <div class="o-section-title"><t t-esc="env._t('${chartTerms.ChartType}')"/></div>
      <select t-model="state.type" class="o-input o-type-selector">
        <option value="bar" t-esc="env._t('${chartTerms.Bar}')"/>
        <option value="line" t-esc="env._t('${chartTerms.Line}')"/>
        <option value="pie" t-esc="env._t('${chartTerms.Pie}')"/>
      </select>
    </div>
    <div class="o-section o-chart-title">
      <div class="o-section-title" t-esc="env._t('${chartTerms.Title}')"/>
      <input type="text" t-model="state.title" class="o-input" t-att-placeholder="env._t('${chartTerms.TitlePlaceholder}')"/>
    </div>
    <div class="o-section o-data-series">
      <div class="o-section-title" t-esc="env._t('${chartTerms.DataSeries}')"/>
      <SelectionInput ranges="state.ranges" t-on-selection-changed="onSeriesChanged"/>
      <input type="checkbox" t-model="state.seriesHasTitle"/><t t-esc="env._t('${chartTerms.MyDataHasTitle}')"/>
    </div>
    <div class="o-section o-data-labels">
        <div class="o-section-title" t-esc="env._t('${chartTerms.DataCategories}')"/>
        <SelectionInput ranges="[state.labelRange]" t-on-selection-changed="onLabelRangeChanged" maximumRanges="1"/>
    </div>
    <div class="o-sidePanelButtons">
      <button t-if="props.figure" t-on-click="updateChart(props.figure)" class="o-sidePanelButton" t-esc="env._t('${chartTerms.UpdateChart}')"/>
      <button t-else="" t-on-click="createChart" class="o-sidePanelButton" t-esc="env._t('${chartTerms.CreateChart}')"/>
    </div>
  </div>
`;

interface Props {
  figure?: ChartFigure;
}

interface ChartPanelState {
  type: ChartTypes;
  title: string;
  ranges: string[];
  labelRange: string;
  seriesHasTitle: boolean;
}

export class ChartPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { SelectionInput };
  private getters = this.env.getters;

  private state: ChartPanelState = useState(this.initialState());

  onSeriesChanged(ev: CustomEvent) {
    this.state.ranges = ev.detail.ranges;
  }

  onLabelRangeChanged(ev: CustomEvent) {
    this.state.labelRange = ev.detail.ranges[0];
  }

  createChart() {
    this.env.dispatch("CREATE_CHART", {
      sheetId: this.getters.getActiveSheet(),
      id: uuidv4(),
      definition: this.getChartDefinition(),
    });
    this.trigger("close-side-panel");
  }

  updateChart(chart: ChartFigure) {
    this.env.dispatch("UPDATE_CHART", {
      id: chart.id,
      definition: this.getChartDefinition(),
    });
    this.trigger("close-side-panel");
  }

  private getChartDefinition(): CreateChartDefinition {
    return {
      type: this.state.type,
      title: this.state.title,
      labelRange: this.state.labelRange.trim() || "",
      dataSets: this.state.ranges.slice(),
      seriesHasTitle: this.state.seriesHasTitle,
    };
  }

  private initialState(): ChartPanelState {
    const data = this.props.figure ? this.props.figure.data : undefined;
    return {
      title: data && data.title ? data.title : "",
      ranges: data ? data.dataSets.map((ds) => ds.dataRange) : [],
      labelRange: data ? data.labelRange : "",
      type: data ? data.type : "bar",
      seriesHasTitle: data ? data.title !== undefined : false,
    };
  }
}
