import { onMounted, props, proxy, signal } from "@odoo/owl";
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
import { types } from "../../props_validation";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Section } from "../components/section/section";

type ResizeMode = "exactSize" | "fitToData";

interface State {
  mode: ResizeMode;
  errorMessages: string[];
}

export class HeaderResizePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeaderResizePanel";
  static components = { Section, ValidationMessages };

  protected props = props({
    sheetId: types.UID(),
    dimension: types.Dimension(),
    elements: types.array(types.HeaderIndex()),
    onCloseSidePanel: types.function(),
  });

  state = proxy<State>({
    mode: "exactSize",
    errorMessages: [],
  });
  sizeInputRef = signal<HTMLInputElement | null>(null);

  setup() {
    onMounted(() => {
      const input = this.sizeInputRef();
      if (input) {
        input.value = this.currentSize.toString();
        input.select();
      }
    });
  }

  get minSize(): number {
    return this.props.dimension === "COL" ? MIN_COL_WIDTH : MIN_ROW_HEIGHT;
  }

  get currentSize(): number {
    const element = this.props.elements[0];
    return this.props.dimension === "COL"
      ? this.env.model.getters.getColSize(this.props.sheetId, element)
      : this.env.model.getters.getRowSize(this.props.sheetId, element);
  }

  get sizeInputLabel(): string {
    return this.props.dimension === "COL"
      ? _t("Enter new column width in pixels. (Default: %s)", DEFAULT_CELL_WIDTH)
      : _t("Enter new row height in pixels. (Default: %s)", DEFAULT_CELL_HEIGHT);
  }

  get errorMessages(): string[] {
    return this.state.mode === "fitToData" ? [] : this.state.errorMessages;
  }

  onModeChanged(mode: ResizeMode) {
    this.state.mode = mode;
  }

  onSizeInputKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this.applyResize();
    }
  }

  onSizeInputBlur(ev: FocusEvent) {
    if ((ev.relatedTarget as HTMLElement | null)?.closest(".o-sidePanelButtons")) {
      return;
    }
    const input = this.sizeInputRef();
    if (input && !input.value.trim()) {
      input.value = (
        this.props.dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT
      ).toString();
      this.state.errorMessages = [];
      return;
    }
  }

  applyResize() {
    let result: DispatchResult;
    if (this.state.mode === "exactSize") {
      const size = this.validateAndParseSize();
      if (!size) {
        return;
      }
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

  private validateAndParseSize(): number | undefined {
    this.state.errorMessages = [];
    const input = this.sizeInputRef();
    if (!input) {
      return;
    }
    const size = input.value.trim() || "";
    if (!size) {
      this.state.errorMessages = [_t("Size is required.")];
      return;
    }
    if (!/^\d+$/.test(size)) {
      this.state.errorMessages = [_t("Size must be an integer.")];
      return;
    }
    const sizeNumber = Number(size);
    if (sizeNumber < this.minSize) {
      this.state.errorMessages = [_t("Size must be at least %s pixels.", this.minSize.toString())];
      return;
    }
    return sizeNumber;
  }
}
