import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

import { Component } from "../../../../../owl3_compatibility_layer";
interface Props {
  title?: string;
  ranges: string[];
  hasSingleRange?: boolean;
  isInvalid: boolean;
  onSelectionChanged: (ranges: string[]) => void;
  onSelectionConfirmed: () => void;
  onSelectionReordered?: (indexes: number[]) => void;
  class?: string;
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
    hasSingleRange: { type: Boolean, optional: true },
    class: { type: String, optional: true },
    isInvalid: Boolean,
    onSelectionChanged: Function,
    onSelectionConfirmed: Function,
    onSelectionReordered: { type: Function, optional: true },
    options: { type: Array, optional: true },
  };

  static defaultProps: Partial<Props> = {
    title: _t("Categories / Labels"),
    options: [],
  };

  get sectionClass() {
    return "o-data-labels" + (this.props.class ? ` ${this.props.class}` : "");
  }
}
