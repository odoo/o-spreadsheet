import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { _t } from "../../translation";
import { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";
import { ValidationMessages } from "../validation_messages/validation_messages";

css/* scss */ `
  .o-grid-add-rows {
    input {
      box-sizing: border-box;
      width: 60px;
      height: 30px;
    }

    .o-validation-error {
      display: inline-block !important;
      margin-top: 0;
      margin-left: 8px;
    }
  }
`;

interface Props {
  focusGrid: () => void;
}

export class GridAddRowsFooter extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridAddRowsFooter";
  static props = {
    focusGrid: Function,
  };
  static components = { ValidationMessages };
  inputRef = useRef<HTMLInputElement>("inputRef");
  state = useState({
    inputValue: "100",
    errorFlag: false,
  });

  setup() {
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
      this.props.focusGrid();
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
      position: "after",
      base: rowNumber - 1,
      quantity,
      dimension: "ROW",
    });
    this.props.focusGrid();

    // After adding new rows, scroll down to the new last row
    const { scrollX } = this.env.model.getters.getActiveSheetDOMScrollInfo();
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
    this.props.focusGrid();
  }
}
