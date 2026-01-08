import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useExternalListener, useRef, useState } from "@odoo/owl";
import { ValueAndLabel } from "../../types";
import { getRefBoundingRect, isChildEvent } from "../helpers/dom_helpers";
import { Popover, PopoverProps } from "../popover";

export interface SelectProps {
  class?: string;
  selectedValue?: string;
  values?: ValueAndLabel[];
  onChange: (value: string) => void;
}

export class Select extends Component<SelectProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Select";
  static props = {
    selectedValue: { type: String, optional: true },
    values: Array,
    class: { type: String, optional: true },
    onChange: Function,
  };
  static components = { Popover };

  private selectRef = useRef("selectRef");
  private dropdownRef = useRef("dropdownRef");

  private state = useState({ isPopoverOpen: false });

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });

    useEffect(() => {
      if (this.dropdownRef.el) {
        this.dropdownRef.el.style.width = `${this.selectRef.el?.offsetWidth}px`;
      }
    });
  }

  onMouseDown() {
    this.state.isPopoverOpen = !this.state.isPopoverOpen;
  }

  onExternalClick(ev: MouseEvent) {
    if (!isChildEvent(this.selectRef.el, ev) && !isChildEvent(this.dropdownRef.el, ev)) {
      this.state.isPopoverOpen = false;
    }
  }

  onOptionClick(value: string) {
    this.props.onChange(value);
    this.state.isPopoverOpen = false;
  }

  get popoverProps(): PopoverProps {
    return {
      anchorRect: getRefBoundingRect(this.selectRef),
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  get selectedLabel(): string {
    return this.props.values?.find((v) => v.value === this.props.selectedValue)?.label || "";
  }
}
