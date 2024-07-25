import { Component } from "@odoo/owl";
import { PivotCoreDimension, PivotCoreMeasure, SpreadsheetChildEnv } from "../../../../..";
import { _t } from "../../../../../translation";
import { css } from "../../../../helpers";
import { TextInput } from "../../../../text_input/text_input";
import { CogWheelMenu } from "../../../components/cog_wheel_menu/cog_wheel_menu";

interface Props {
  dimension: PivotCoreDimension | PivotCoreMeasure;
  onRemoved: (dimension: PivotCoreDimension | PivotCoreMeasure) => void;
  onNameUpdated?: (dimension: PivotCoreDimension | PivotCoreMeasure, name?: string) => void;
  pivotId: string;
  type: "row" | "col" | "measure";
}

// don't use bg-white since it's flipped to dark in dark mode and we don't support dark mode
css/* scss */ `
  .pivot-dimension {
    background-color: white;

    select > option {
      background-color: white;
    }

    .pivot-dim-operator-label {
      min-width: 120px;
    }
  }
`;

export class PivotDimension extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimension";
  static props = {
    dimension: Object,
    onRemoved: { type: Function, optional: true },
    onNameUpdated: { type: Function, optional: true },
    slots: { type: Object, optional: true },
    pivotId: String,
    type: String,
  };
  static components = { CogWheelMenu, TextInput };

  updateName(name: string) {
    this.props.onNameUpdated?.(
      this.props.dimension,
      name === "" || name.startsWith("=") ? undefined : name
    );
  }

  get cogWheelMenuItems() {
    return [
      {
        name: _t("Show values as"),
        icon: "fa-info-circle",
        onClick: () => {
          const measure = this.env.model.getters
            .getPivot(this.props.pivotId)
            .getMeasure((this.props.dimension as PivotCoreMeasure).id);
          this.env.openSidePanel("PivotMeasureDisplayPanel", {
            pivotId: this.props.pivotId,
            measure,
          });
        },
      },
    ];
  }
}
