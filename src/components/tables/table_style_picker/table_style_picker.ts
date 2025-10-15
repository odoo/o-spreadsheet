import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Table } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, useState } from "@odoo/owl";
import { PopoverProps } from "../../popover/popover";
import { TableStylePreview } from "../table_style_preview/table_style_preview";
import {
  CustomTablePopoverMouseEvent,
  TableStylesPopover,
} from "../table_styles_popover/table_styles_popover";

interface TableStylePickerProps {
  table: Table;
}

interface TableStylePickerState {
  popoverProps: PopoverProps | undefined;
}

export class TableStylePicker extends Component<TableStylePickerProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePicker";
  static components = { TableStylesPopover, TableStylePreview };
  static props = { table: Object };

  state = useState<TableStylePickerState>({ popoverProps: undefined });

  getDisplayedTableStyles() {
    const allStyles = this.env.model.getters.getTableStyles();
    const selectedStyleCategory = allStyles[this.props.table.config.styleId].category;
    const styles = Object.keys(allStyles).filter(
      (key) => allStyles[key].category === selectedStyleCategory
    );
    const selectedStyleIndex = styles.indexOf(this.props.table.config.styleId);
    if (selectedStyleIndex === -1) {
      return selectedStyleIndex;
    }

    const index = Math.floor(selectedStyleIndex / 4) * 4;
    return styles.slice(index);
  }

  onStylePicked(styleId: string) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.env.model.dispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      config: { styleId: styleId },
    });
    this.closePopover();
  }

  onArrowButtonClick(ev: CustomTablePopoverMouseEvent) {
    if (ev.hasClosedTableStylesPopover || this.state.popoverProps) {
      this.closePopover();
      return;
    }
    const target = ev.currentTarget as HTMLElement;
    const { bottom, right } = target.getBoundingClientRect();
    this.state.popoverProps = {
      anchorRect: { x: right, y: bottom, width: 0, height: 0 },
      positioning: "top-right",
      verticalOffset: 0,
    };
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }
}
