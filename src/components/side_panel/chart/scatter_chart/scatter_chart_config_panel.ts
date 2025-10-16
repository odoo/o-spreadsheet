import { useState } from "@odoo/owl";
import { ActionSpec } from "../../../../actions/action";
import { canChartParseLabels } from "../../../../helpers/figures/charts/runtime";
import { ScatterChart } from "../../../../helpers/figures/charts/scatter_chart";
import { CommandResult, DispatchResult } from "../../../../types";
import { LineChartDefinition } from "../../../../types/chart";
import { SelectionInputRowExtension } from "../../../selection_input/selection_input";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

interface ScatterConfigPanelState {
  pointLabelEditors: Record<number, string>;
  pointLabelDispatchResult?: Record<number, DispatchResult>;
  pointSizeEditors: Record<number, string>;
  pointSizeDispatchResult?: Record<number, DispatchResult>;
}

export class ScatterConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-ScatterConfigPanel";
  static components = {
    ...GenericChartConfigPanel.components,
  };

  protected scatterState = useState<ScatterConfigPanelState>({
    pointLabelEditors: {},
    pointLabelDispatchResult: {},
    pointSizeEditors: {},
    pointSizeDispatchResult: {},
  });

  setup() {
    super.setup();
    this.resetEditors();
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
    const pointSizeErrors = this.scatterState.pointSizeDispatchResult
      ? Object.entries(this.scatterState.pointSizeDispatchResult)
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
    return [...baseErrors, ...pointLabelErrors, ...pointSizeErrors];
  }

  getDataSeriesMenuItems(index: number): ActionSpec[] {
    const items: ActionSpec[] = [];
    if (!this.isPointLabelEditorActive(index)) {
      items.push({
        name: this.chartTerms.PointLabelsMenuAdd,
        execute: () => this.enablePointLabelRange(index),
      });
    }
    if (!this.isPointSizeEditorActive(index)) {
      items.push({
        name: this.chartTerms.PointSizeMenuAdd,
        execute: () => this.enablePointSizeRange(index),
      });
    }
    return items;
  }

  getRangeExtensions(index: number): SelectionInputRowExtension[] {
    return [
      ...this.getPointLabelRangeExtensions(index),
      ...this.getPointSizeRangeExtensions(index),
    ];
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
        onRemoveExtension: () => this.removePointLabelRange(index),
        removeLabel: this.chartTerms.PointLabelsMenuRemove,
      },
    ];
  }

  getPointSizeRangeExtensions(index: number): SelectionInputRowExtension[] {
    if (!this.isPointSizeEditorActive(index)) {
      return [];
    }
    const range = this.scatterState.pointSizeEditors[index] ?? "";
    return [
      {
        key: `point-size-${index}`,
        title: this.chartTerms.PointSizesTitle,
        icon: "o-spreadsheet-Icon.POINT_SIZE",
        ranges: [range],
        hasSingleRange: true,
        isInvalid: this.isPointSizeRangeInvalid(index),
        onSelectionChanged: (ranges: string[]) => this.onPointSizeRangeChanged(index, ranges[0]),
        onSelectionConfirmed: () => this.onPointSizeRangeConfirmed(),
        onRemoveExtension: () => this.removePointSizeRange(index),
        removeLabel: this.chartTerms.PointSizeMenuRemove,
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
      this.resetPointLabelsEditors();
    }
  }

  onPointSizeRangeChanged(index: number, range: string | undefined) {
    if (!this.isPointSizeEditorActive(index)) {
      this.enablePointSizeRange(index);
    }
    this.setPointSizeEditor(index, range || "");
    this.dataSets[index] = {
      ...this.dataSets[index],
      pointSizeRange: range,
      pointSizeMode: "range",
    };
    if (!this.scatterState.pointSizeDispatchResult) {
      this.scatterState.pointSizeDispatchResult = {};
    }
    this.scatterState.pointSizeDispatchResult[index] = this.props.canUpdateChart(
      this.props.chartId,
      {
        dataSets: this.dataSets,
      }
    );
  }

  onPointSizeRangeConfirmed() {
    const result = this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    if (result.isSuccessful) {
      this.resetPointSizeEditors();
    }
  }

  onDataSeriesReordered(indexes: number[]) {
    const reorderedLabelEditors: Record<number, string> = {};
    const currentLabelEditors = this.scatterState.pointLabelEditors;
    const reorderedSizeEditors: Record<number, string> = {};
    const currentSizeEditors = this.scatterState.pointSizeEditors;
    indexes.forEach((oldIndex, newIndex) => {
      if (currentLabelEditors[oldIndex] !== undefined) {
        reorderedLabelEditors[newIndex] = currentLabelEditors[oldIndex];
      }
      if (currentSizeEditors[oldIndex] !== undefined) {
        reorderedSizeEditors[newIndex] = currentSizeEditors[oldIndex];
      }
    });
    super.onDataSeriesReordered(indexes);
    this.scatterState.pointLabelEditors = reorderedLabelEditors;
    this.scatterState.pointSizeEditors = reorderedSizeEditors;
    this.resetEditors();
  }

  onDataSeriesRemoved(index: number) {
    const currentLabelEditors = this.scatterState.pointLabelEditors;
    const updatedPointEditors: Record<number, string> = {};
    const currentSizeEditors = this.scatterState.pointSizeEditors;
    const updatedSizeEditors: Record<number, string> = {};
    Object.keys(currentLabelEditors).forEach((key) => {
      const editorIndex = Number(key);
      if (editorIndex === index) {
        return;
      }
      const nextIndex = editorIndex > index ? editorIndex - 1 : editorIndex;
      updatedPointEditors[nextIndex] = currentLabelEditors[editorIndex];
    });
    Object.keys(currentSizeEditors).forEach((key) => {
      const editorIndex = Number(key);
      if (editorIndex === index) {
        return;
      }
      const nextIndex = editorIndex > index ? editorIndex - 1 : editorIndex;
      updatedSizeEditors[nextIndex] = currentSizeEditors[editorIndex];
    });
    super.onDataSeriesRemoved(index);
    this.scatterState.pointLabelEditors = updatedPointEditors;
    this.scatterState.pointSizeEditors = updatedSizeEditors;
    this.resetEditors();
  }

  onDataSeriesConfirmed() {
    super.onDataSeriesConfirmed();
    this.resetEditors();
  }

  private enablePointLabelRange(index: number) {
    this.dataSets[index] = { ...this.dataSets[index], pointLabelRange: "" };
    this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    this.setPointLabelEditor(index, this.dataSets[index]?.pointLabelRange || "");
  }

  private enablePointSizeRange(index: number) {
    this.dataSets[index] = {
      ...this.dataSets[index],
      pointSizeRange: "",
      pointSizeMode: "range",
    };
    this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    this.setPointSizeEditor(index, this.dataSets[index]?.pointSizeRange || "");
  }

  private removePointLabelRange(index: number) {
    this.dataSets[index] = { ...this.dataSets[index], pointLabelRange: undefined };
    this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    this.setPointLabelEditor(index, undefined);
    delete this.scatterState.pointLabelDispatchResult?.[index];
  }

  private removePointSizeRange(index: number) {
    this.dataSets[index] = {
      ...this.dataSets[index],
      pointSizeRange: undefined,
      pointSizeMode:
        this.dataSets[index]?.pointSizeMode === "range"
          ? "fixed"
          : this.dataSets[index]?.pointSizeMode,
    };
    this.props.updateChart(this.props.chartId, {
      dataSets: this.dataSets,
    });
    this.setPointSizeEditor(index, undefined);
    delete this.scatterState.pointSizeDispatchResult?.[index];
  }

  private isPointLabelEditorActive(index: number): boolean {
    return this.scatterState.pointLabelEditors[index] !== undefined;
  }

  private isPointSizeEditorActive(index: number): boolean {
    return this.scatterState.pointSizeEditors[index] !== undefined;
  }

  private isPointLabelRangeInvalid(index: number): boolean {
    return !!this.scatterState.pointLabelDispatchResult?.[index]?.isCancelledBecause(
      CommandResult.InvalidDataSet
    );
  }

  private isPointSizeRangeInvalid(index: number): boolean {
    return !!this.scatterState.pointSizeDispatchResult?.[index]?.isCancelledBecause(
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

  private setPointSizeEditor(index: number, range: string | undefined) {
    if (range === undefined) {
      if (this.scatterState.pointSizeEditors[index] === undefined) {
        return;
      }
      delete this.scatterState.pointSizeEditors[index];
      return;
    }
    this.scatterState.pointSizeEditors = {
      ...this.scatterState.pointSizeEditors,
      [index]: range,
    };
  }

  private resetEditors() {
    this.resetPointLabelsEditors();
    this.resetPointSizeEditors();
  }

  private resetPointLabelsEditors() {
    const currentEditors = this.scatterState.pointLabelEditors;
    const editors: Record<number, string> = {};
    this.dataSets.forEach(({ pointLabelRange }, index) => {
      if (currentEditors[index] !== undefined || pointLabelRange) {
        editors[index] = currentEditors[index] ?? pointLabelRange ?? "";
      }
    });
    this.scatterState.pointLabelEditors = editors;
  }

  private resetPointSizeEditors() {
    const currentEditors = this.scatterState.pointSizeEditors;
    const editors: Record<number, string> = {};
    this.dataSets.forEach(({ pointSizeRange }, index) => {
      if (currentEditors[index] !== undefined || pointSizeRange) {
        editors[index] = currentEditors[index] ?? pointSizeRange ?? "";
      }
    });
    this.scatterState.pointSizeEditors = editors;
  }
}
