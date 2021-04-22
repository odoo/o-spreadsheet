import * as owl from "@odoo/owl";
import { uuidv4 } from "../../helpers/index";
import { CommandResult, CreateChartDefinition, Figure, SpreadsheetEnv } from "../../types/index";
import { ColorPicker } from "../color_picker";
import * as icons from "../icons";
import { SelectionInput } from "../selection_input";
import { chartTerms } from "./translations_terms";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-chart">
    <div class="o-panel">
      <div class="o-panel-element"
           t-att-class="state.panel !== 'configuration' ? 'inactive' : ''"
           t-on-click="activate('configuration')">
           Configuration</div>
      <div class="o-panel-element"
           t-att-class="state.panel !== 'design' ? 'inactive' : ''"
           t-on-click="activate('design')">
           Design</div>
    </div>

    <t t-if="state.panel === 'configuration'">
      <div class="o-section">
        <div class="o-section-title"><t t-esc="env._t('${chartTerms.ChartType}')"/></div>
        <select t-model="state.type" class="o-input o-type-selector">
          <option value="bar" t-esc="env._t('${chartTerms.Bar}')"/>
          <option value="line" t-esc="env._t('${chartTerms.Line}')"/>
          <option value="pie" t-esc="env._t('${chartTerms.Pie}')"/>
        </select>
        <t t-if="state.type === 'bar'">
          <input type="checkbox" t-model="state.stackedBar"/><t t-esc="env._t('${chartTerms.StackedBar}')"/>
        </t>
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
    </t>
    <t t-else="">
      <div class="o-section">
        <div class="o-section o-chart-title">
          <div class="o-section-title" t-esc="env._t('${chartTerms.BackgroundColor}')"/>
          <div class="o-with-color-picker">
            <t t-esc="env._t('${chartTerms.SelectColor}')"/>
            <span t-att-title="env._t('blabla')"
                  t-attf-style="border-color:{{state.backgroundColor}}"
                  t-on-click.stop="toggleColorPicker">${icons.FILL_COLOR_ICON}</span>
            <ColorPicker t-if="state.fillColorTool" t-on-color-picked="setColor" t-key="backgroundColor"/>
          </div>
        </div>
      </div>
      <div class="o-section o-chart-title">
        <div class="o-section-title" t-esc="env._t('${chartTerms.Title}')"/>
        <input type="text" t-model="state.title" class="o-input" t-att-placeholder="env._t('${chartTerms.TitlePlaceholder}')"/>
      </div>
      <div class="o-section">
        <div class="o-section-title"><t t-esc="env._t('${chartTerms.VerticalAxisPosition}')"/></div>
        <select t-model="state.verticalAxisPosition" class="o-input o-type-selector">
          <option value="left" t-esc="env._t('${chartTerms.Left}')"/>
          <option value="right" t-esc="env._t('${chartTerms.Right}')"/>
        </select>
      </div>
      <div class="o-section">
        <div class="o-section-title"><t t-esc="env._t('${chartTerms.DataLabels}')"/></div>
        <select t-model="state.dataLabels" class="o-input o-type-selector">
          <option value="none" t-esc="env._t('${chartTerms.None}')"/>
          <option value="top" t-esc="env._t('${chartTerms.Top}')"/>
          <option value="center" t-esc="env._t('${chartTerms.Center}')"/>
        </select>
      </div>
      <div class="o-section">
        <div class="o-section-title"><t t-esc="env._t('${chartTerms.Trendline}')"/></div>
        <select t-model="state.trendline" class="o-input o-type-selector">
          <option value="none" t-esc="env._t('${chartTerms.None}')"/>
          <option value="linear" t-esc="env._t('${chartTerms.Linear}')"/>
          <option value="exponential" t-esc="env._t('${chartTerms.Exponential}')"/>
          <option value="logarithmic" t-esc="env._t('${chartTerms.Logarithmic}')"/>
        </select>
      </div>
      <div class="o-section">
        <div class="o-section-title"><t t-esc="env._t('${chartTerms.LegendPosition}')"/></div>
        <select t-model="state.legendPosition" class="o-input o-type-selector">
          <option value="top" t-esc="env._t('${chartTerms.Top}')"/>
          <option value="bottom" t-esc="env._t('${chartTerms.Bottom}')"/>
          <option value="left" t-esc="env._t('${chartTerms.Left}')"/>
          <option value="right" t-esc="env._t('${chartTerms.Right}')"/>
        </select>
      </div>
    </t>
  </div>
`;

const STYLE = css/* scss */ `
  .o-chart {
    .o-panel {
      display: flex;

      .o-panel-element {
        flex: 1 0 auto;
        padding: 8px 0px;
        text-align: center;
        cursor: pointer;
        border-right: 1px solid darkgray;

        &.inactive {
          background-color: #f8f9fa;
          border-bottom: 1px solid darkgray;
        }
      }

      .o-panel-element:last-child {
        border-right: none;
      }
    }

    .o-with-color-picker {
      position: relative;
    }

    .o-with-color-picker > span {
      border-bottom: 4px solid;
    }
  }
`;

interface Props {
  figure?: Figure;
}

interface ChartPanelState extends CreateChartDefinition {
  error?: string;
  panel: "configuration" | "design";
  fillColorTool: boolean;
}

export class ChartPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = STYLE;
  static components = { SelectionInput, ColorPicker };
  private getters = this.env.getters;

  private state: ChartPanelState = useState(this.initialState(this.props.figure));

  async willUpdateProps(nextProps) {
    if (nextProps.figure?.id !== this.props.figure?.id) {
      this.state = this.initialState(nextProps.figure);
    }
  }

  toggleColorPicker() {
    this.state.fillColorTool = !this.state.fillColorTool;
  }

  setColor(ev: CustomEvent) {
    this.state.backgroundColor = ev.detail.color;
    this.state.fillColorTool = false;
  }

  onSeriesChanged(ev: CustomEvent) {
    this.state.dataSets = ev.detail.ranges;
  }

  onLabelRangeChanged(ev: CustomEvent) {
    this.state.labelRange = ev.detail.ranges[0];
  }

  activate(panel: "configuration" | "design") {
    this.state.panel = panel;
  }

  getKey(label: string) {
    return this.props.figure ? label + this.props.figure.id : label;
  }
  createChart() {
    const id = uuidv4();
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
      return {
        ...this.env.getters.getChartDefinitionUI(this.env.getters.getActiveSheetId(), figure.id),
        panel: "configuration",
        fillColorTool: false,
      };
    } else {
      return {
        title: "",
        dataSets: [],
        labelRange: "",
        type: "bar",
        dataSetsHaveTitle: true,
        backgroundColor: "010101",
        panel: "configuration",
        fillColorTool: false,
      };
    }
  }
}
