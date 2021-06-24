import * as owl from "@odoo/owl";
import { CommandResult, CreateChartDefinition, Figure, SpreadsheetEnv } from "../../types/index";
import { SelectionInput } from "../selection_input";
import { chartTerms } from "./translations_terms";

const { Component, useState } = owl;
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
      <SelectionInput
        t-key="getKey('dataSets')"
        ranges="state.dataSets"
        t-on-selection-changed="onSeriesChanged"
      />
      <input type="checkbox" t-model="state.dataSetsHaveTitle"/><t t-esc="env._t('${chartTerms.MyDataHasTitle}')"/>
    </div>
    <div class="o-section o-data-labels">
        <div class="o-section-title" t-esc="env._t('${chartTerms.DataCategories}')"/>
        <SelectionInput
          t-key="getKey('label')"
          ranges="[state.labelRange]"
          t-on-selection-changed="onLabelRangeChanged"
          maximumRanges="1"
        />
    </div>
    <div class="o-sidePanelButtons">
      <button t-if="props.figure" t-on-click="updateChart(props.figure)" class="o-sidePanelButton" t-esc="env._t('${chartTerms.UpdateChart}')"/>
      <button t-else="" t-on-click="createChart" class="o-sidePanelButton" t-esc="env._t('${chartTerms.CreateChart}')"/>
    </div>
    <div class="o-section o-sidepanel-error" t-if="state.error">
        <t t-esc="state.error"/>
    </div>
  </div>
`;

interface Props {
  figure?: Figure;
}

interface ChartPanelState extends CreateChartDefinition {
  error?: string;
}

export class ChartPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { SelectionInput };
  private getters = this.env.getters;

  private state: ChartPanelState = useState(this.initialState(this.props.figure));

  async willUpdateProps(nextProps) {
    if (nextProps.figure?.id !== this.props.figure?.id) {
      this.state = this.initialState(nextProps.figure);
    }
  }

  onSeriesChanged(ev: CustomEvent) {
    this.state.dataSets = ev.detail.ranges;
  }

  onLabelRangeChanged(ev: CustomEvent) {
    this.state.labelRange = ev.detail.ranges[0];
  }

  getKey(label: string) {
    return this.props.figure ? label + this.props.figure.id : label;
  }
  createChart() {
    const id = this.env.uuidGenerator.uuidv4();
    const result = this.env.dispatch("CREATE_CHART", {
      sheetId: this.getters.getActiveSheetId(),
      id,
      definition: this.getChartDefinition(),
    });
    if (result !== CommandResult.Success) {
      this.state.error = this.env._t(chartTerms.Errors[result] || chartTerms.Errors.unexpected);
    } else {
      this.env.dispatch("SELECT_FIGURE", { id });
      this.state.error = undefined;
      this.trigger("close-side-panel");
    }
  }

  updateChart(chart: Figure) {
    const result = this.env.dispatch("UPDATE_CHART", {
      sheetId: this.getters.getActiveSheetId(),
      id: chart.id,
      definition: this.getChartDefinition(),
    });
    if (result !== CommandResult.Success) {
      this.state.error = this.env._t(chartTerms.Errors[result] || chartTerms.Errors.unexpected);
    } else {
      this.state.error = undefined;
      this.trigger("close-side-panel");
    }
  }

  private getChartDefinition(): CreateChartDefinition {
    return {
      type: this.state.type,
      title: this.state.title,
      labelRange: this.state.labelRange ? this.state.labelRange.trim() : "",
      dataSets: this.state.dataSets.slice(),
      dataSetsHaveTitle: this.state.dataSetsHaveTitle,
    };
  }

  private initialState(figure: Figure | undefined): ChartPanelState {
    if (figure) {
      return this.env.getters.getChartDefinitionUI(this.env.getters.getActiveSheetId(), figure.id);
    } else {
      return {
        title: "",
        dataSets: [],
        labelRange: "",
        type: "bar",
        dataSetsHaveTitle: false,
      };
    }
  }
}
