import { Component } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Section } from "../../../components/section/section";

interface Props {
  ranges: string[];
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

  get title() {
    return this.props.hasSingleRange ? _t("Data range") : _t("Data series");
  }
}
