import { useState } from "@odoo/owl";
import { ActionSpec } from "../../../../actions/action";
import { canChartParseLabels } from "../../../../helpers/figures/charts/runtime";
import { ScatterChart } from "../../../../helpers/figures/charts/scatter_chart";
import { CommandResult, DispatchResult } from "../../../../types";
import { CustomizedDataSet, LineChartDefinition } from "../../../../types/chart";
import { SelectionInputRowExtension } from "../../../selection_input/selection_input";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

interface ScatterConfigPanelState {
  pointLabelEditors: Record<number, string>;
  pointLabelDispatchResult?: Record<number, DispatchResult>;
}

export class ScatterConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-ScatterConfigPanel";
  static components = {
    ...GenericChartConfigPanel.components,
  };

  protected scatterState = useState<ScatterConfigPanelState>({
    pointLabelEditors: {},
    pointLabelDispatchResult: {},
  });

  setup() {
    super.setup();
    this.resetPointLabelsEditors(this.dataSets);
  }

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.chartId);
    if (chart && chart instanceof ScatterChart) {
      return canChartParseLabels(
        chart.getDefinition(),
        chart.dataSets,
        chart.labelRange,
        this.env.model.getters
      );
    }
    return false;
  }

  onUpdateLabelsAsText(labelsAsText: boolean) {
    this.props.updateChart(this.props.chartId, {
      labelsAsText,
    });
  }

  getLabelRangeOptions() {
    const options = super.getLabelRangeOptions();
    if (this.canTreatLabelsAsText) {
      options.push({
        name: "labelsAsText",
        value: (this.props.definition as LineChartDefinition).labelsAsText,
        label: this.chartTerms.TreatLabelsAsText,
        onChange: this.onUpdateLabelsAsText.bind(this),
      });
    }
    return options;
  }

  get errorMessages(): string[] {
    const baseErrors = super.errorMessages;
    const pointLabelErrors = this.scatterState.pointLabelDispatchResult
      ? Object.entries(this.scatterState.pointLabelDispatchResult)
          .map(([index, result]) => {
            if (result.reasons) {
              return result.reasons
                .filter((reason) => reason !== CommandResult.NoChanges)
                .map((error) => this.chartTerms.Errors[error] || this.chartTerms.Errors.Unexpected);
            }
            return [];
          })
          .flat()
      : [];
    return [...baseErrors, ...pointLabelErrors];
  }

  getDataSeriesMenuItems(index: number): ActionSpec[] {
    const items: ActionSpec[] = [];
    if (this.isPointLabelEditorActive(index)) {
      items.push({
        name: this.chartTerms.PointLabelsMenuRemove,
        execute: () => this.removePointLabelRange(index),
      });
    } else {
      items.push({
        name: this.chartTerms.PointLabelsMenuAdd,
        execute: () => this.enablePointLabelRange(index),
      });
    }
    return items;
  }

  getPointLabelRangeExtensions(index: number): SelectionInputRowExtension[] {
    if (!this.isPointLabelEditorActive(index)) {
      return [];
    }
    const range = this.scatterState.pointLabelEditors[index] ?? "";
    return [
      {
        key: `point-label-${index}`,
        title: this.chartTerms.PointLabels,
        icon: "o-spreadsheet-Icon.LABEL_TAG",
        ranges: [range],
        hasSingleRange: true,
        isInvalid: this.isPointLabelRangeInvalid(index),
        onSelectionChanged: (ranges: string[]) => this.onPointLabelRangeChanged(index, ranges[0]),
        onSelectionConfirmed: () => this.onPointLabelRangeConfirmed(),
      },
    ];
  }

  onPointLabelRangeChanged(index: number, range: string | undefined) {
    if (!this.isPointLabelEditorActive(index)) {
      this.enablePointLabelRange(index);
    }
    this.setPointLabelEditor(index, range || "");
    this.dataSets[index] = { ...this.dataSets[index], pointLabelRange: range };
    if (!this.scatterState.pointLabelDispatchResult) {
      this.scatterState.pointLabelDispatchResult = {};
    }
    this.scatterState.pointLabelDispatchResult[index] = this.props.canUpdateChart(
      this.props.chartId,
      {
        dataSets: this.dataSets,
      }
    );
  }

  onPointLabelRangeConfirmed() {
    const result = this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    if (result.isSuccessful) {
      this.resetPointLabelsEditors(this.dataSets);
    }
  }

  onDataSeriesReordered(indexes: number[]) {
    const reorderedEditors: Record<number, string> = {};
    const currentEditors = this.scatterState.pointLabelEditors;
    indexes.forEach((oldIndex, newIndex) => {
      if (currentEditors[oldIndex] !== undefined) {
        reorderedEditors[newIndex] = currentEditors[oldIndex];
      }
    });
    super.onDataSeriesReordered(indexes);
    this.scatterState.pointLabelEditors = reorderedEditors;
    this.resetPointLabelsEditors(this.dataSets);
  }

  onDataSeriesRemoved(index: number) {
    const currentEditors = this.scatterState.pointLabelEditors;
    const updatedEditors: Record<number, string> = {};
    Object.keys(currentEditors).forEach((key) => {
      const editorIndex = Number(key);
      if (editorIndex === index) {
        return;
      }
      const nextIndex = editorIndex > index ? editorIndex - 1 : editorIndex;
      updatedEditors[nextIndex] = currentEditors[editorIndex];
    });
    super.onDataSeriesRemoved(index);
    this.scatterState.pointLabelEditors = updatedEditors;
    this.resetPointLabelsEditors(this.dataSets);
  }

  onDataSeriesConfirmed() {
    super.onDataSeriesConfirmed();
    this.resetPointLabelsEditors(this.dataSets);
  }

  private enablePointLabelRange(index: number) {
    this.dataSets[index] = { ...this.dataSets[index], pointLabelRange: "" };
    this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    this.setPointLabelEditor(index, this.dataSets[index]?.pointLabelRange || "");
  }

  private removePointLabelRange(index: number) {
    this.dataSets[index] = { ...this.dataSets[index], pointLabelRange: undefined };
    this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    this.setPointLabelEditor(index, undefined);
    delete this.scatterState.pointLabelDispatchResult?.[index];
  }

  private isPointLabelEditorActive(index: number): boolean {
    return this.scatterState.pointLabelEditors[index] !== undefined;
  }

  private isPointLabelRangeInvalid(index: number): boolean {
    return !!this.scatterState.pointLabelDispatchResult?.[index]?.isCancelledBecause(
      CommandResult.InvalidDataSet
    );
  }

  private setPointLabelEditor(index: number, range: string | undefined) {
    if (range === undefined) {
      if (this.scatterState.pointLabelEditors[index] === undefined) {
        return;
      }
      delete this.scatterState.pointLabelEditors[index];
      return;
    }
    this.scatterState.pointLabelEditors = {
      ...this.scatterState.pointLabelEditors,
      [index]: range,
    };
  }

  private resetPointLabelsEditors(dataSets: CustomizedDataSet[]) {
    const currentEditors = this.scatterState.pointLabelEditors;
    const editors: Record<number, string> = {};
    dataSets.forEach((dataSet, index) => {
      if (currentEditors[index] !== undefined || dataSet.pointLabelRange) {
        editors[index] = currentEditors[index] ?? dataSet.pointLabelRange ?? "";
      }
    });
    this.scatterState.pointLabelEditors = editors;
  }
}
