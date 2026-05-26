import { props, proxy, signal } from "@odoo/owl";
import { TABLE_STYLE_CATEGORIES } from "../../../helpers/table_presets";
import { Component, useExternalListener } from "../../../owl3_compatibility_layer";
import { _t } from "../../../translation";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { TableConfig, TableStyle } from "../../../types/table";
import { isChildEvent } from "../../helpers/dom_helpers";
import { Popover } from "../../popover/popover";
import { types } from "../../props_validation";
import { TableStylePreview } from "../table_style_preview/table_style_preview";

export type CustomTablePopoverMouseEvent = MouseEvent & { hasClosedTableStylesPopover?: boolean };

export interface State {
  selectedCategory: string;
}

export class TableStylesPopover extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylesPopover";
  static components = { Popover, TableStylePreview };

  protected props = props({
    tableConfig: types.object({}) as Omit<TableConfig, "styleId">,
    "popoverProps?": types.object({}) as PropsOf<Popover>,
    closePopover: types.function([]),
    onStylePicked: types.function<[styleId: string]>([types.string()]),
    "selectedStyleId?": types.string(),
    tableStyles: types.RecordOf<TableStyle>(),
    type: types.or([types.literal("table"), types.literal("pivot")]),
  });

  private tableStyleListRef = signal<HTMLElement | null>(null);
  state = proxy<State>({ selectedCategory: this.initialSelectedCategory });

  setup(): void {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: CustomTablePopoverMouseEvent) {
    const el = this.tableStyleListRef();
    if (el && !isChildEvent(el, ev)) {
      this.props.closePopover();
      ev.hasClosedTableStylesPopover = true;
    }
  }

  get displayedStyles(): string[] {
    const styles = this.props.tableStyles;
    return Object.keys(styles).filter(
      (styleId) => styles[styleId].category === this.state.selectedCategory
    );
  }

  get initialSelectedCategory() {
    return this.props.selectedStyleId
      ? this.props.tableStyles[this.props.selectedStyleId].category
      : "medium";
  }

  get categories() {
    return this.props.type === "table"
      ? { ...TABLE_STYLE_CATEGORIES, custom: _t("Custom") }
      : TABLE_STYLE_CATEGORIES;
  }

  newTableStyle() {
    this.props.closePopover();
    this.env.openSidePanel("TableStyleEditorPanel", {
      onStylePicked: this.props.onStylePicked,
    });
  }
}
