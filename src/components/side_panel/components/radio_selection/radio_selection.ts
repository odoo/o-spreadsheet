import { Component } from "@odoo/owl";
import { ACTION_COLOR, GRAY_300 } from "../../../../constants";
import { SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers/css";
import { CIRCLE_SVG } from "../../../icons/raw_svgs";

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
        background: url("data:image/svg+xml,${encodeURIComponent(CIRCLE_SVG)}");
        background-color: ${ACTION_COLOR};
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
