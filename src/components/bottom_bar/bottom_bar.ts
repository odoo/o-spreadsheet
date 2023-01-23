import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { BACKGROUND_GRAY_COLOR, HEADER_WIDTH } from "../../constants";
import { MenuItemRegistry } from "../../registries/menu_items_registry";
import { Pixel, SpreadsheetChildEnv } from "../../types";
import { Ripple } from "../animation/ripple";
import { BottomBarSheet } from "../bottom_bar_sheet/bottom_bar_sheet";
import { BottomBarStatistic } from "../bottom_bar_statistic/bottom_bar_statistic";
import { css } from "../helpers/css";
import { Menu } from "../menu/menu";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const MENU_MAX_HEIGHT = 250;

css/* scss */ `
  .o-spreadsheet-bottom-bar {
    background-color: ${BACKGROUND_GRAY_COLOR};
    padding-left: ${HEADER_WIDTH}px;
    font-size: 15px;
    border-top: 1px solid lightgrey;

    .o-add-sheet.disabled {
      cursor: not-allowed;
    }

    .o-sheet-item {
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    .o-all-sheets {
      max-width: 70%;

      .o-bottom-bar-fade-out {
        background-image: linear-gradient(-90deg, #cfcfcf, transparent 1%);
      }

      .o-bottom-bar-fade-in {
        background-image: linear-gradient(90deg, #cfcfcf, transparent 1%);
      }

      &:after {
        content: "";
        border-right: 1px solid #c1c1c1;
        height: 100%;
      }
    }

    .o-bottom-bar-arrows {
      .o-bottom-bar-arrow {
        cursor: pointer;
        &.o-disabled {
          opacity: 0.4;
          cursor: default;
        }
        &:hover:not([class*="o-disabled"]) {
          .o-icon {
            opacity: 0.9;
          }
        }

        .o-icon {
          height: 18px;
          width: 18px;
        }
      }
    }
  }
`;

interface Props {
  onClick: () => void;
}

export class BottomBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBar";
  static components = { Menu, Ripple, BottomBarSheet, BottomBarStatistic };

  private bottomBarRef = useRef("bottomBar");
  private sheetListRef = useRef("sheetList");

  private targetScroll: number | undefined = undefined;
  private state = useState({
    isSheetListScrollableLeft: false,
    isSheetListScrollableRight: false,
  });

  menuMaxHeight = MENU_MAX_HEIGHT;

  setup() {
    onWillUpdateProps(() => {
      this.updateScrollState();
    });
  }

  clickAddSheet(ev: MouseEvent) {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    const position =
      this.env.model.getters.getSheetIds().findIndex((sheetId) => sheetId === activeSheetId) + 1;
    const sheetId = this.env.model.uuidGenerator.uuidv4();
    const name = this.env.model.getters.getNextSheetName(this.env._t("Sheet"));
    this.env.model.dispatch("CREATE_SHEET", { sheetId, position, name });
    this.env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
  }

  getVisibleSheets() {
    return this.env.model.getters
      .getVisibleSheetIds()
      .map((sheetId) => this.env.model.getters.getSheet(sheetId));
  }

  clickListSheets(ev: MouseEvent) {
    const registry = new MenuItemRegistry();
    const from = this.env.model.getters.getActiveSheetId();
    let i = 0;
    for (const sheetId of this.env.model.getters.getSheetIds()) {
      const sheet = this.env.model.getters.getSheet(sheetId);
      registry.add(sheetId, {
        name: sheet.name,
        sequence: i,
        isReadonlyAllowed: true,
        textColor: sheet.isVisible ? undefined : "grey",
        action: (env) => {
          env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: from, sheetIdTo: sheetId });
        },
      });
      i++;
    }
    const target = ev.currentTarget as HTMLElement;
    const { left } = target.getBoundingClientRect();
    const top = this.bottomBarRef.el!.getBoundingClientRect().top;
    this.openContextMenu(left, top, registry);
  }

  openContextMenu(x: Pixel, y: Pixel, registry: MenuItemRegistry) {
    this.env.menuService.registerMenu({
      position: { x, y },
      menuItems: registry.getMenuItems(),
    });
  }

  onWheel(ev: WheelEvent) {
    this.targetScroll = undefined;
    const target = ev.currentTarget as HTMLElement;
    target.scrollLeft += ev.deltaY * 0.5;
  }

  onScroll() {
    this.updateScrollState();
    if (this.targetScroll === this.sheetListCurrentScroll) {
      this.targetScroll = undefined;
    }
  }

  onArrowLeft(ev: MouseEvent) {
    if (!this.state.isSheetListScrollableLeft) return;
    if (!this.targetScroll) this.targetScroll = this.sheetListCurrentScroll;
    const newScroll = this.targetScroll - this.sheetListWidth;
    this.scrollSheetListTo(Math.max(0, newScroll));
  }

  onArrowRight(ev: MouseEvent) {
    if (!this.state.isSheetListScrollableRight) return;
    if (!this.targetScroll) this.targetScroll = this.sheetListCurrentScroll;
    const newScroll = this.targetScroll + this.sheetListWidth;
    this.scrollSheetListTo(Math.min(this.sheetListMaxScroll, newScroll));
  }

  private updateScrollState() {
    this.state.isSheetListScrollableLeft = this.sheetListCurrentScroll > 0;
    this.state.isSheetListScrollableRight = this.sheetListCurrentScroll < this.sheetListMaxScroll;
  }

  private scrollSheetListTo(scroll: number) {
    if (!this.sheetListRef.el) return;
    this.targetScroll = scroll;
    this.sheetListRef.el.scrollTo({ top: 0, left: scroll, behavior: "smooth" });
  }

  get sheetListCurrentScroll() {
    if (!this.sheetListRef.el) return 0;
    return this.sheetListRef.el.scrollLeft;
  }

  get sheetListWidth() {
    if (!this.sheetListRef.el) return 0;
    return this.sheetListRef.el.clientWidth;
  }

  get sheetListMaxScroll() {
    if (!this.sheetListRef.el) return 0;
    return this.sheetListRef.el.scrollWidth - this.sheetListRef.el.clientWidth;
  }
}

BottomBar.props = {
  onClick: Function,
};
