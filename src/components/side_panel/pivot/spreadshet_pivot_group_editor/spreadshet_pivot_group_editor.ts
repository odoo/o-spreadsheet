import { Component } from "@odoo/owl";
import { SpreadsheetPivot } from "../../../../helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import {
  CellValue,
  PivotCustomGroup,
  SpreadsheetChildEnv,
  UID,
  ValueAndLabel,
} from "../../../../types";
import { TagInput } from "../../tag_input/tag_input";

interface Props {
  pivotId: UID;
  parentField: string;
  group: PivotCustomGroup;
  onUpdateGroupValues: (groupId: string, values: ValueAndLabel<CellValue>[]) => void;
  usedValues: CellValue[];
}

export class SpreadsheetPivotGroupEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetPivotGroupEditor";
  static props = {
    pivotId: String,
    parentField: String,
    group: Object,
    onUpdateGroupValues: Function,
    usedValues: Array,
  };
  static components = { TagInput };

  setup(): void {}

  get selectedValues() {
    return this.props.group.values.map((value) => ({ value, label: value }));
  }

  get allValues() {
    const pivot = this.env.model.getters.getPivot(this.props.pivotId) as SpreadsheetPivot;
    return pivot
      .getPossibleFieldValues(this.props.parentField)
      .filter((value) => !this.props.usedValues.includes(value.value))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
}
