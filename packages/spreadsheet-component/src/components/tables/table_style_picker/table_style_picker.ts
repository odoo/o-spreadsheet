import { Component, useState } from "@odoo/owl";
import { GRAY_300 } from "../../../constants";
import { SpreadsheetChildEnv } from "../../../types";
import { Table } from "../../../types/table";
import { css } from "../../helpers";
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

css/* scss */ `
  .o-table-style-picker {
    box-sizing: border-box;
    border: 1px solid ${GRAY_300};
    border-radius: 3px;

    .o-table-style-picker-arrow {
      border-left: 1px solid ${GRAY_300};

      &:hover {
        background: #f5f5f5;
        cursor: pointer;
      }
    }

    .o-table-style-list-item {
      padding: 5px 6px;
      margin: 5px 2px;

      .o-table-style-picker-preview {
        width: 51px;
        height: 36px;
      }
    }
  }
`;

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
      positioning: "TopRight",
      verticalOffset: 0,
    };
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }
}
