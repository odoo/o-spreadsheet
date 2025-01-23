import { Component, onWillUpdateProps, useEffect, useRef, useState } from "@odoo/owl";
import { ALERT_DANGER_BG } from "../../constants";
import { Store, useLocalStore } from "../../store_engine";
import { Color, SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers/css";
import { useDragAndDropListItems } from "../helpers/drag_and_drop_hook";
import { updateSelectionWithArrowKeys } from "../helpers/selection_helpers";
import { RangeInputValue, SelectionInputStore } from "./selection_input_store";

css/* scss */ `
  .o-selection {
    .o-selection-input {
      padding: 2px 0px;

      input.o-invalid {
        background-color: ${ALERT_DANGER_BG};
      }
      .error-icon {
        right: 7px;
        top: 4px;
      }
      .o-drag-handle {
        cursor: move;
      }
    }
    .o-button {
      height: 28px;
      flex-grow: 0;
    }

    /* Make the character a bit bigger
    compared to its neighbor INPUT box  */
    .o-remove-selection {
      font-size: calc(100% + 4px);
    }
  }
`;

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
  };
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

  setup() {
    useEffect(
      () => this.focusedInput.el?.focus(),
      () => [this.focusedInput.el]
    );
    this.store = useLocalStore(
      SelectionInputStore,
      this.props.ranges,
      this.props.hasSingleRange || false,
      this.props.colors
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
      containerEl: this.selectionRef.el!,
      onDragEnd: (dimensionName, finalIndex) => {
        const originalIndex = draggableIds.findIndex((id) => id === rangeId);
        if (originalIndex === finalIndex) {
          return;
        }
        const draggedItems = [...draggableIds];
        draggedItems.splice(originalIndex, 1);
        draggedItems.splice(finalIndex, 0, rangeId);
        this.props.onSelectionReordered?.(
          this.store.selectionInputs.map((range) => draggedItems.indexOf(range.id))
        );
        this.props.onSelectionConfirmed?.();
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
      this.confirm();
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
    this.props.onSelectionRemoved?.(index);
    this.props.onSelectionConfirmed?.();
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
