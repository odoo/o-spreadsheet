import { Component, onWillUpdateProps, useState, xml } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR } from "../../constants";
import {
  ChartUIDefinition,
  ChartUIDefinitionUpdate,
  CommandResult,
  DispatchResult,
  Figure,
  SpreadsheetChildEnv,
} from "../../types/index";
import { ColorPicker } from "../color_picker";
import { css } from "../helpers/css";
import * as icons from "../icons";
import { SelectionInput } from "../selection_input";
import { chartTerms } from "./translations_terms";

const CONFIGURATION_TEMPLATE = xml/* xml */ `
<div>
  <div class="o-section">
    <div class="o-section-title" t-esc="env._t('${chartTerms.ChartType}')"/>
    <select t-model="state.chart.type" class="o-input o-type-selector" t-on-change="(ev) => this.updateSelect('type', ev)">
      <option value="bar" t-esc="env._t('${chartTerms.Bar}')"/>
      <option value="line" t-esc="env._t('${chartTerms.Line}')"/>
      <option value="pie" t-esc="env._t('${chartTerms.Pie}')"/>
    </select>
    <t t-if="state.chart.type === 'bar'">
      <div class="o_checkbox">
        <input type="checkbox" name="stackedBar" t-model="state.chart.stackedBar" t-on-change="updateStacked"/>
        <t t-esc="env._t('${chartTerms.StackedBar}')"/>
      </div>
    </t>
  </div>
  <div class="o-section o-data-series">
    <div class="o-section-title" t-esc="env._t('${chartTerms.DataSeries}')"/>
    <SelectionInput t-key="getKey('dataSets')"
                    ranges="state.chart.dataSets"
                    isInvalid="isDatasetInvalid"
                    required="true"
                    onSelectionChanged="(ranges) => this.onSeriesChanged(ranges)"
                    onSelectionConfirmed="() => this.updateDataSet()" />
    <input type="checkbox" t-model="state.chart.dataSetsHaveTitle" t-on-change="() => this.updateDataSet()"/><t t-esc="env._t('${chartTerms.MyDataHasTitle}')"/>
  </div>
  <div class="o-section o-data-labels">
    <div class="o-section-title" t-esc="env._t('${chartTerms.DataCategories}')"/>
    <SelectionInput t-key="getKey('label')"
                    ranges="[state.chart.labelRange || '']"
                    isInvalid="isLabelInvalid"
                    hasSingleRange="true"
                    onSelectionChanged="(ranges) => this.onLabelRangeChanged(ranges)"
                    onSelectionConfirmed="() => this.updateLabelRange()" />
  </div>
  <div class="o-section o-sidepanel-error" t-if="errorMessages">
    <div t-foreach="errorMessages" t-as="error" t-key="error">
      <t t-esc="error"/>
    </div>
  </div>
</div>
`;

const DESIGN_TEMPLATE = xml/* xml */ `
<div>
  <div class="o-section o-chart-title">
    <div class="o-section-title" t-esc="env._t('${chartTerms.BackgroundColor}')"/>
    <div class="o-with-color-picker">
      <t t-esc="env._t('${chartTerms.SelectColor}')"/>
      <span t-attf-style="border-color:{{state.chart.background}}"
            t-on-click.stop="toggleColorPicker">${icons.FILL_COLOR_ICON}</span>
      <ColorPicker t-if="state.fillColorTool" onColorPicked="(color) => this.setColor(color)" t-key="backgroundColor"/>
    </div>
  </div>
  <div class="o-section o-chart-title">
    <div class="o-section-title" t-esc="env._t('${chartTerms.Title}')"/>
    <input type="text" t-model="state.chart.title" t-on-change="updateTitle" class="o-input" t-att-placeholder="env._t('${chartTerms.TitlePlaceholder}')"/>
  </div>
  <div class="o-section">
    <div class="o-section-title"><t t-esc="env._t('${chartTerms.VerticalAxisPosition}')"/></div>
    <select t-model="state.chart.verticalAxisPosition" class="o-input o-type-selector" t-on-change="(ev) => this.updateSelect('verticalAxisPosition', ev)">
      <option value="left" t-esc="env._t('${chartTerms.Left}')"/>
      <option value="right" t-esc="env._t('${chartTerms.Right}')"/>
    </select>
  </div>
  <div class="o-section">
    <div class="o-section-title"><t t-esc="env._t('${chartTerms.LegendPosition}')"/></div>
    <select t-model="state.chart.legendPosition" class="o-input o-type-selector" t-on-change="(ev) => this.updateSelect('legendPosition', ev)">
      <option value="top" t-esc="env._t('${chartTerms.Top}')"/>
      <option value="bottom" t-esc="env._t('${chartTerms.Bottom}')"/>
      <option value="left" t-esc="env._t('${chartTerms.Left}')"/>
      <option value="right" t-esc="env._t('${chartTerms.Right}')"/>
    </select>
  </div>
</div>
`;

const TEMPLATE = xml/* xml */ `
  <div class="o-chart">
    <div class="o-panel">
      <div class="o-panel-element"
          t-att-class="state.panel !== 'configuration' ? 'inactive' : ''"
          t-on-click="() => this.activate('configuration')">
        <i class="fa fa-sliders"/>Configuration
      </div>
      <div class="o-panel-element"
          t-att-class="state.panel !== 'design' ? 'inactive' : ''"
          t-on-click="() => this.activate('design')">
        <i class="fa fa-paint-brush"/>Design
      </div>
    </div>

    <t t-if="state.panel === 'configuration'">
      <t t-call="${CONFIGURATION_TEMPLATE}"/>
    </t>
    <t t-else="">
      <t t-call="${DESIGN_TEMPLATE}"/>
    </t>
  </div>
`;

css/* scss */ `
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
          background-color: ${BACKGROUND_HEADER_COLOR};
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
  onCloseSidePanel: () => void;
}

interface ChartPanelState {
  chart: ChartUIDefinition;
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
  panel: "configuration" | "design";
  fillColorTool: boolean;
}

export class ChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = { SelectionInput, ColorPicker };

  private state: ChartPanelState = useState(this.initialState(this.props.figure));

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!this.env.model.getters.getChartDefinition(nextProps.figure.id)) {
        this.props.onCloseSidePanel();
        return;
      }
      if (nextProps.figure.id !== this.props.figure.id) {
        this.state.panel = "configuration";
        this.state.fillColorTool = false;
        this.state.datasetDispatchResult = undefined;
        this.state.labelsDispatchResult = undefined;
        this.state.chart = this.env.model.getters.getChartDefinitionUI(
          this.env.model.getters.getActiveSheetId(),
          nextProps.figure.id
        );
      }
    });
  }

  get errorMessages(): string[] {
    const cancelledReasons = [
      ...(this.state.datasetDispatchResult?.reasons || []),
      ...(this.state.labelsDispatchResult?.reasons || []),
    ];
    return cancelledReasons.map((error) =>
      this.env._t(chartTerms.Errors[error] || chartTerms.Errors.unexpected)
    );
  }

  get isDatasetInvalid(): boolean {
    return !!(
      this.state.datasetDispatchResult?.isCancelledBecause(CommandResult.EmptyDataSet) ||
      this.state.datasetDispatchResult?.isCancelledBecause(CommandResult.InvalidDataSet)
    );
  }

  get isLabelInvalid(): boolean {
    return !!this.state.labelsDispatchResult?.isCancelledBecause(CommandResult.InvalidLabelRange);
  }

  onSeriesChanged(ranges: string[]) {
    this.state.chart.dataSets = ranges;
  }

  updateDataSet() {
    this.state.datasetDispatchResult = this.updateChart({
      dataSets: this.state.chart.dataSets,
      dataSetsHaveTitle: this.state.chart.dataSetsHaveTitle,
    });
  }

  updateStacked() {
    this.updateChart({ stackedBar: this.state.chart.stackedBar });
  }

  updateTitle() {
    this.updateChart({ title: this.state.chart.title });
  }

  updateSelect(attr: string, ev) {
    this.state.chart[attr] = ev.target.value;
    this.updateChart({ [attr]: ev.target.value });
  }

  updateLabelRange() {
    this.state.labelsDispatchResult = this.updateChart({
      labelRange: this.state.chart.labelRange || null,
    });
  }

  private updateChart(definition: ChartUIDefinitionUpdate): DispatchResult {
    return this.env.model.dispatch("UPDATE_CHART", {
      id: this.props.figure.id,
      definition,
    });
  }

  onLabelRangeChanged(ranges: string[]) {
    this.state.chart.labelRange = ranges[0];
  }

  getKey(label: string) {
    return label + this.props.figure.id;
  }

  toggleColorPicker() {
    this.state.fillColorTool = !this.state.fillColorTool;
  }

  setColor(color: string) {
    this.state.chart.background = color;
    this.state.fillColorTool = false;
    this.updateChart({ background: this.state.chart.background });
  }

  activate(panel: "configuration" | "design") {
    this.state.panel = panel;
  }

  private initialState(figure: Figure): ChartPanelState {
    return {
      chart: this.env.model.getters.getChartDefinitionUI(
        this.env.model.getters.getActiveSheetId(),
        figure.id
      ),
      panel: "configuration",
      fillColorTool: false,
    };
  }
}
