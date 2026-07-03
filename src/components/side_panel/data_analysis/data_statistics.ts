import { proxy, useProps } from "@odoo/owl";
import { CellValue, MenuMouseEvent } from "../../..";
import { createActions } from "../../../actions/action";
import { DEFAULT_SCORECARD_HEIGHT, DEFAULT_SCORECARD_WIDTH } from "../../../constants";
import { UuidGenerator } from "../../../helpers/uuid";
import { Component } from "../../../owl3_compatibility_layer";
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { startChartDragAndDrop } from "../../helpers/chart_drag_and_drop";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";
import { types } from "../../props_validation";
import { Section } from "../components/section/section";

export class DataStatistics extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataStatistics";
  protected props = useProps({ statSection: types.array(types.StatGroup()) });
  static components = {
    Section,
    MenuPopover,
  };

  private menuState = proxy<MenuState>({ isOpen: false, anchorRect: null, menuItems: [] });

  getScorecardDefinition(stat: { name: string; formula: string }) {
    return {
      title: { text: stat.name },
      type: "scorecard" as const,
      keyValue: stat.formula,
      humanize: true,
      baselineMode: "text" as const,
      baselineColorUp: "#0F0",
      baselineColorDown: "#F00",
    };
  }

  startDragAndDrop(stat: { name: string; formula: string }, ev: MouseEvent) {
    startChartDragAndDrop(this.env, this.getScorecardDefinition(stat), ev);
  }

  async copyFormulaToClipboard(formula: string) {
    const value = this.env.model.getters.evaluateFormula(
      this.env.model.getters.getActiveSheetId(),
      formula
    ) as CellValue;
    this.env.model.dispatch("COPY_TO_CLIPBOARD", { data: { formula, value } });
    const osContent = await this.env.model.getters.getClipboardTextAndImageContent();
    await this.env.clipboard.write(osContent);
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.menuState.anchorRect = null;
    this.menuState.menuItems = [];
  }

  getMenuItems(stat: { name: string; formula: string }) {
    const menuItemSpecs = [
      {
        id: "copy_to_clipboard",
        name: _t("Copy formula to clipboard"),
        execute: async () => this.copyFormulaToClipboard(stat.formula),
        icon: "o-spreadsheet-Icon.CLIPBOARD",
      },
      {
        id: "insert_scorecard",
        name: _t("Insert scorecard"),
        execute: async () => {
          this.env.model.dispatch("CREATE_CHART", {
            chartId: UuidGenerator.smallUuid(),
            figureId: UuidGenerator.smallUuid(),
            sheetId: this.env.model.getters.getActiveSheetId(),
            size: { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT },
            definition: this.getScorecardDefinition(stat),
            col: 0,
            row: 0,
            offset: { x: 0, y: 0 },
          });
        },
        icon: "o-spreadsheet-Icon.INSERT_CHART",
      },
    ];
    return createActions(menuItemSpecs);
  }

  openContextMenu(stat: { name: string; formula: string }, ev: MenuMouseEvent) {
    if (!this.menuState.isOpen) {
      this.menuState.isOpen = true;
      this.menuState.anchorRect = {
        x: ev.clientX,
        y: ev.clientY,
        width: 0,
        height: 0,
      };
      this.menuState.menuItems = this.getMenuItems(stat);
    }
  }
}
