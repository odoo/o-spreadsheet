import { Component, useState } from "@odoo/owl";
import { ActionSpec } from "../../../actions/action";
import { DEFAULT_TABLE_CONFIG } from "../../../helpers/table_presets";
import { interactiveCreateTable } from "../../../helpers/ui/table_interactive";
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types";
import { TableConfig } from "../../../types/table";
import { ActionButton } from "../../action_button/action_button";
import { PopoverProps } from "../../popover/popover";
import {
  CustomTablePopoverMouseEvent,
  TableStylesPopover,
} from "../table_styles_popover/table_styles_popover";

interface State {
  popoverProps: PopoverProps | undefined;
}

export class TableDropdownButton extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableDropdownButton";
  static components = { TableStylesPopover, ActionButton };
  static props = {};

  state = useState<State>({ popoverProps: undefined });

  onStylePicked(styleId: string) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const tableConfig = { ...this.tableConfig, styleId };
    const result = interactiveCreateTable(this.env, sheetId, tableConfig);
    if (result.isSuccessful) {
      this.env.openSidePanel("TableSidePanel", {});
    }
    this.closePopover();
  }

  onClick(ev: CustomTablePopoverMouseEvent) {
    if (ev.hasClosedTableStylesPopover || this.state.popoverProps) {
      this.closePopover();
      return;
    }
    if (this.env.model.getters.getFirstTableInSelection()) {
      this.env.toggleSidePanel("TableSidePanel", {});
      return;
    }

    // Open the popover
    const target = ev.currentTarget as HTMLElement;
    const { bottom, left } = target.getBoundingClientRect();
    this.state.popoverProps = {
      anchorRect: { x: left, y: bottom, width: 0, height: 0 },
      positioning: "BottomLeft",
      verticalOffset: 0,
    };
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }

  get action(): ActionSpec {
    return {
      name: (env) =>
        this.env.model.getters.getFirstTableInSelection() ? _t("Edit table") : _t("Insert table"),
      icon: (env) =>
        this.env.model.getters.getFirstTableInSelection()
          ? "o-spreadsheet-Icon.EDIT_TABLE"
          : "o-spreadsheet-Icon.PAINT_TABLE",
    };
  }

  get tableConfig(): TableConfig {
    return { ...DEFAULT_TABLE_CONFIG, numberOfHeaders: 1, bandedRows: true };
  }
}
