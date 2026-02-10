import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { PivotCoreDimension, PivotCoreFilter, PivotCoreMeasure } from "../../../../..";
import { TextInput } from "../../../../text_input/text_input";
import { CogWheelMenu } from "../../../components/cog_wheel_menu/cog_wheel_menu";

interface Props {
  dimension: PivotCoreDimension | PivotCoreMeasure | PivotCoreFilter;
  onRemoved: (dimension: PivotCoreDimension | PivotCoreMeasure | PivotCoreFilter) => void;
  onNameUpdated?: (
    dimension: PivotCoreDimension | PivotCoreMeasure | PivotCoreFilter,
    name?: string
  ) => void;
  type: "row" | "col" | "measure" | "filter";
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
