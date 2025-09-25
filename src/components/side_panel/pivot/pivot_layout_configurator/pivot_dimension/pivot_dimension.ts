import { Component } from "@odoo/owl";
import { PivotCoreDimension, PivotCoreMeasure } from "../../../../..";
import { SpreadsheetChildEnv } from "../../../../../types";
import { TextInput } from "../../../../text_input/text_input";
import { CogWheelMenu } from "../../../components/cog_wheel_menu/cog_wheel_menu";

interface Props {
  dimension: PivotCoreDimension | PivotCoreMeasure;
  onRemoved: (dimension: PivotCoreDimension | PivotCoreMeasure) => void;
  onNameUpdated?: (dimension: PivotCoreDimension | PivotCoreMeasure, name?: string) => void;
  type: "row" | "col" | "measure";
}

export class PivotDimension extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimension";
  static props = {
    dimension: Object,
    onRemoved: { type: Function, optional: true },
    onNameUpdated: { type: Function, optional: true },
    slots: { type: Object, optional: true },
  };
  static components = { CogWheelMenu, TextInput };

  updateName(name: string) {
    this.props.onNameUpdated?.(
      this.props.dimension,
      name === "" || name.startsWith("=") ? undefined : name
    );
  }
}
