import { onMounted, signal, useProps } from "@odoo/owl";
import { MAX_HEADER_SIZE, MIN_COL_WIDTH, MIN_ROW_HEIGHT } from "../../constants";
import { Component, useExternalListener } from "../../owl3_compatibility_layer";
import { _t } from "../../translation";
import { DispatchResult } from "../../types/commands";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { isChildEvent } from "../helpers/dom_helpers";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

export class HeaderResizeEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeaderResizeEditor";
  static components = { Popover };

  protected props = useProps({
    dimension: types.Dimension(),
    anchorIndex: types.HeaderIndex(),
    anchorRect: types.Rect(),
    onClose: types.function(),
  });

  errorMessage = signal("");
  private inputRef = signal.ref(HTMLInputElement);
  private editorRef = signal.ref();

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    onMounted(() => {
      const input = this.inputRef();
      if (input) {
        input.value = this.currentSize.toString();
        input.select();
      }
    });
  }

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: this.props.anchorRect,
      positioning: this.props.dimension === "COL" ? "bottom-left" : "top-right",
      onPopoverHidden: this.props.onClose,
    };
  }

  get minSize(): number {
    return this.props.dimension === "COL" ? MIN_COL_WIDTH : MIN_ROW_HEIGHT;
  }

  get currentSize(): number {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.props.dimension === "COL"
      ? this.env.model.getters.getColSize(sheetId, this.props.anchorIndex)
      : this.env.model.getters.getRowSize(sheetId, this.props.anchorIndex);
  }

  onExternalClick(ev: MouseEvent) {
    if (!isChildEvent(this.editorRef(), ev)) {
      this.props.onClose();
    }
  }

  onInput() {
    this.errorMessage.set("");
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this.apply();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      this.props.onClose();
    }
  }

  apply() {
    const size = this.validateAndParseSize();
    if (size === undefined) {
      return;
    }
    const result: DispatchResult = this.env.model.dispatch("RESIZE_COLUMNS_ROWS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      dimension: this.props.dimension,
      elements:
        this.props.dimension === "COL"
          ? [...this.env.model.getters.getActiveCols()]
          : [...this.env.model.getters.getActiveRows()],
      size,
    });
    if (result.isSuccessful) {
      this.props.onClose();
    }
  }

  private validateAndParseSize(): number | null | undefined {
    const input = this.inputRef();
    if (!input) {
      return;
    }
    if (!input.value && !input.validity.badInput) {
      // A null size removes the custom size and restores the default.
      return null;
    }
    const size = input.valueAsNumber;
    if (!Number.isInteger(size)) {
      this.errorMessage.set(_t("Size must be an integer"));
      return;
    }
    if (size < this.minSize || size > MAX_HEADER_SIZE) {
      this.errorMessage.set(
        _t(
          "Size must be between %s and %s pixels",
          this.minSize.toString(),
          MAX_HEADER_SIZE.toString()
        )
      );
      return;
    }
    return size;
  }
}
