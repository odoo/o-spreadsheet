import { props } from "@odoo/owl";
import { collapseHierarchicalDisplayName } from "../../../../../helpers/pivot/pivot_helpers";
import {
  PivotDimension as PivotDimensionType,
  PivotFilter,
  PivotMeasure,
} from "../../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { TextInput } from "../../../../text_input/text_input";
import { CogWheelMenu } from "../../../components/cog_wheel_menu/cog_wheel_menu";

import { Component } from "../../../../../owl3_compatibility_layer";

export class PivotDimension extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimension";
  protected props = props({
    dimension: types.or([types.PivotDimension(), types.PivotMeasure(), types.PivotFilter()]),
    "onRemoved?":
      types.function<(dimension: PivotDimensionType | PivotMeasure | PivotFilter) => void>(),
    "onNameUpdated?":
      types.function<
        (dimension: PivotDimensionType | PivotMeasure | PivotFilter, name?: string) => void
      >(),
    "type?": types.or([
      types.literal("row"),
      types.literal("col"),
      types.literal("measure"),
      types.literal("filter"),
    ]),
  });
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
