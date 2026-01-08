import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useExternalListener, useRef, useState } from "@odoo/owl";
import { ValueAndLabel } from "../../types";
import { getRefBoundingRect, isChildEvent } from "../helpers/dom_helpers";
import { Popover, PopoverProps } from "../popover/popover";

export interface SelectProps {
  onChange: (value: string) => void;
  values: ValueAndLabel[];
  selectedValue?: string;
  class?: string;
  popoverClass?: string;
  name?: string;
}

interface State {
  isPopoverOpen: boolean;
  hoveredValue: string | undefined;
}

export class Select extends Component<SelectProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Select";
  static props = {
    onChange: Function,
    values: Array,
    selectedValue: { type: String, optional: true },
    class: { type: String, optional: true },
    popoverClass: { type: String, optional: true },
    name: { type: String, optional: true },
  };
  static components = { Popover };

  private selectRef = useRef("selectRef");
  private dropdownRef = useRef("dropdownRef");

  private state = useState<State>({ isPopoverOpen: false, hoveredValue: undefined });

  setup() {
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });

    useEffect(() => {
      if (this.dropdownRef.el) {
        this.dropdownRef.el.style.width = `${this.selectRef.el?.offsetWidth}px`;
      }
    });
  }

  onMouseDown() {
    this.toggleDropdown();
  }

  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.stopPropagation();
      ev.preventDefault();
      if (!this.state.isPopoverOpen) {
        this.toggleDropdown();
        return;
      }
      if (
        this.state.hoveredValue !== undefined &&
        this.state.hoveredValue !== this.props.selectedValue
      ) {
        this.props.onChange(this.state.hoveredValue);
      }
      this.closeDropdown();
    } else if (ev.key === "ArrowDown") {
      ev.stopPropagation();
      ev.preventDefault();
      if (!this.state.isPopoverOpen) {
        this.toggleDropdown();
        this.navigateToNextOption(undefined);
      } else {
        this.navigateToNextOption(this.activeValue);
      }
    } else if (ev.key === "ArrowUp") {
      ev.stopPropagation();
      ev.preventDefault();
      if (!this.state.isPopoverOpen) {
        this.toggleDropdown();
        this.navigateToPreviousOption(undefined);
      } else {
        this.navigateToPreviousOption(this.activeValue);
      }
    } else if (ev.key === "Escape") {
      ev.stopPropagation();
      ev.preventDefault();
      this.closeDropdown();
    }
  }

  onExternalClick(ev: MouseEvent) {
    if (!isChildEvent(this.selectRef.el, ev) && !isChildEvent(this.dropdownRef.el, ev)) {
      this.closeDropdown();
    }
  }

  onOptionClick(value: string) {
    if (value !== this.props.selectedValue) {
      this.props.onChange(value);
    }
    this.closeDropdown();
  }

  toggleDropdown() {
    if (this.state.isPopoverOpen) {
      this.closeDropdown();
    } else {
      this.state.isPopoverOpen = true;
    }
  }

  private closeDropdown() {
    this.state.isPopoverOpen = false;
    this.state.hoveredValue = undefined;
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

  onOptionHover(value: string) {
    this.state.hoveredValue = value;
  }

  get activeValue(): string | undefined {
    return this.state.hoveredValue !== undefined
      ? this.state.hoveredValue
      : this.props.selectedValue;
  }

  private navigateToNextOption(currentValue: string | undefined) {
    const currentIndex = this.props.values.findIndex((v) => v.value === currentValue);
    if (currentIndex === -1) {
      this.state.hoveredValue = this.props.values[0]?.value;
      return;
    }
    const nextIndex = Math.min(currentIndex + 1, this.props.values.length - 1);
    this.state.hoveredValue = this.props.values[nextIndex]?.value;
  }

  private navigateToPreviousOption(currentValue: string | undefined) {
    const currentIndex = this.props.values.findIndex((v) => v.value === currentValue);
    if (currentIndex === -1) {
      this.state.hoveredValue = this.props.values.at(-1)?.value;
      return;
    }
    const previousIndex = Math.max(currentIndex - 1, 0);
    this.state.hoveredValue = this.props.values[previousIndex]?.value;
  }
}
