import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { TableConfig, TableStyle } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, useState } from "@odoo/owl";
import { PopoverProps } from "../../popover/popover";
import { TableStylePreview } from "../table_style_preview/table_style_preview";
import {
  CustomTablePopoverMouseEvent,
  TableStylesPopover,
} from "../table_styles_popover/table_styles_popover";

interface TableStylePickerProps {
  tableConfig: TableConfig;
  onStylePicked: (styleId: string) => void;
  tableStyles: Record<string, TableStyle>;
  type: "table" | "pivot";
}

interface TableStylePickerState {
  popoverProps: PopoverProps | undefined;
}

export class TableStylePicker extends Component<TableStylePickerProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePicker";
  static components = { TableStylesPopover, TableStylePreview };
  static props = {
    tableConfig: Object,
    onStylePicked: Function,
    tableStyles: Object,
    type: String,
  };

  state = useState<TableStylePickerState>({ popoverProps: undefined });

  getDisplayedTableStyles(): string[] {
    const allStyles = this.props.tableStyles;
    const selectedStyleCategory = allStyles[this.props.tableConfig.styleId].category;
    const styles = Object.keys(allStyles).filter(
      (key) => allStyles[key].category === selectedStyleCategory
    );
    const selectedStyleIndex = styles.indexOf(this.props.tableConfig.styleId);
    if (selectedStyleIndex === -1) {
      return styles;
    }

    const index = Math.floor(selectedStyleIndex / 4) * 4;
    return styles.slice(index);
  }

  onStylePicked(styleId: string) {
    this.props.onStylePicked(styleId);
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
