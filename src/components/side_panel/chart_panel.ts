import * as owl from "@odoo/owl";
import {
  ChartUIDefinition,
  ChartUIDefinitionUpdate,
  CommandResult,
  Figure,
  SpreadsheetEnv,
} from "../../types/index";
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
           <i class="fa fa-sliders"/>Configuration</div>
      <div class="o-panel-element"
           t-att-class="state.panel !== 'design' ? 'inactive' : ''"
           t-on-click="activate('design')">
           <i class="fa fa-paint-brush"/>Design</div>
    </div>

    <t t-if="state.panel === 'configuration'">
      <div class="o-section">
        <div class="o-section-title"><t t-esc="env._t('${chartTerms.ChartType}')"/></div>
        <select t-model="state.type" class="o-input o-type-selector" t-on-change="updateSelect('type')">
          <option value="bar" t-esc="env._t('${chartTerms.Bar}')"/>
          <option value="line" t-esc="env._t('${chartTerms.Line}')"/>
          <option value="pie" t-esc="env._t('${chartTerms.Pie}')"/>
        </select>
        <t t-if="state.type === 'bar'">
          <div class="o_checkbox">
            <input type="checkbox" name="stackedBar" t-model="state.stackedBar" t-on-change="updateStacked"/>
            <t t-esc="env._t('${chartTerms.StackedBar}')"/>
          </div>
        </t>
      </div>
      <div class="o-section o-data-series">
        <div class="o-section-title" t-esc="env._t('${chartTerms.DataSeries}')"/>
        <SelectionInput
          t-key="getKey('dataSets')"
          ranges="state.dataSets"
          t-on-selection-changed="onSeriesChanged"
          t-on-selection-confirmed="updateDataSet"
        />
        <input type="checkbox" t-model="state.dataSetsHaveTitle" t-on-change="updateDataSet"/><t t-esc="env._t('${chartTerms.MyDataHasTitle}')"/>
      </div>
      <div class="o-section o-data-labels">
          <div class="o-section-title" t-esc="env._t('${chartTerms.DataCategories}')"/>
          <SelectionInput
            t-key="getKey('label')"
            ranges="[state.labelRange || '']"
            t-on-selection-changed="onLabelRangeChanged"
            t-on-selection-confirmed="updateLabelRange"
            maximumRanges="1"
          />
      </div>
      <div class="o-section o-sidepanel-error" t-if="state.error">
          <t t-esc="state.error"/>
      </div>
      </t>
      <t t-else="">
        <div class="o-section o-chart-title">
          <div class="o-section-title" t-esc="env._t('${chartTerms.BackgroundColor}')"/>
          <div class="o-with-color-picker">
            <t t-esc="env._t('${chartTerms.SelectColor}')"/>
            <span t-att-title="env._t('blabla')"
                  t-attf-style="border-color:{{state.background}}"
                  t-on-click.stop="toggleColorPicker">${icons.FILL_COLOR_ICON}</span>
            <ColorPicker t-if="state.fillColorTool" t-on-color-picked="setColor" t-key="backgroundColor"/>
          </div>
        </div>
        <div class="o-section o-chart-title">
          <div class="o-section-title" t-esc="env._t('${chartTerms.Title}')"/>
          <input type="text" t-model="state.title" t-on-change="updateTitle" class="o-input" t-att-placeholder="env._t('${chartTerms.TitlePlaceholder}')"/>
        </div>
        <div class="o-section">
          <div class="o-section-title"><t t-esc="env._t('${chartTerms.VerticalAxisPosition}')"/></div>
          <select t-model="state.verticalAxisPosition" class="o-input o-type-selector" t-on-change="updateSelect('verticalAxisPosition')">
            <option value="left" t-esc="env._t('${chartTerms.Left}')"/>
            <option value="right" t-esc="env._t('${chartTerms.Right}')"/>
          </select>
        </div>
        <div class="o-section">
          <div class="o-section-title"><t t-esc="env._t('${chartTerms.LegendPosition}')"/></div>
          <select t-model="state.legendPosition" class="o-input o-type-selector" t-on-change="updateSelect('legendPosition')">
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
        .fa {
          margin-right: 4px;
        }
      }
      .o-panel-element:last-child {
        border-right: none;
      }
    }

    // .o_checkbox {
    //   display: flex;
    // }

    .o-with-color-picker {
      position: relative;
    }
    .o-with-color-picker > span {
      border-bottom: 4px solid;
    }
  }
`;

interface Props {
  figure: Figure;
}

interface ChartPanelState extends ChartUIDefinition {
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

  async willUpdateProps(nextProps: Props) {
    if (!this.getters.getChartDefinition(nextProps.figure.id)) {
      this.trigger("close-side-panel");
      return;
    }
    if (nextProps.figure.id !== this.props.figure.id) {
      this.state = this.initialState(nextProps.figure);
    }
  }

  onSeriesChanged(ev: CustomEvent) {
    this.state.dataSets = ev.detail.ranges;
  }

  updateDataSet() {
    this.updateChart({
      dataSets: this.state.dataSets,
      dataSetsHaveTitle: this.state.dataSetsHaveTitle,
    });
  }

  updateStacked() {
    this.updateChart({ stackedBar: this.state.stackedBar });
  }

  updateTitle() {
    this.updateChart({ title: this.state.title });
  }

  updateSelect(attr: string, ev) {
    this.state[attr] = ev.target.value;
    this.updateChart({ [attr]: ev.target.value });
  }

  updateLabelRange() {
    this.updateChart({ labelRange: this.state.labelRange || null });
  }

  private updateChart(definition: ChartUIDefinitionUpdate) {
    const result = this.env.dispatch("UPDATE_CHART", {
      id: this.props.figure.id,
      sheetId: this.getters.getActiveSheetId(),
      definition,
    });
    this.state.error =
      result !== CommandResult.Success
        ? this.env._t(chartTerms.Errors[result] || chartTerms.Errors.unexpected)
        : undefined;
  }

  onLabelRangeChanged(ev: CustomEvent) {
    this.state.labelRange = ev.detail.ranges[0];
  }

  getKey(label: string) {
    return label + this.props.figure.id;
  }

  toggleColorPicker() {
    this.state.fillColorTool = !this.state.fillColorTool;
  }

  setColor(ev: CustomEvent) {
    this.state.background = ev.detail.color;
    this.state.fillColorTool = false;
    this.updateChart({ background: this.state.background });
  }

  activate(panel: "configuration" | "design") {
    this.state.panel = panel;
  }

  private initialState(figure: Figure): ChartPanelState {
    return {
      ...this.env.getters.getChartDefinitionUI(this.env.getters.getActiveSheetId(), figure.id),
      panel: "configuration",
      fillColorTool: false,
    };
  }
}
