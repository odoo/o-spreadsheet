import { Component } from "@odoo/owl";
import { css } from "../../helpers/css";
import { AutocompleteValue } from "../composer/composer";

css/* scss */ `
  .o-autocomplete-dropdown {
    pointer-events: auto;
    background-color: #fff;
    & > div:hover {
      background-color: #f2f2f2;
    }
    .o-autocomplete-value-focus {
      background-color: rgba(0, 0, 0, 0.08);
    }

    & > div {
      padding: 1px 0 5px 5px;
      .o-autocomplete-description {
        padding-left: 5px;
        font-size: 11px;
      }
    }
  }
`;

interface Props {
  values: AutocompleteValue[];
  selectedIndex: number;
  onValueSelected: (value: string) => void;
}

export class TextValueProvider extends Component<Props> {
  static template = "o-spreadsheet-TextValueProvider";
}

TextValueProvider.props = {
  values: Array,
  selectedIndex: Number,
  onValueSelected: Function,
};
