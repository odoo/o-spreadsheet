import { Component, useState } from "@odoo/owl";
import { formatValue } from "../../helpers/format";
import { MenuItemRegistry } from "../../registries/menu_items_registry";
import { SpreadsheetChildEnv } from "../../types";
import { Ripple } from "../animation/ripple";
import { css } from "../helpers/css";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

css/* scss */ `
  .o-selection-statistic {
    margin-right: 20px;
    padding: 4px 4px 4px 8px;
    color: #333;
    cursor: pointer;
    &:hover {
      background-color: rgba(0, 0, 0, 0.08) !important;
    }
  }
`;

interface Props {}

export class BottomBarStatistic extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarStatisic";
  static components = { Ripple };

  state = useState({ selectedStatisticFn: "" });

  getSelectedStatistic() {
    const statisticFnResults = this.env.model.getters.getStatisticFnResults();
    // don't display button if no function has a result
    if (Object.values(statisticFnResults).every((result) => result === undefined)) {
      return undefined;
    }
    if (this.state.selectedStatisticFn === "") {
      this.state.selectedStatisticFn = Object.keys(statisticFnResults)[0];
    }
    return this.getComposedFnName(
      this.state.selectedStatisticFn,
      statisticFnResults[this.state.selectedStatisticFn]
    );
  }

  listSelectionStatistics(ev: MouseEvent) {
    const registry = new MenuItemRegistry();
    let i = 0;
    for (let [fnName, fnValue] of Object.entries(this.env.model.getters.getStatisticFnResults())) {
      registry.add(fnName, {
        name: this.getComposedFnName(fnName, fnValue),
        sequence: i,
        isReadonlyAllowed: true,
        action: () => {
          this.state.selectedStatisticFn = fnName;
        },
      });
      i++;
    }
    const target = ev.currentTarget as HTMLElement;
    const { top, left, width } = target.getBoundingClientRect();
    this.openContextMenu(left + width, top, registry);
  }

  private openContextMenu(x: number, y: number, registry: MenuItemRegistry) {
    this.env.menuService.registerMenu({
      position: { x, y },
      menuItems: registry.getMenuItems(),
    });
  }

  private getComposedFnName(fnName: string, fnValue: number | undefined): string {
    return fnName + ": " + (fnValue !== undefined ? formatValue(fnValue) : "__");
  }
}

BottomBarStatistic.props = {};
