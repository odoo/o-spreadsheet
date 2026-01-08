import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useExternalListener, useRef, useState } from "@odoo/owl";
import { ValueAndLabel } from "../../types";
import { getRefBoundingRect, isChildEvent } from "../helpers/dom_helpers";
import { Popover, PopoverProps } from "../popover";

export interface SelectProps {
  onChange: (value: string) => void;
  values: ValueAndLabel[];
  selectedValue?: string;
  class?: string;
  name?: string;
}

export class Select extends Component<SelectProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Select";
  static props = {
    onChange: Function,
    values: Array,
    selectedValue: { type: String, optional: true },
    class: { type: String, optional: true },
    name: { type: String, optional: true },
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
    if (value !== this.props.selectedValue) {
      this.props.onChange(value);
    }
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
