import { Component, useEffect, useRef } from "@odoo/owl";
import { AutoCompleteProposal } from "../../../registries/auto_completes";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { HtmlContent } from "../composer/composer";

css/* scss */ `
  .o-autocomplete-dropdown {
    pointer-events: auto;
    cursor: pointer;
    background-color: #fff;
    max-width: 400px;
    z-index: 1;

    .o-autocomplete-value-focus {
      background-color: #f2f2f2;
    }

    & > div {
      padding: 1px 5px 5px 5px;
      .o-autocomplete-description {
        padding-left: 5px;
        font-size: 11px;
      }
    }
  }
`;

interface Props {
  proposals: AutoCompleteProposal[];
  selectedIndex: number | undefined;
  onValueSelected: (value: string) => void;
  onValueHovered: (index: string) => void;
}

export class TextValueProvider extends Component<Props> {
  static template = "o-spreadsheet-TextValueProvider";
  static props = {
    proposals: Array,
    selectedIndex: { type: Number, optional: true },
    onValueSelected: Function,
    onValueHovered: Function,
  };
  private autoCompleteListRef = useRef("autoCompleteList");

  setup() {
    useEffect(
      () => {
        const selectedIndex = this.props.selectedIndex;
        if (selectedIndex === undefined) {
          return;
        }
        const selectedElement = this.autoCompleteListRef.el?.children[selectedIndex];
        selectedElement?.scrollIntoView?.({ block: "nearest" });
      },
      () => [this.props.selectedIndex, this.autoCompleteListRef.el]
    );
  }

  getCss(html: HtmlContent) {
    return cssPropertiesToCss({
      color: html.color || "#000000",
      background: html.backgroundColor,
    });
  }
}
