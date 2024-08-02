import { Component } from "@odoo/owl";
import { GRAY_300 } from "../../../../../constants";
import { SpreadsheetChildEnv } from "../../../../../types";
import { css } from "../../../../helpers";
import { TextInput } from "../../../../text_input/text_input";

interface Props {
  dimension: PivotDimension;
  onRemoved: (dimension: PivotDimension) => void;
  onNameUpdated?: (dimension: PivotDimension, name?: string) => void;
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
  static components = { TextInput };

  updateName(name: string) {
    this.props.onNameUpdated?.(
      this.props.dimension,
      name === "" || name.startsWith("=") ? undefined : name
    );
  }
}
