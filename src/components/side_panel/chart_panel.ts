import { Component, tags, useState } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR } from "../../constants";
import {
  ChartUIDefinition,
  ChartUIDefinitionUpdate,
  CommandResult,
  DispatchResult,
  Figure,
  SpreadsheetEnv,
  UID,
} from "../../types/index";
import { ColorPicker } from "../color_picker";
import * as icons from "../icons";
import { SelectionInput } from "../selection_input";
import { chartTerms } from "./translations_terms";

<<<<<<< HEAD
const { xml, css } = tags;

const CONFIGURATION_TEMPLATE = xml/* xml */ `
<div>
  <div class="o-section">
    <div class="o-section-title" t-esc="env._t('${chartTerms.ChartType}')"/>
    <select t-model="state.chart.type" class="o-input o-type-selector" t-on-change="updateSelect('type')">
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
                    t-on-selection-changed="onSeriesChanged"
                    t-on-selection-confirmed="updateDataSet" />
    <input type="checkbox" t-model="state.chart.dataSetsHaveTitle" t-on-change="updateDataSet"/><t t-esc="env._t('${chartTerms.MyDataHasTitle}')"/>
  </div>
  <div class="o-section o-data-labels">
    <div class="o-section-title" t-esc="env._t('${chartTerms.DataCategories}')"/>
    <SelectionInput t-key="getKey('label')"
                    ranges="[state.chart.labelRange || '']"
                    isInvalid="isLabelInvalid"
                    hasSingleRange="true"
                    t-on-selection-changed="onLabelRangeChanged"
                    t-on-selection-confirmed="updateLabelRange" />
  </div>
  <div class="o-section o-sidepanel-error" t-if="errorMessages">
    <div t-foreach="errorMessages" t-as="error">
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
      <ColorPicker t-if="state.fillColorTool" t-on-color-picked="setColor" t-key="backgroundColor"/>
    </div>
  </div>
  <div class="o-section o-chart-title">
    <div class="o-section-title" t-esc="env._t('${chartTerms.Title}')"/>
    <input type="text" t-model="state.chart.title" t-on-change="updateTitle" class="o-input" t-att-placeholder="env._t('${chartTerms.TitlePlaceholder}')"/>
  </div>
  <div class="o-section">
    <div class="o-section-title"><t t-esc="env._t('${chartTerms.VerticalAxisPosition}')"/></div>
    <select t-model="state.chart.verticalAxisPosition" class="o-input o-type-selector" t-on-change="updateSelect('verticalAxisPosition')">
      <option value="left" t-esc="env._t('${chartTerms.Left}')"/>
      <option value="right" t-esc="env._t('${chartTerms.Right}')"/>
    </select>
  </div>
  <div class="o-section">
    <div class="o-section-title"><t t-esc="env._t('${chartTerms.LegendPosition}')"/></div>
    <select t-model="state.chart.legendPosition" class="o-input o-type-selector" t-on-change="updateSelect('legendPosition')">
      <option value="top" t-esc="env._t('${chartTerms.Top}')"/>
      <option value="bottom" t-esc="env._t('${chartTerms.Bottom}')"/>
      <option value="left" t-esc="env._t('${chartTerms.Left}')"/>
      <option value="right" t-esc="env._t('${chartTerms.Right}')"/>
    </select>
  </div>
</div>
`;
||||||| parent of 96e69ea5 (temp)
const Component = owl.Component;
const { useState } = owl;
const { xml } = owl.tags;
=======
const Component = owl.Component;
const { useState } = owl;
const { xml, css } = owl.tags;
>>>>>>> 96e69ea5 (temp)

const TEMPLATE = xml/* xml */ `
  <div class="o-chart">
<<<<<<< HEAD
    <div class="o-panel">
      <div class="o-panel-element"
          t-att-class="state.panel !== 'configuration' ? 'inactive' : ''"
          t-on-click="activate('configuration')">
        <i class="fa fa-sliders"/>Configuration
      </div>
      <div class="o-panel-element"
          t-att-class="state.panel !== 'design' ? 'inactive' : ''"
          t-on-click="activate('design')">
        <i class="fa fa-paint-brush"/>Design
      </div>
||||||| parent of 96e69ea5 (temp)
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
=======
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
      <button t-else="" t-on-click="createChart" t-att-class="{ 'o-error': state.errorWhileCreating }" class="o-sidePanelButton" t-esc="env._t('${chartTerms.CreateChart}')"/>
>>>>>>> 96e69ea5 (temp)
    </div>

    <t t-if="state.panel === 'configuration'">
      <t t-call="${CONFIGURATION_TEMPLATE}"/>
    </t>
    <t t-else="">
      <t t-call="${DESIGN_TEMPLATE}"/>
    </t>
  </div>
`;

<<<<<<< HEAD
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

||||||| parent of 96e69ea5 (temp)
=======
const CSS = css/*scss */ `
  .o-chart {
    .o-sidePanelButton.o-error {
      border-color: #e14747;
    }
  }
`;

>>>>>>> 96e69ea5 (temp)
interface Props {
  figure: Figure;
}

interface ChartPanelState {
<<<<<<< HEAD
  chart: ChartUIDefinition;
  datasetDispatchResult?: DispatchResult;
  labelsDispatchResult?: DispatchResult;
  panel: "configuration" | "design";
  fillColorTool: boolean;
||||||| parent of 96e69ea5 (temp)
  type: ChartTypes;
  title: string;
  ranges: string[];
  labelRange: string;
  seriesHasTitle: boolean;
=======
  type: ChartTypes;
  title: string;
  ranges: string[];
  labelRange: string;
  seriesHasTitle: boolean;
  errorWhileCreating: boolean;
>>>>>>> 96e69ea5 (temp)
}

export class ChartPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
<<<<<<< HEAD
  static style = STYLE;
  static components = { SelectionInput, ColorPicker };
||||||| parent of 96e69ea5 (temp)
  static components = { SelectionInput };
=======
  static style = CSS;
  static components = { SelectionInput };
>>>>>>> 96e69ea5 (temp)
  private getters = this.env.getters;

  private chartSheetId: UID = this.findSheetId(this.props.figure.id);

  private state: ChartPanelState = useState(this.initialState(this.props.figure));

  async willUpdateProps(nextProps: Props) {
    if (!this.getters.getChartDefinition(nextProps.figure.id)) {
      this.trigger("close-side-panel");
      return;
    }
    if (nextProps.figure.id !== this.props.figure.id) {
      this.chartSheetId = this.findSheetId(nextProps.figure.id);
      this.state.panel = "configuration";
      this.state.fillColorTool = false;
      this.state.datasetDispatchResult = undefined;
      this.state.labelsDispatchResult = undefined;
      this.state.chart = this.env.getters.getChartDefinitionUI(
        this.chartSheetId,
        nextProps.figure.id
      )!;
    }
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

  onSeriesChanged(ev: CustomEvent) {
    this.state.chart.dataSets = ev.detail.ranges;
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
    return this.env.dispatch("UPDATE_CHART", {
      id: this.props.figure.id,
      sheetId: this.chartSheetId,
      definition,
    });
  }

  onLabelRangeChanged(ev: CustomEvent) {
    this.state.chart.labelRange = ev.detail.ranges[0];
  }

<<<<<<< HEAD
  getKey(label: string) {
    return label + this.props.figure.id;
||||||| parent of 96e69ea5 (temp)
  createChart() {
    this.env.dispatch("CREATE_CHART", {
      sheetId: this.getters.getActiveSheet(),
      id: uuidv4(),
      definition: this.getChartDefinition(),
    });
    this.trigger("close-side-panel");
=======
  createChart() {
    const result = this.env.dispatch("CREATE_CHART", {
      sheetId: this.getters.getActiveSheet(),
      id: uuidv4(),
      definition: this.getChartDefinition(),
    });
    if (result.status === "SUCCESS") {
      this.trigger("close-side-panel");
    } else {
      this.state.errorWhileCreating = true;
    }
>>>>>>> 96e69ea5 (temp)
  }

  toggleColorPicker() {
    this.state.fillColorTool = !this.state.fillColorTool;
  }

  setColor(ev: CustomEvent) {
    this.state.chart.background = ev.detail.color;
    this.state.fillColorTool = false;
    this.updateChart({ background: this.state.chart.background });
  }

  activate(panel: "configuration" | "design") {
    this.state.panel = panel;
  }

  private initialState(figure: Figure): ChartPanelState {
    const sheetId = this.findSheetId(figure.id);
    return {
      chart: this.env.getters.getChartDefinitionUI(sheetId, figure.id)!,
      panel: "configuration",
      fillColorTool: false,
    };
  }
<<<<<<< HEAD
  private findSheetId(figureId: string): string {
    return this.env.getters.getFigureSheetId(figureId) || "";
||||||| parent of 96e69ea5 (temp)

  private initialState(): ChartPanelState {
    const data = this.props.figure ? this.props.figure.data : undefined;
    return {
      title: data && data.title ? data.title : "",
      ranges: data ? data.dataSets.map((ds) => ds.dataRange) : [],
      labelRange: data ? data.labelRange : "",
      type: data ? data.type : "bar",
      seriesHasTitle: data ? data.title !== undefined : false,
    };
=======

  private initialState(): ChartPanelState {
    const data = this.props.figure ? this.props.figure.data : undefined;
    return {
      title: data && data.title ? data.title : "",
      ranges: data ? data.dataSets.map((ds) => ds.dataRange) : [],
      labelRange: data ? data.labelRange : "",
      type: data ? data.type : "bar",
      seriesHasTitle: data ? data.title !== undefined : false,
      errorWhileCreating: false,
    };
>>>>>>> 96e69ea5 (temp)
  }
}
