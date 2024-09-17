import { Component } from "@odoo/owl";
import { PivotCoreDimension, PivotCoreMeasure } from "../../../../..";
import { GRAY_300 } from "../../../../../constants";
import { SpreadsheetChildEnv } from "../../../../../types";
import { css } from "../../../../helpers";
import { TextInput } from "../../../../text_input/text_input";
import { CogWheelMenu } from "../../../components/cog_wheel_menu/cog_wheel_menu";

interface Props {
  dimension: PivotCoreDimension | PivotCoreMeasure;
  onRemoved: (dimension: PivotCoreDimension | PivotCoreMeasure) => void;
  onNameUpdated?: (dimension: PivotCoreDimension | PivotCoreMeasure, name?: string) => void;
  type: "row" | "col" | "measure";
}

// don't use bg-white since it's flipped to dark in dark mode and we don't support dark mode
css/* scss */ `
  .pivot-dimension {
    background-color: white;
    border: 1px solid ${GRAY_300};
    border-radius: 4px;

    select.o-input {
      height: inherit;
    }

    select > option {
      background-color: white;
    }

    .pivot-dim-operator-label {
      min-width: 120px;
    }

    &.pivot-dimension-invalid {
      background-color: #ffdddd;
      border-color: red !important;
      select {
        background-color: #ffdddd;
      }
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
  };
  static components = { CogWheelMenu, TextInput };

  updateName(name: string) {
    this.props.onNameUpdated?.(
      this.props.dimension,
      name === "" || name.startsWith("=") ? undefined : name
    );
  }
}
