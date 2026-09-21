import { signal, useEffect, useListener, useProps } from "@odoo/owl";
import {
  DEFAULT_CELL_WIDTH,
  MAX_HEADER_SIZE,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
} from "../../constants";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { ZoomStore } from "../../stores/zoom_store";
import { _t } from "../../translation";
import { DispatchResult } from "../../types/commands";
import { Dimension, HeaderIndex } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { isChildEvent } from "../helpers/dom_helpers";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

export interface HeaderResizeEditorTarget {
  dimension: Dimension;
  index: HeaderIndex;
}

export class HeaderResizeEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeaderResizeEditor";
  static components = { Popover };

  protected props = useProps({
    target: types.signal<HeaderResizeEditorTarget | null>(),
    gridRect: types.Rect(),
  });

  errorMessage = signal("");
  isInputEmpty = signal(false);
  private inputRef = signal.ref(HTMLInputElement);
  private editorRef = signal.ref();
  private viewStore!: Store<ViewportsStore>;
  private zoomStore!: Store<ZoomStore>;
  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  setup() {
    this.viewStore = useStore(ViewportsStore);
    this.zoomStore = useStore(ZoomStore);
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    useListener(window, "click", this.onExternalClick.bind(this), { capture: true });
    useListener(window, "contextmenu", this.onExternalClick.bind(this), { capture: true });
    useEffect(() => {
      const input = this.inputRef();
      if (input && this.props.target()) {
        input.value = this.currentSize.toString();
        input.focus();
        input.select();
      }
    });
  }

  private get target(): HeaderResizeEditorTarget {
    const target = this.props.target();
    if (!target) {
      throw new Error("Header resize editor target is not set");
    }
    return target;
  }

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: this.anchorRect,
      positioning: this.target.dimension === "COL" ? "bottom-left" : "top-right",
      onPopoverHidden: () => this.close(),
    };
  }

  private get anchorRect(): Rect {
    const { dimension, index } = this.target;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const gridOffset = this.viewStore.gridOffset;
    let headerRect: Rect;
    if (dimension === "COL") {
      const { start, size } = this.viewStore.viewports.getColDimensionsInViewport(sheetId, index);
      headerRect = { x: gridOffset.x + start, y: 0, width: size, height: gridOffset.y };
    } else {
      const { start, size } = this.viewStore.viewports.getRowDimensionsInViewport(sheetId, index);
      headerRect = { x: 0, y: gridOffset.y + start, width: gridOffset.x, height: size };
    }
    const zoomedHeaderRect = this.zoomStore.getZoomedRect(headerRect);
    return {
      ...zoomedHeaderRect,
      x: this.props.gridRect.x + zoomedHeaderRect.x,
      y: this.props.gridRect.y + zoomedHeaderRect.y,
    };
  }

  get minSize(): number {
    return this.target.dimension === "COL" ? MIN_COL_WIDTH : MIN_ROW_HEIGHT;
  }

  get currentSize(): number {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.target.dimension === "COL"
      ? this.env.model.getters.getColSize(sheetId, this.target.index)
      : this.env.model.getters.getRowSize(sheetId, this.target.index);
  }

  onExternalClick(ev: MouseEvent) {
    if (this.props.target() && !isChildEvent(this.editorRef(), ev)) {
      this.close();
    }
  }

  private close() {
    if (this.editorRef()?.contains(document.activeElement)) {
      this.DOMFocusableElementStore.focus();
    }
    this.errorMessage.set("");
    this.isInputEmpty.set(false);
    this.props.target.set(null);
  }

  onInput(ev: InputEvent) {
    const input = ev.target as HTMLInputElement;
    this.errorMessage.set("");
    this.isInputEmpty.set(!input.value && !input.validity.badInput);
  }

  get emptyInputHint(): string {
    return this.target.dimension === "COL"
      ? _t("Empty value resets width to %s px", DEFAULT_CELL_WIDTH)
      : _t("Empty value fits height to content");
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this.apply();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      this.close();
    }
  }

  apply() {
    if (!this.props.target()) {
      // the editor is still in the DOM until the next render after it was closed
      return;
    }
    const size = this.validateAndParseSize();
    if (size === undefined) {
      return;
    }
    const result: DispatchResult = this.env.model.dispatch("RESIZE_COLUMNS_ROWS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      dimension: this.target.dimension,
      elements:
        this.target.dimension === "COL"
          ? [...this.env.model.getters.getActiveCols()]
          : [...this.env.model.getters.getActiveRows()],
      size,
    });
    if (result.isSuccessful) {
      this.close();
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
        _t("Size must be between %(min)s and %(max)s pixels", {
          min: this.minSize,
          max: MAX_HEADER_SIZE,
        })
      );
      return;
    }
    return size;
  }
}
