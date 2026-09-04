import { proxy, useProps } from "@odoo/owl";
import { getStatItemActions } from "../../../../actions/stat_item_action";
import {
  getStatScorecardDefinition,
  StatValue,
} from "../../../../helpers/data_statistics/statistics_items";
import { Component } from "../../../../owl3_compatibility_layer";
import { MenuMouseEvent } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { startChartDragAndDrop } from "../../../helpers/chart_drag_and_drop";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { types } from "../../../props_validation";

export class StatisticItem extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StatisticItem";
  protected props = useProps({
    stat: types.StatValue(),
    computePercentage: types.function().optional(),
    onHover: types.function().optional(),
  });
  static components = {
    MenuPopover,
  };

  private menuState = proxy<MenuState>({ isOpen: false, anchorRect: null, menuItems: [] });

  startDragAndDrop(stat: StatValue, ev: MouseEvent) {
    startChartDragAndDrop(this.env, getStatScorecardDefinition(stat), ev);
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.menuState.anchorRect = null;
    this.menuState.menuItems = [];
  }

  openContextMenu(stat: StatValue, ev: MenuMouseEvent) {
    if (!this.menuState.isOpen) {
      this.menuState.isOpen = true;
      this.menuState.anchorRect = {
        x: ev.clientX,
        y: ev.clientY,
        width: 0,
        height: 0,
      };
      this.menuState.menuItems = getStatItemActions(stat, this.env);
    }
  }
}
