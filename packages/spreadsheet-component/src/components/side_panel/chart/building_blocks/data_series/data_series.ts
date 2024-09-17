import { Component } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { Color, CustomizedDataSet, SpreadsheetChildEnv } from "../../../../../types";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Section } from "../../../components/section/section";

interface Props {
  ranges: CustomizedDataSet[];
  hasSingleRange?: boolean;
  onSelectionChanged: (ranges: string[]) => void;
  onSelectionConfirmed: () => void;
}

export class ChartDataSeries extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartDataSeries";
  static components = { SelectionInput, Section };
  static props = {
    ranges: Array,
    hasSingleRange: { type: Boolean, optional: true },
    onSelectionChanged: Function,
    onSelectionConfirmed: Function,
  };

  get ranges(): string[] {
    return this.props.ranges.map((r) => r.dataRange);
  }

  get colors(): (Color | undefined)[] {
    return this.props.ranges.map((r) => r.backgroundColor);
  }

  get title() {
    return this.props.hasSingleRange ? _t("Data range") : _t("Data series");
  }
}
