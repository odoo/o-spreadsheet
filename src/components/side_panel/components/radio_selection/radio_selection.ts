import { Component } from "@odoo/owl";
import { ACTION_COLOR, GRAY_300 } from "../../../../constants";
import { SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers/css";

interface Choice {
  value: string;
  label: string;
}

interface Props {
  choices: Choice[];
  onChange: (value: string) => void;
  selectedValue: string;
  name: string;
}

const CIRCLE_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'>
  <circle r="2" fill="#FFF"/>
</svg>
`;

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
    selectedValue: String,
    name: String,
  };

  onChange(ev: InputEvent) {
    const value = (ev.target as HTMLInputElement).value;
    this.props.onChange(value);
  }
}
