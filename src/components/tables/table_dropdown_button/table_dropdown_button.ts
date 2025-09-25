import { UID } from "@odoo/o-spreadsheet-engine";
import { DEFAULT_TABLE_CONFIG } from "@odoo/o-spreadsheet-engine/helpers/table_presets";
import { positions } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { TableConfig } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, useState } from "@odoo/owl";
import { ActionSpec } from "../../../actions/action";
import { interactiveCreateTable } from "../../../helpers/ui/table_interactive";
import { ActionButton } from "../../action_button/action_button";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { PopoverProps } from "../../popover/popover";
import {
  CustomTablePopoverMouseEvent,
  TableStylesPopover,
} from "../table_styles_popover/table_styles_popover";

interface State {
  popoverProps: PopoverProps | undefined;
}

interface Props {
  class?: String;
}

export class TableDropdownButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableDropdownButton";
  static components = { TableStylesPopover, ActionButton };
  static props = {
    class: { type: String, optional: true },
  };

  topBarToolStore!: ToolBarDropdownStore;
  state = useState<State>({ popoverProps: undefined });

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

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
    const pivotId = this.pivotIdInSelection;
    if (pivotId) {
      this.env.openSidePanel("PivotSidePanel", { pivotId, openTab: "design" });
      return;
    }
    if (this.env.model.getters.getFirstTableInSelection()) {
      this.topBarToolStore.closeDropdowns();
      this.env.toggleSidePanel("TableSidePanel", {});
      return;
    }

    const target = ev.currentTarget as HTMLElement;
    const { left, bottom } = target.getBoundingClientRect();
    this.topBarToolStore.openDropdown();
    this.state.popoverProps = {
      anchorRect: { x: left, y: bottom, width: 0, height: 0 },
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }

  get action(): ActionSpec {
    const pivotId = this.pivotIdInSelection;
    if (pivotId) {
      return {
        name: _t("Edit pivot style"),
        icon: "o-spreadsheet-Icon.EDIT_TABLE",
      };
    }

    return {
      name: (env) =>
        env.model.getters.getFirstTableInSelection() ? _t("Edit table") : _t("Insert table"),
      icon: (env) =>
        env.model.getters.getFirstTableInSelection()
          ? "o-spreadsheet-Icon.EDIT_TABLE"
          : "o-spreadsheet-Icon.PAINT_TABLE",
    };
  }

  get tableConfig(): TableConfig {
    return { ...DEFAULT_TABLE_CONFIG, numberOfHeaders: 1, bandedRows: true };
  }

  get tableStyles() {
    return this.env.model.getters.getTableStyles();
  }

  get pivotIdInSelection(): UID | undefined {
    const selection = this.env.model.getters.getSelectedZones();
    for (const zone of selection) {
      for (const position of positions(zone)) {
        const sheetId = this.env.model.getters.getActiveSheetId();
        const pivotId = this.env.model.getters.getPivotIdFromPosition({ sheetId, ...position });
        if (pivotId) {
          return pivotId;
        }
      }
    }
    return undefined;
  }

  get class() {
    return `${this.props.class ? this.props.class : ""} ${
      this.env.model.getters.isCurrentSheetLocked() ? "o-disabled" : ""
    }`;
  }
}
