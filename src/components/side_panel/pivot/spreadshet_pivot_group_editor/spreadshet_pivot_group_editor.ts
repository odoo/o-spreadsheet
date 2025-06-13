import { Component } from "@odoo/owl";
import { SpreadsheetPivot } from "../../../../helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import { PivotCustomGroup, SpreadsheetChildEnv, UID } from "../../../../types";
import { Section } from "../../components/section/section";
import { TagInput } from "../../tag_input/tag_input";

interface Props {
  pivotId: UID;
  parentField: string;
  group: PivotCustomGroup;
  onUpdateGroupValues: (groupId: string, values: string[]) => void;
}

export class SpreadsheetPivotGroupEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetPivotGroupEditor";
  static props = {
    pivotId: String,
    parentField: String,
    group: Object,
    onUpdateGroupValues: Function,
  };
  static components = { Section, TagInput };

  setup(): void {}

  get selectedValues() {
    return this.props.group.values.map((value) => ({ value, label: value }));
  }

  get allValues() {
    const pivot = this.env.model.getters.getPivot(this.props.pivotId) as SpreadsheetPivot;
    return pivot.getPossibleFieldValues2(this.props.parentField);
  }
}
