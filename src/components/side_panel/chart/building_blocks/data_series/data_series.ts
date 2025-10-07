import { Component } from "@odoo/owl";
import { ActionSpec } from "../../../../../actions/action";
import { _t } from "../../../../../translation";
import {
  ChartDatasetOrientation,
  Color,
  CustomizedDataSet,
  SpreadsheetChildEnv,
} from "../../../../../types";
import {
  SelectionInput,
  SelectionInputRowExtension,
} from "../../../../selection_input/selection_input";
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
  getRangeMenuItems?: (index: number) => ActionSpec[] | undefined;
  getRangeExtensions?: (index: number) => SelectionInputRowExtension[] | undefined;
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
    getRangeMenuItems: { type: Function, optional: true },
    getRangeExtensions: { type: Function, optional: true },
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

  getRangeMenuItems(index: number): ActionSpec[] {
    return this.props.getRangeMenuItems?.(index) || [];
  }

  hasMenu(index: number): boolean {
    return this.getRangeMenuItems(index).length > 0;
  }

  getRangeExtensions(index: number): SelectionInputRowExtension[] {
    return this.props.getRangeExtensions?.(index) || [];
  }
}
