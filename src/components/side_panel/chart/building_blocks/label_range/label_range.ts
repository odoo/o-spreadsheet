import { Component } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

interface Props {
  title?: string;
  ranges: Array<string>;
  isInvalid: boolean;
  onSelectionChanged: (range: string) => void;
  onSelectionConfirmed: () => void;
  options?: Array<{
    name: string;
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }>;
  onSelectionRemoved?: (index: number) => void;
  onSelectionReordered?: (indexes: number[]) => void;
  hasSingleRange?: boolean;
}

export class ChartLabelRange extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartLabelRange";
  static components = { SelectionInput, Checkbox, Section };
  static props = {
    title: { type: String, optional: true },
    ranges: Array<String>,
    isInvalid: Boolean,
    onSelectionChanged: Function,
    onSelectionConfirmed: Function,
    onSelectionRemoved: { type: Function, optional: true },
    onSelectionReordered: { type: Function, optional: true },
    options: { type: Array, optional: true },
    hasSingleRange: { type: Boolean, optional: true },
  };

  static defaultProps: Partial<Props> = {
    title: _t("Categories / Labels"),
    options: [],
  };
}
