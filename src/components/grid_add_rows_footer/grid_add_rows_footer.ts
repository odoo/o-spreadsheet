import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { cssPropertiesToCss } from "../helpers";
import { ValidationMessages } from "../validation_messages/validation_messages";

interface Props {}

export class GridAddRowsFooter extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridAddRowsFooter";
  static props = {};
  static components = { ValidationMessages };

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  inputRef = useRef<HTMLInputElement>("inputRef");
  state = useState({
    inputValue: "100",
    errorFlag: false,
  });

  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  get addRowsPosition() {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    const { numberOfRows } = this.env.model.getters.getSheetSize(activeSheetId);
    const { scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
    const rowDimensions = this.env.model.getters.getRowDimensions(activeSheetId, numberOfRows - 1);
    const top = rowDimensions.end - scrollY;

    return cssPropertiesToCss({
      top: `${top}px`,
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
    const activeSheetId = this.env.model.getters.getActiveSheetId();
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
    const { scrollX } = this.env.model.getters.getActiveSheetScrollInfo();
    const { end } = this.env.model.getters.getRowDimensions(
      activeSheetId,
      rowNumber + quantity - 1
    );
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX,
      offsetY: end,
    });
  }

  private onExternalClick(ev) {
    if (this.inputRef.el !== document.activeElement || ev.target === this.inputRef.el) {
      return;
    }
    this.focusDefaultElement();
  }

  private focusDefaultElement() {
    if (document.activeElement === this.inputRef.el) {
      this.DOMFocusableElementStore.focus();
    }
  }
}
