import { props, proxy } from "@odoo/owl";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
} from "../../../constants";
import { Component } from "../../../owl3_compatibility_layer";
import { _t } from "../../../translation";
import { DispatchResult } from "../../../types/commands";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { NumberInput } from "../../number_input/number_input";
import { types } from "../../props_validation";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Section } from "../components/section/section";

type ResizeMode = "exactSize" | "fitToData";

interface State {
  mode: ResizeMode;
  inputValue: string;
}

export class HeaderResizePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeaderResizePanel";
  static components = { NumberInput, Section, ValidationMessages };

  protected props = props({
    sheetId: types.UID(),
    dimension: types.Dimension(),
    elements: types.array(types.HeaderIndex()),
    onCloseSidePanel: types.function([]),
  });

  state = proxy<State>({
    mode: "exactSize",
    inputValue: String(this.currentSize),
  });

  get minSize(): number {
    return this.props.dimension === "COL" ? MIN_COL_WIDTH : MIN_ROW_HEIGHT;
  }

  get maxSize(): number {
    return 2000;
  }

  get sizeInputLabel(): string {
    return this.props.dimension === "COL"
      ? _t("Enter new column width in pixels. (Default: %s)", DEFAULT_CELL_WIDTH)
      : _t("Enter new row height in pixels. (Default: %s)", DEFAULT_CELL_HEIGHT);
  }

  get errorMessages(): string[] {
    if (this.state.mode === "fitToData") {
      return [];
    }
    const size = this.state.inputValue.trim();
    if (!size) {
      return [_t("Enter a size in pixels.")];
    }
    if (!/^\d+$/.test(size)) {
      return [_t("Size must be an integer.")];
    }
    const sizeNumber = Number(size);
    if (sizeNumber < this.minSize || sizeNumber > this.maxSize) {
      return [
        _t(
          "Size must be between %s and %s pixels.",
          this.minSize.toString(),
          this.maxSize.toString()
        ),
      ];
    }
    return [];
  }

  onModeChanged(mode: ResizeMode) {
    this.state.mode = mode;
  }

  onSizeChanged(inputValue: string) {
    this.state.inputValue = inputValue;
    this.state.mode = "exactSize";
  }

  applyResize() {
    if (this.errorMessages.length > 0) {
      return;
    }

    let result: DispatchResult;
    if (this.state.mode === "exactSize") {
      const size = Number(this.state.inputValue.trim());
      result = this.env.model.dispatch("RESIZE_COLUMNS_ROWS", {
        sheetId: this.props.sheetId,
        dimension: this.props.dimension,
        elements: this.props.elements,
        size,
      });
    } else if (this.props.dimension === "COL") {
      result = this.env.model.dispatch("AUTORESIZE_COLUMNS", {
        sheetId: this.props.sheetId,
        cols: this.props.elements,
      });
    } else {
      result = this.env.model.dispatch("AUTORESIZE_ROWS", {
        sheetId: this.props.sheetId,
        rows: this.props.elements,
      });
    }
    if (result.isSuccessful) {
      this.props.onCloseSidePanel();
    }
  }

  private get currentSize(): number {
    const element = this.props.elements[0];
    return this.props.dimension === "COL"
      ? this.env.model.getters.getColSize(this.props.sheetId, element)
      : this.env.model.getters.getRowSize(this.props.sheetId, element);
  }
}
