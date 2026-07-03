import { proxy, useProps } from "@odoo/owl";
import { Action, createActions } from "../../../../actions/action";
import { DEFAULT_SCORECARD_HEIGHT, DEFAULT_SCORECARD_WIDTH } from "../../../../constants";
import {
  getStatScorecardDefinition,
  StatItem,
  StatValue,
} from "../../../../helpers/data_statistics/statistics_items";
import { centerFigurePosition } from "../../../../helpers/figures/figure/figure";
import { UuidGenerator } from "../../../../helpers/uuid";
import { _t } from "../../../../translation";
import { MenuMouseEvent } from "../../../../types/misc";
import { startChartDragAndDrop } from "../../../helpers/chart_drag_and_drop";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";

export class StatisticItem extends OSComponent {
  static template = "o-spreadsheet-StatisticItem";
  protected props = useProps({
    stat: types.object<StatValue>(),
    onHover: types.function().optional(),
  });
  static components = {
    MenuPopover,
  };

  private menuState = proxy<MenuState>({ isOpen: false, anchorRect: null, menuItems: [] });

  startDragAndDrop(stat: StatValue, ev: MouseEvent) {
    if (stat.formula === "") {
      return;
    }
    startChartDragAndDrop(this.spEnv, getStatScorecardDefinition(stat), ev);
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.menuState.anchorRect = null;
    this.menuState.menuItems = [];
  }

  openContextMenu(stat: StatValue, ev: MenuMouseEvent) {
    if (!this.menuState.isOpen && stat.formula !== "") {
      this.menuState.isOpen = true;
      this.menuState.anchorRect = {
        x: ev.clientX,
        y: ev.clientY,
        width: 0,
        height: 0,
      };
      this.menuState.menuItems = this.getStatItemActions(stat);
    }
  }

  getStatItemActions(stat: StatItem): Action[] {
    const menuItemSpecs = [
      {
        id: "copy_to_clipboard",
        name: _t("Copy formula to clipboard"),
        execute: async (env) => await env.clipboard.writeText(stat.formula),
        icon: "o-spreadsheet-Icon.CLIPBOARD",
      },
      {
        id: "insert_scorecard",
        name: _t("Insert scorecard"),
        execute: async (env) => {
          const size = { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT };
          const { col, row, offset } = centerFigurePosition(this.spEnv, size);
          this.model().dispatch("CREATE_CHART", {
            chartId: UuidGenerator.smallUuid(),
            figureId: UuidGenerator.smallUuid(),
            sheetId: this.model().getters.getActiveSheetId(),
            size,
            definition: getStatScorecardDefinition(stat),
            col,
            row,
            offset,
          });
        },
        icon: "o-spreadsheet-Icon.INSERT_CHART",
      },
    ];
    return createActions(menuItemSpecs);
  }
}
