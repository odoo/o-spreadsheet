import { Component } from "@odoo/owl";
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

interface Props {
  openContextMenu: (x: number, y: number, registry: MenuItemRegistry) => void;
}

export class BottomBarStatistic extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarStatisic";
  static components = { Ripple };

  selectedStatisticFn: string = "";

  getSelectedStatistic() {
    const statisticFnResults = this.env.model.getters.getStatisticFnResults();
    // don't display button if no function has a result
    if (Object.values(statisticFnResults).every((result) => result === undefined)) {
      return undefined;
    }
    if (this.selectedStatisticFn === "") {
      this.selectedStatisticFn = Object.keys(statisticFnResults)[0];
    }
    return this.getComposedFnName(
      this.selectedStatisticFn,
      statisticFnResults[this.selectedStatisticFn]
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
          this.selectedStatisticFn = fnName;
        },
      });
      i++;
    }
    const target = ev.currentTarget as HTMLElement;
    const { top, left, width } = target.getBoundingClientRect();
    this.props.openContextMenu(left + width, top, registry);
  }

  private getComposedFnName(fnName: string, fnValue: number | undefined): string {
    return fnName + ": " + (fnValue !== undefined ? formatValue(fnValue) : "__");
  }
}

BottomBarStatistic.props = {
  openContextMenu: Function,
};
