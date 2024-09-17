import { Component } from "@odoo/owl";
import { ACTION_COLOR, BADGE_SELECTED_COLOR, GRAY_900 } from "../../../../constants";
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
}

css/* scss */ `
  .o-badge-selection {
    gap: 1px;
    button.o-button {
      border-radius: 0;
      &.selected {
        color: ${GRAY_900};
        border-color: ${ACTION_COLOR};
        background: ${BADGE_SELECTED_COLOR};
        font-weight: 600;
      }

      &:first-child {
        border-radius: 4px 0 0 4px;
      }
      &:last-child {
        border-radius: 0 4px 4px 0;
      }
    }
  }
`;

export class BadgeSelection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.BadgeSelection";
  static props = {
    choices: Array,
    onChange: Function,
    selectedValue: String,
  };
}
