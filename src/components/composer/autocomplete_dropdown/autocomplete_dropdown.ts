import { props, signal, useEffect } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { AutoCompleteProposal } from "../../../registries/auto_completes/auto_complete_registry";
import { cssPropertiesToCss } from "../../helpers/css";
import { types } from "../../props_validation";
import { HtmlContent } from "../composer/composer";

export class TextValueProvider extends Component<any> {
  static template = "o-spreadsheet-TextValueProvider";

  protected props = props({
    proposals: types.array(types.AutoCompleteProposal()),
    selectedIndex: types.number().optional(),
    onValueSelected: types.function<(proposal: AutoCompleteProposal) => void>(),
    onValueHovered: types.function<(index: string) => void>(),
  });
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
