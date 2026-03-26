import { collapseHierarchicalDisplayName } from "../../../../../helpers/pivot/pivot_helpers";
import { PivotDimension as PivotDimensionType, PivotMeasure } from "../../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { TextInput } from "../../../../text_input/text_input";
import { CogWheelMenu } from "../../../components/cog_wheel_menu/cog_wheel_menu";

import { Component } from "../../../../../owl3_compatibility_layer";
interface Props {
  dimension: PivotDimensionType | PivotMeasure;
  onRemoved: (dimension: PivotDimensionType | PivotMeasure) => void;
  onNameUpdated?: (dimension: PivotDimensionType | PivotMeasure, name?: string) => void;
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

  get dimensionDisplayName() {
    const displayName = this.props.dimension.displayName;
    return collapseHierarchicalDisplayName(displayName);
  }
}
