import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

interface Props {
  title?: string;
  ranges: string[];
  isInvalid: boolean;
  onSelectionChanged: (ranges: string[]) => void;
  onSelectionConfirmed: () => void;
  maxNumberOfUsedRanges?: number;
  options?: Array<{
    name: string;
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }>;
}

export class ChartLabelRange extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartLabelRange";
  static components = { SelectionInput, Checkbox, Section };
  static props = {
    title: { type: String, optional: true },
    ranges: Array,
    isInvalid: Boolean,
    onSelectionChanged: Function,
    onSelectionConfirmed: Function,
    maxNumberOfUsedRanges: { type: Number, optional: true },
    options: { type: Array, optional: true },
  };

  static defaultProps: Partial<Props> = {
    title: _t("Categories / Labels"),
    options: [],
  };

  get disabledRanges(): boolean[] {
    return this.props.ranges.map((_, i) =>
      this.props.maxNumberOfUsedRanges ? i >= this.props.maxNumberOfUsedRanges : false
    );
  }
}
