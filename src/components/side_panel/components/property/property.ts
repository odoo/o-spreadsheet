import { Component, xml } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";
import { SelectionInput } from "../../../selection_input/selection_input";
import { Checkbox } from "../checkbox/checkbox";

interface Props {
  property: any;
  update: Function;
}

export class Property extends Component<Props, SpreadsheetChildEnv> {
  static template = xml`<t t-component="component" t-props="componentProps"/>`;

  get component() {
    if (this.props.property.type === "boolean") {
      return Checkbox;
    }
    if (this.props.property.type === "range") {
      return SelectionInput;
    }
    throw new Error("Unknown property type");
  }

  get componentProps() {
    const props = {
      ...this.props.property,
    };
    delete props.type;
    return props;
  }
}
