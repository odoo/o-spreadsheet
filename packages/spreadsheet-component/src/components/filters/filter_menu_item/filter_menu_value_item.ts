import { Component, onWillPatch, useRef } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";

interface Props {
  value: string;
  isChecked: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseMove: () => void;
  scrolledTo: "top" | "bottom" | undefined;
}

css/*SCSS*/ `
  .o-filter-menu-value {
    padding: 4px;
    line-height: 20px;
    height: 28px;
    .o-filter-menu-value-checked {
      width: 20px;
    }
  }
`;

export class FilterMenuValueItem extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueItem";
  static props = {
    value: String,
    isChecked: Boolean,
    isSelected: Boolean,
    onMouseMove: Function,
    onClick: Function,
    scrolledTo: { type: String, optional: true },
  };

  private itemRef = useRef("menuValueItem");

  setup() {
    onWillPatch(() => {
      if (this.props.scrolledTo) {
        this.scrollListToSelectedValue();
      }
    });
  }

  private scrollListToSelectedValue() {
    if (!this.itemRef.el) {
      return;
    }
    this.itemRef.el.scrollIntoView?.({
      block: this.props.scrolledTo === "bottom" ? "end" : "start",
    });
  }
}
