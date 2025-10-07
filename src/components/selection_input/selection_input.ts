import { Component, onWillUpdateProps, useEffect, useRef, useState } from "@odoo/owl";
import { ActionSpec } from "../../actions/action";
import { deepEquals, range } from "../../helpers";
import { Store, useLocalStore } from "../../store_engine";
import { Color, SpreadsheetChildEnv } from "../../types";
import { cssPropertiesToCss } from "../helpers/css";
import { useDragAndDropListItems } from "../helpers/drag_and_drop_dom_items_hook";
import { updateSelectionWithArrowKeys } from "../helpers/selection_helpers";
import { CogWheelMenu } from "../side_panel/components/cog_wheel_menu/cog_wheel_menu";
import { RangeInputValue, SelectionInputStore } from "./selection_input_store";

interface Props {
  ranges: string[];
  hasSingleRange?: boolean;
  required?: boolean;
  isInvalid?: boolean;
  class?: string;
  onSelectionChanged?: (ranges: string[]) => void;
  onSelectionReordered?: (indexes: number[]) => void;
  onSelectionRemoved?: (index: number) => void;
  onSelectionConfirmed?: () => void;
  colors?: Color[];
  disabledRanges?: boolean[];
  disabledRangeTitle?: string;
  getRowMenuItems?: (index: number) => ActionSpec[] | undefined;
  getRowExtensions?: (index: number) => SelectionInputRowExtension[] | undefined;
}

type SelectionRangeEditMode = "select-range" | "text-edit";

interface State {
  isMissing: boolean;
  mode: SelectionRangeEditMode;
}

interface SelectionRange extends Omit<RangeInputValue, "color"> {
  isFocused: boolean;
  isValidRange: boolean;
  color?: Color;
  disabled?: boolean;
}

export interface SelectionInputRowExtension {
  key: string;
  title?: string;
  icon?: string;
  ranges: string[];
  hasSingleRange?: boolean;
  isInvalid?: boolean;
  onSelectionChanged?: (ranges: string[]) => void;
  onSelectionConfirmed?: () => void;
  onSelectionRemoved?: (index: number) => void;
}
/**
 * This component can be used when the user needs to input some
 * ranges. He can either input the ranges with the regular DOM `<input/>`
 * displayed or by selecting zones on the grid.
 *
 * onSelectionChanged is called every time the input value
 * changes.
 */
export class SelectionInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SelectionInput";
  static props = {
    ranges: Array,
    hasSingleRange: { type: Boolean, optional: true },
    required: { type: Boolean, optional: true },
    isInvalid: { type: Boolean, optional: true },
    class: { type: String, optional: true },
    onSelectionChanged: { type: Function, optional: true },
    onSelectionConfirmed: { type: Function, optional: true },
    onSelectionReordered: { type: Function, optional: true },
    onSelectionRemoved: { type: Function, optional: true },
    colors: { type: Array, optional: true, default: [] },
    disabledRanges: { type: Array, optional: true, default: [] },
    disabledRangeTitle: { type: String, optional: true },
    getRowMenuItems: { type: Function, optional: true },
    getRowExtensions: { type: Function, optional: true },
  };
  static components = { CogWheelMenu, SelectionInput };
  private state: State = useState({
    isMissing: false,
    mode: "select-range",
  });
  private dragAndDrop = useDragAndDropListItems();
  private focusedInput = useRef("focusedInput");
  private selectionRef = useRef("o-selection");
  private store!: Store<SelectionInputStore>;

  get ranges(): SelectionRange[] {
    return this.store.selectionInputs;
  }

  get canAddRange(): boolean {
    return !this.props.hasSingleRange;
  }

  get isInvalid(): boolean {
    return this.props.isInvalid || this.state.isMissing;
  }

  get isConfirmable(): boolean {
    return this.store.isConfirmable;
  }

  get isResettable(): boolean {
    return this.store.isResettable;
  }

  get hasDisabledRanges(): boolean {
    return this.store.disabledRanges.some(Boolean);
  }

  getRowMenuItems(index: number): ActionSpec[] {
    return this.props.getRowMenuItems?.(index) || [];
  }

  hasMenu(index: number): boolean {
    return this.getRowMenuItems(index).length > 0;
  }

  getRowExtensions(index: number): SelectionInputRowExtension[] {
    return this.props.getRowExtensions?.(index) || [];
  }

  setup() {
    useEffect(
      () => this.focusedInput.el?.focus(),
      () => [this.focusedInput.el]
    );
    this.store = useLocalStore(
      SelectionInputStore,
      this.props.ranges,
      this.props.hasSingleRange || false,
      this.props.colors,
      this.props.disabledRanges
    );
    onWillUpdateProps((nextProps) => {
      if (nextProps.ranges.join() !== this.store.selectionInputValues.join()) {
        this.triggerChange();
      }
      if (
        nextProps.ranges.join() !== this.props.ranges.join() &&
        nextProps.ranges.join() !== this.store.selectionInputValues.join()
      ) {
        this.store.resetWithRanges(nextProps.ranges);
      }
      if (
        nextProps.colors?.join() !== this.props.colors?.join() &&
        nextProps.colors?.join() !== this.store.colors.join()
      ) {
        this.store.updateColors(nextProps.colors || []);
      }
      if (
        !deepEquals(nextProps.disabledRanges, this.props.disabledRanges) &&
        !deepEquals(nextProps.disabledRanges, this.store.disabledRanges)
      ) {
        this.store.updateDisabledRanges(nextProps.disabledRanges || []);
      }
    });
  }

  startDragAndDrop(rangeId: number, event: MouseEvent) {
    if (event.button !== 0 || (event.target as HTMLElement).tagName === "SELECT") {
      return;
    }

    const rects = this.getRangeElementsRects();
    const draggableIds = this.ranges.map((range) => range.id);
    const draggableItems = draggableIds.map((id, index) => ({
      id: id.toString(),
      size: rects[index].height,
      position: rects[index].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: rangeId.toString(),
      initialMousePosition: event.clientY,
      items: draggableItems,
      scrollableContainerEl: this.selectionRef.el!,
      onDragEnd: (dimensionName, finalIndex) => {
        const originalIndex = draggableIds.findIndex((id) => id === rangeId);
        if (originalIndex === finalIndex) {
          return;
        }
        const indexes = range(0, draggableIds.length);
        indexes.splice(originalIndex, 1);
        indexes.splice(finalIndex, 0, originalIndex);
        this.props.onSelectionReordered?.(indexes);
        this.props.onSelectionConfirmed?.();
        this.store.confirm();
      },
    });
  }

  getRangeElementsRects() {
    return Array.from(this.selectionRef.el!.children).map((el) => el.getBoundingClientRect());
  }

  getColor(range: SelectionRange) {
    if (!range.color) {
      return "";
    }
    return cssPropertiesToCss({ color: range.color });
  }

  private triggerChange() {
    const ranges = this.store.selectionInputValues;
    this.props.onSelectionChanged?.(ranges);
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "F2") {
      ev.preventDefault();
      ev.stopPropagation();
      this.state.mode = this.state.mode === "select-range" ? "text-edit" : "select-range";
    } else if (ev.key.startsWith("Arrow")) {
      ev.stopPropagation();
      if (this.state.mode === "select-range") {
        ev.preventDefault();
        updateSelectionWithArrowKeys(ev, this.env.model.selection);
      }
    } else if (ev.key === "Enter") {
      const target = ev.target as HTMLInputElement;
      target.blur();
      if (this.isConfirmable) {
        this.confirm();
      }
    }
  }

  private extractRanges(value: string): string {
    return this.props.hasSingleRange ? value.split(",")[0] : value;
  }

  focus(rangeId: number) {
    this.state.isMissing = false;
    this.state.mode = "select-range";
    this.store.focusById(rangeId);
  }

  addEmptyInput() {
    this.store.addEmptyRange();
  }

  removeInput(rangeId: number) {
    const index = this.store.selectionInputs.findIndex((range) => range.id === rangeId);
    if (this.ranges.find((range) => range.id === rangeId)?.xc) {
      this.props.onSelectionRemoved?.(index);
      this.props.onSelectionConfirmed?.();
    }
    this.store.removeRange(rangeId);
  }

  onInputChanged(rangeId: number, ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    const value = this.extractRanges(target.value);
    this.store.changeRange(rangeId, value);
    this.triggerChange();
  }

  reset() {
    this.store.reset();
    this.triggerChange();
  }

  confirm() {
    this.store.confirm();
    const anyValidInput = this.store.selectionInputs.some((range) =>
      this.env.model.getters.isRangeValid(range.xc)
    );
    if (this.props.required && !anyValidInput) {
      this.state.isMissing = true;
    }
    this.props.onSelectionChanged?.(this.store.selectionInputValues);
    this.props.onSelectionConfirmed?.();
  }
}
