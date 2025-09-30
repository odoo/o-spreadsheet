import { Color } from "@odoo/o-spreadsheet-engine";
import { Component } from "@odoo/owl";
import { _t } from "../../../../../translation";
import {
  ChartDatasetOrientation,
  CustomizedDataSet,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Section } from "../../../components/section/section";

interface Props {
  ranges: CustomizedDataSet[];
  hasSingleRange?: boolean;
  onSelectionChanged: (ranges: string[]) => void;
  onSelectionReordered?: (indexes: number[]) => void;
  onSelectionRemoved?: (index: number) => void;
  onSelectionConfirmed: () => void;
  maxNumberOfUsedRanges?: number;
  title?: string;
  datasetOrientation?: ChartDatasetOrientation;
  canChangeDatasetOrientation?: boolean;
  onFlipAxis?: (structure: string) => void;
}

export class ChartDataSeries extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartDataSeries";
  static components = { SelectionInput, Section };
  static props = {
    ranges: Array,
    hasSingleRange: { type: Boolean, optional: true },
    onSelectionChanged: Function,
    onSelectionReordered: { type: Function, optional: true },
    onSelectionRemoved: { type: Function, optional: true },
    onSelectionConfirmed: Function,
    title: { type: String, optional: true },
    maxNumberOfUsedRanges: { type: Number, optional: true },
    datasetOrientation: { type: String, optional: true },
    canChangeDatasetOrientation: { type: Boolean, optional: true },
    onFlipAxis: { type: Function, optional: true },
  };

  get ranges(): string[] {
    return this.props.ranges.map((r) => r.dataRange);
  }

  get disabledRanges(): boolean[] {
    return this.props.ranges.map((r, i) =>
      this.props.maxNumberOfUsedRanges ? i >= this.props.maxNumberOfUsedRanges : false
    );
  }

  get colors(): (Color | undefined)[] {
    return this.props.ranges.map((r) => r.backgroundColor);
  }

  get title() {
    if (this.props.title) {
      return this.props.title;
    }
    return this.props.hasSingleRange ? _t("Data range") : _t("Data series");
  }
}
