import { signal, useEffect } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { AutoCompleteProposal } from "../../../registries/auto_completes/auto_complete_registry";
import { cssPropertiesToCss } from "../../helpers/css";
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
  autoCompleteListRef = signal<HTMLElement | null>(null);

  setup() {
    useEffect(() => {
      const selectedIndex = this.props.selectedIndex;
      if (selectedIndex === undefined) {
        return;
      }
      const el = this.autoCompleteListRef();
      const selectedElement = el?.children[selectedIndex];
      selectedElement?.scrollIntoView?.({ block: "nearest" });
    });
  }

  getCss(html: HtmlContent) {
    return cssPropertiesToCss({
      color: html.color,
      background: html.backgroundColor,
    });
  }
}
