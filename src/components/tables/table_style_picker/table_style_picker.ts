import { props, proxy } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { TableStyle } from "../../../types/table";
import { Popover } from "../../popover/popover";
import { types } from "../../props_validation";
import { TableStylePreview } from "../table_style_preview/table_style_preview";
import {
  CustomTablePopoverMouseEvent,
  TableStylesPopover,
} from "../table_styles_popover/table_styles_popover";

interface TableStylePickerState {
  popoverProps: PropsOf<Popover> | undefined;
}

export class TableStylePicker extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePicker";
  static components = { TableStylesPopover, TableStylePreview };

  protected props = props({
    tableConfig: types.TableConfig(),
    onStylePicked: types.function<(styleId: string) => void>(),
    tableStyles: types.RecordOf<TableStyle>(),
    type: types.or([types.literal("table"), types.literal("pivot")]),
  });

  state = proxy<TableStylePickerState>({ popoverProps: undefined });

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
