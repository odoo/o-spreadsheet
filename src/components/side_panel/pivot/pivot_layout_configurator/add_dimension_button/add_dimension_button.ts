import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, ValueAndLabel } from "../../../../../types";
import { PivotField } from "../../../../../types/pivot";
import { css } from "../../../../helpers";
import { Popover } from "../../../../popover";
import { AutocompletePopover } from "../../../autocomplete_popover/autocomplete_popover";

interface Props {
  onFieldPicked: (field: string) => void;
  fields: PivotField[];
}

css/* scss */ `
  .add-dimension.o-button {
    padding: 2px 7px;
    font-weight: 400;
    font-size: 12px;
    flex-grow: 0;
    height: inherit;
  }
`;

export class AddDimensionButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-AddDimensionButton";
  static components = { Popover, AutocompletePopover };
  static props = {
    onFieldPicked: Function,
    fields: Array,
    slots: { type: Object, optional: true },
  };

  get values(): ValueAndLabel[] {
    return this.props.fields.map((field) => ({
      value: field.name,
      label: field.string,
    }));
  }

  onValuePicked(value: string) {
    const field = this.props.fields.find((field) => field.name === value);
    if (field) {
      this.props.onFieldPicked(field.name);
    }
  }

  pickField(field: PivotField) {
    this.props.onFieldPicked(field.name);
  }
}
