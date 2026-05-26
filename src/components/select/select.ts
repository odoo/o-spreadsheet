import { props, proxy, signal } from "@odoo/owl";
import { Component, useExternalListener, useLayoutEffect } from "../../owl3_compatibility_layer";
import { ValueAndLabel } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { getElBoundingRect, isChildEvent } from "../helpers/dom_helpers";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

interface State {
  isPopoverOpen: boolean;
  hoveredValue: string | undefined;
}

export class Select extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Select";
  static components = { Popover };

  protected props = props({
    onChange: types.function<[value: string]>([types.string()]),
    values: types.array() as ValueAndLabel[],
    "selectedValue?": types.string(),
    "class?": types.string(),
    "popoverClass?": types.string(),
    "name?": types.string(),
    "title?": types.string(),
  });

  private selectRef = signal<HTMLElement | null>(null);
  private dropdownRef = signal<HTMLElement | null>(null);

  private state = proxy<State>({ isPopoverOpen: false, hoveredValue: undefined });

  setup() {
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });

    useLayoutEffect(() => {
      const el = this.dropdownRef();
      if (el) {
        el.style.width = `${this.selectRef()?.offsetWidth}px`;
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
    if (!isChildEvent(this.selectRef(), ev) && !isChildEvent(this.dropdownRef(), ev)) {
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

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: getElBoundingRect(this.selectRef()),
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
