import { Component, onMounted, onPatched, useRef, xml } from "@odoo/owl";
import { BACKGROUND_GRAY_COLOR, BOTTOMBAR_HEIGHT, HEADER_WIDTH } from "../constants";
import { ContextMenu, menuProvider } from "../controllers/menu_controller";
import { useSharedUI } from "../controllers/providers";
import { formatValue } from "../helpers/format";
import { interactiveRenameSheet } from "../helpers/ui/sheet";
import { MenuItemRegistry, sheetMenuRegistry } from "../registries/index";
import { SpreadsheetChildEnv, UID } from "../types";
import { css } from "./helpers/css";
import { LIST, PLUS, TRIANGLE_DOWN_ICON } from "./icons";
import { Menu } from "./menu";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-bottom-bar o-two-columns" t-on-click="props.onClick" t-ref="bottomBar">
    <div class="o-sheet-item o-add-sheet" t-att-class="{'disabled': env.model.getters.isReadonly()}" t-on-click="addSheet">${PLUS}</div>
    <div class="o-sheet-item o-list-sheets" t-on-click="listSheets">${LIST}</div>
    <div class="o-all-sheets">
      <t t-foreach="env.model.getters.getSheets()" t-as="sheet" t-key="sheet.id">
        <div class="o-sheet-item o-sheet" t-on-click="(ev) => this.activateSheet(sheet.id, ev)"
             t-on-contextmenu.prevent="(ev) => this.onContextMenu(sheet.id, ev)"
             t-att-title="sheet.name"
             t-att-data-id="sheet.id"
             t-att-class="{active: sheet.id === env.model.getters.getActiveSheetId()}">
          <span class="o-sheet-name" t-esc="sheet.name" t-on-dblclick="(ev) => this.onDblClick(sheet.id, ev)"/>
          <span class="o-sheet-icon" t-on-click.stop="(ev) => this.onIconClick(sheet.id, ev)">${TRIANGLE_DOWN_ICON}</span>
        </div>
      </t>
    </div>

    <t t-set="selectedStatistic" t-value="getSelectedStatistic()"/>
    <div t-if="selectedStatistic !== undefined" class="o-selection-statistic" t-on-click="listSelectionStatistics">
      <t t-esc="selectedStatistic"/>
      <span>${TRIANGLE_DOWN_ICON}</span>
    </div>

  </div>`;

css/* scss */ `
  .o-spreadsheet-bottom-bar {
    background-color: ${BACKGROUND_GRAY_COLOR};
    padding-left: ${HEADER_WIDTH}px;
    display: flex;
    align-items: center;
    font-size: 15px;
    border-top: 1px solid lightgrey;
    overflow: hidden;

    .o-add-sheet,
    .o-list-sheets {
      margin-right: 5px;
    }

    .o-add-sheet.disabled {
      cursor: not-allowed;
    }

    .o-sheet-item {
      display: flex;
      align-items: center;
      padding: 5px;
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    .o-all-sheets {
      display: flex;
      align-items: center;
      max-width: 80%;
      overflow: hidden;
    }

    .o-sheet {
      color: #666;
      padding: 0 15px;
      padding-right: 10px;
      height: ${BOTTOMBAR_HEIGHT}px;
      line-height: ${BOTTOMBAR_HEIGHT}px;
      user-select: none;
      white-space: nowrap;
      border-left: 1px solid #c1c1c1;

      &:last-child {
        border-right: 1px solid #c1c1c1;
      }

      &.active {
        color: #484;
        background-color: white;
        box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
      }

      .o-sheet-icon {
        margin-left: 5px;

        &:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
    }

    .o-selection-statistic {
      background-color: white;
      margin-left: auto;
      font-size: 14px;
      margin-right: 20px;
      padding: 4px 8px;
      color: #333;
      border-radius: 3px;
      box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
      user-select: none;
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    .fade-enter-active {
      transition: opacity 0.5s;
    }

    .fade-enter {
      opacity: 0;
    }
  }
`;

interface Props {
  onClick: () => void;
}

export class BottomBar extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = { Menu };

  private bottomBarRef = useRef("bottomBar");
  private contextMenu!: ContextMenu;
  selectedStatisticFn: string = "";

  setup() {
    onMounted(() => this.focusSheet());
    onPatched(() => this.focusSheet());
    this.contextMenu = useSharedUI(menuProvider);
  }

  focusSheet() {
    const div = this.bottomBarRef.el!.querySelector(
      `[data-id="${this.env.model.getters.getActiveSheetId()}"]`
    );
    if (div && div.scrollIntoView) {
      div.scrollIntoView();
    }
  }

  addSheet() {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    const position =
      this.env.model.getters.getVisibleSheets().findIndex((sheetId) => sheetId === activeSheetId) +
      1;
    const sheetId = this.env.model.uuidGenerator.uuidv4();
    const name = this.env.model.getters.getNextSheetName(this.env._t("Sheet"));
    this.env.model.dispatch("CREATE_SHEET", { sheetId, position, name });
    this.env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
  }

  listSheets(ev: MouseEvent) {
    const registry = new MenuItemRegistry();
    const from = this.env.model.getters.getActiveSheetId();
    let i = 0;
    for (let sheet of this.env.model.getters.getSheets()) {
      registry.add(sheet.id, {
        name: sheet.name,
        sequence: i,
        isReadonlyAllowed: true,
        action: (env) =>
          env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: from, sheetIdTo: sheet.id }),
      });
      i++;
    }
    const target = ev.currentTarget as HTMLElement;
    this.openContextMenu(target.offsetLeft, target.offsetTop, registry);
  }

  activateSheet(name: string) {
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
      sheetIdTo: name,
    });
  }

  onDblClick(sheetId: UID) {
    interactiveRenameSheet(this.env, sheetId);
  }

  openContextMenu(x: number, y: number, registry: MenuItemRegistry) {
    const menuItems = registry.getAll().filter((x) => x.isVisible(this.env));
    this.contextMenu.open(menuItems, { x, y });
  }

  onIconClick(sheet: string, ev: MouseEvent) {
    if (this.env.model.getters.getActiveSheetId() !== sheet) {
      this.activateSheet(sheet);
      // this is a behavior change
      this.contextMenu.close();
    } else {
      const target = (ev.currentTarget as HTMLElement).parentElement as HTMLElement;
      this.openContextMenu(target.offsetLeft, target.offsetTop, sheetMenuRegistry);
    }
  }

  onContextMenu(sheet: string, ev: MouseEvent) {
    if (this.env.model.getters.getActiveSheetId() !== sheet) {
      this.activateSheet(sheet);
    }
    const target = ev.currentTarget as HTMLElement;
    this.openContextMenu(target.offsetLeft, target.offsetTop, sheetMenuRegistry);
  }

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
    this.openContextMenu(target.offsetLeft + target.offsetWidth, target.offsetTop, registry);
  }

  private getComposedFnName(fnName: string, fnValue: number | undefined): string {
    return fnName + ": " + (fnValue !== undefined ? formatValue(fnValue) : "__");
  }
}
