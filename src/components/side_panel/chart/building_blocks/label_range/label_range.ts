import { Component } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

interface Props {
  title?: string;
  range: string;
  isInvalid: boolean;
  required?: boolean;
  onSelectionChanged: (range: string) => void;
  onSelectionConfirmed: () => void;
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
    range: String,
    isInvalid: Boolean,
    required: { type: Boolean, optional: true },
    onSelectionChanged: Function,
    onSelectionConfirmed: Function,
    options: { type: Array, optional: true },
  };

  static defaultProps: Partial<Props> = {
    title: _t("Categories / Labels"),
    options: [],
    required: false,
  };
}
