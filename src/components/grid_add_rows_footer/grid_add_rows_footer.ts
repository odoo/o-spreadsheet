import { proxy, signal } from "@odoo/owl";
import { FOOTER_HEIGHT } from "../../constants";
import { Component, useExternalListener } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { _t } from "../../translation";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { cssPropertiesToCss } from "../helpers/css";
import { ValidationMessages } from "../validation_messages/validation_messages";

export class GridAddRowsFooter extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridAddRowsFooter";
  static components = { ValidationMessages };

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;
  private viewStore!: Store<ViewportsStore>;

  inputRef = signal.ref(HTMLInputElement);
  state = proxy({
    inputValue: "100",
    errorFlag: false,
  });

  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    this.viewStore = useStore(ViewportsStore);
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  get addRowsPosition() {
    const { scrollY } = this.viewStore.activeSheetScrollInfo;
    const { y, height } = this.viewStore.mainViewportRect;

    return cssPropertiesToCss({
      top: `${y + height - scrollY - FOOTER_HEIGHT}px`,
      height: `${FOOTER_HEIGHT}px`,
    });
  }

  get errorMessages() {
    return [_t("Please enter a number between 0 and 10000.")];
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key.toUpperCase() === "ESCAPE") {
      this.focusDefaultElement();
    } else if (ev.key.toUpperCase() === "ENTER") {
      this.onConfirm();
    }
  }

  onInput(ev: InputEvent) {
    const value = (ev.target! as HTMLInputElement).value;
    this.state.inputValue = value;
    const quantity = Number(value);
    this.state.errorFlag = Number.isNaN(quantity) || quantity <= 0 || quantity > 10000;
  }

  onConfirm() {
    if (this.state.errorFlag) {
      return;
    }
    const quantity = Number(this.state.inputValue);
    const activeSheetId = this.viewStore.displayedSheetId;
    const rowNumber = this.env.model.getters.getNumberRows(activeSheetId);
    this.env.model.dispatch("ADD_COLUMNS_ROWS", {
      sheetId: activeSheetId,
      sheetName: this.env.model.getters.getSheetName(activeSheetId),
      position: "after",
      base: rowNumber - 1,
      quantity,
      dimension: "ROW",
    });
    this.focusDefaultElement();

    // After adding new rows, scroll down to the new last row
    const { scrollX } = this.viewStore.activeSheetScrollInfo;
    const { end } = this.env.model.getters.getRowDimensions(
      activeSheetId,
      rowNumber + quantity - 1
    );
    this.viewStore.setViewportOffset({ offsetX: scrollX, offsetY: end });
  }

  private onExternalClick(ev) {
    const inputEl = this.inputRef();
    if (inputEl !== document.activeElement || ev.target === inputEl) {
      return;
    }
    this.focusDefaultElement();
  }

  private focusDefaultElement() {
    if (document.activeElement === this.inputRef()) {
      this.DOMFocusableElementStore.focus();
    }
  }
}
