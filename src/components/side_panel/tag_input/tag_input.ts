import { Component } from "@odoo/owl";
import { CellValue, SpreadsheetChildEnv, ValueAndLabel } from "../../../types";
import { AutocompletePopover } from "../autocomplete_popover/autocomplete_popover";

interface Props {
  selectedValues: ValueAndLabel<CellValue>[];
  allValues: ValueAndLabel<CellValue>[];
  onValuesChanged: (values: ValueAndLabel<CellValue>[]) => void;
}

export class TagInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TagInput";
  static props = {
    selectedValues: Array,
    allValues: Array,
    onValuesChanged: Function,
  };

  static components = { AutocompletePopover };

  get values(): ValueAndLabel<CellValue>[] {
    const selectedValuesSet = new Set(this.props.selectedValues.map((v) => v.value));
    return this.props.allValues.filter((value) => !selectedValuesSet.has(value.value));
  }

  onValuePicked(value: string) {
    const selectedValue = this.props.allValues.find((v) => v.value === value);
    if (selectedValue) {
      this.props.onValuesChanged([...this.props.selectedValues, selectedValue]);
    }
  }

  get tags() {
    return this.props.selectedValues.map((value) => ({
      id: value.value,
      text: value.label,
      onDelete: () => {
        this.props.onValuesChanged(
          this.props.selectedValues.filter((v) => v.value !== value.value)
        );
      },
    }));
  }
}
