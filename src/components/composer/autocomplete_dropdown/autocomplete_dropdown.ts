import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { Component, useEffect, useRef } from "@odoo/owl";
import { AutoCompleteProposal } from "../../../registries/auto_completes";
import { HtmlContent } from "../composer/composer";

interface Props {
  proposals: AutoCompleteProposal[];
  selectedIndex: number | undefined;
  onValueSelected: (proposal: AutoCompleteProposal) => void;
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
      color: html.color,
      background: html.backgroundColor,
    });
  }
}
