import { Component } from "@odoo/owl";
import { ACTION_COLOR, GRAY_300 } from "../../../../constants";
import { SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers/css";

interface Choice {
  value: unknown;
  label: string;
}

interface Props {
  choices: Choice[];
  onChange: (value: unknown) => void;
  selectedValue: string;
  name: string;
  direction: "horizontal" | "vertical";
}

css/* scss */ `
  .o-radio {
    input {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      width: 14px;
      height: 14px;
      border: 1px solid ${GRAY_300};
      box-sizing: border-box;
      outline: none;
      border-radius: 8px;

      &:checked {
        background: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%27-4%20-4%208%208%27%3E%3Ccircle%20r%3D%222%22%20fill%3D%22%23FFF%22/%3E%3C/svg%3E");
        background-color: ${ACTION_COLOR};
        border-color: ${ACTION_COLOR};
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 0.25rem rgba(113, 75, 103, 0.25);
        border-color: ${ACTION_COLOR};
      }
    }
  }
`;

export class RadioSelection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RadioSelection";
  static props = {
    choices: Array,
    onChange: Function,
    selectedValue: { optional: false },
    name: String,
    direction: { type: String, optional: true },
  };
  static defaultProps = {
    direction: "horizontal",
  };
}
