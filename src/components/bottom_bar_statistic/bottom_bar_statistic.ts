import { Component, onWillUpdateProps } from "@odoo/owl";
import { deepEquals } from "../../helpers";
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
  closeContextMenu: () => void;
}

export class BottomBarStatistic extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarStatisic";
  static components = { Ripple };

  selectedStatisticFn: string = "";
  private statisticFnResults: { [name: string]: number | undefined } = {};

  setup() {
    this.statisticFnResults = this.env.model.getters.getStatisticFnResults();

    onWillUpdateProps(() => {
      const newStatisticFnResults = this.env.model.getters.getStatisticFnResults();

      if (!deepEquals(newStatisticFnResults, this.statisticFnResults)) {
        this.props.closeContextMenu();
      }

      this.statisticFnResults = newStatisticFnResults;
    });
  }

  getSelectedStatistic() {
    // don't display button if no function has a result
    if (Object.values(this.statisticFnResults).every((result) => result === undefined)) {
      return undefined;
    }
    if (this.selectedStatisticFn === "") {
      this.selectedStatisticFn = Object.keys(this.statisticFnResults)[0];
    }
    return this.getComposedFnName(
      this.selectedStatisticFn,
      this.statisticFnResults[this.selectedStatisticFn]
    );
  }

  listSelectionStatistics(ev: MouseEvent) {
    const registry = new MenuItemRegistry();
    let i = 0;
    for (let [fnName, fnValue] of Object.entries(this.statisticFnResults)) {
      registry.add(fnName, {
        name: this.getComposedFnName(fnName, fnValue),
        sequence: i,
        isReadonlyAllowed: true,
        execute: () => {
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
    const locale = this.env.model.getters.getLocale();
    return fnName + ": " + (fnValue !== undefined ? formatValue(fnValue, { locale }) : "__");
  }
}

BottomBarStatistic.props = {
  openContextMenu: Function,
  closeContextMenu: Function,
};
