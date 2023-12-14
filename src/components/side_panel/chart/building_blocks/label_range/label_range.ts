import { Component } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { SpreadsheetChildEnv } from "../../../../../types";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

interface Props {
  title?: string;
  range: () => string;
  isInvalid: boolean;
  required?: boolean;
  onSelectionChanged: (range: string) => void;
  onSelectionConfirmed: () => void;
  options?: Array<{
    name: string;
    label: string;
    value: boolean;
    update: (value: boolean) => void;
  }>;
}

export class ChartLabelRange extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartLabelRange";
  static components = { SelectionInput, Checkbox, Section };
  static defaultProps: Partial<Props> = {
    title: _t("Categories / Labels"),
    options: [],
    required: false,
  };
}

ChartLabelRange.props = {
  title: { type: String, optional: true },
  range: Function,
  isInvalid: Boolean,
  required: { type: Boolean, optional: true },
  onSelectionChanged: Function,
  onSelectionConfirmed: Function,
  options: { type: Array, optional: true },
};
