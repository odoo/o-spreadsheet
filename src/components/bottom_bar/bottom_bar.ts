import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { BACKGROUND_GRAY_COLOR, HEADER_WIDTH } from "../../constants";
import { MenuItemRegistry } from "../../registries/menu_items_registry";
import { _t } from "../../translation";
import { MenuMouseEvent, Pixel, SpreadsheetChildEnv, UID } from "../../types";
import { Ripple } from "../animation/ripple";
import { DragAndDropListItems } from "../drag_and_drop_list/drag_and_drop_list";
import { css } from "../helpers/css";
import { Menu, MenuState } from "../menu/menu";
import { BottomBarSheet } from "./bottom_bar_sheet/bottom_bar_sheet";
import { BottomBarStatistic } from "./bottom_bar_statistic/bottom_bar_statistic";

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

      .o-sheet-list {
        overflow-y: hidden;
        overflow-x: auto;

        &::-webkit-scrollbar {
          display: none; /* Chrome */
        }
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
      }
    }

    .o-bottom-bar-arrows {
      .o-bottom-bar-arrow {
        cursor: pointer;
        &:hover:not([class*="o-disabled"]) {
          .o-icon {
            opacity: 0.9;
          }
        }

        .o-icon {
          height: 18px;
          width: 18px;
          font-size: 18px;
        }
      }
    }
  }
`;

interface BottomBarSheetItem {
  id: UID;
  name: string;
}

interface Props {
  onClick: () => void;
}

interface BottomBarMenuState extends MenuState {
  menuId: UID | undefined;
}

export class BottomBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBar";
  static props = {
    onClick: Function,
  };
  static components = { DragAndDropListItems, Menu, Ripple, BottomBarSheet, BottomBarStatistic };

  private bottomBarRef = useRef("bottomBar");
  private sheetListRef = useRef("sheetList");

  private targetScroll: number | undefined = undefined;
  private state = useState({
    isSheetListScrollableLeft: false,
    isSheetListScrollableRight: false,
  });

  menuMaxHeight = MENU_MAX_HEIGHT;

  menuState: BottomBarMenuState = useState({
    isOpen: false,
    menuId: undefined,
    position: null,
    menuItems: [],
  });

  sheetList = this.getVisibleSheets();

  setup() {
    onWillUpdateProps(() => {
      this.updateScrollState();
      const visibleSheets = this.getVisibleSheets();
      this.sheetList = visibleSheets;
    });
  }

  clickAddSheet(ev: MouseEvent) {
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    const position =
      this.env.model.getters.getSheetIds().findIndex((sheetId) => sheetId === activeSheetId) + 1;
    const sheetId = this.env.model.uuidGenerator.uuidv4();
    const name = this.env.model.getters.getNextSheetName(_t("Sheet"));
    this.env.model.dispatch("CREATE_SHEET", { sheetId, position, name });
    this.env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
  }

  getVisibleSheets(): BottomBarSheetItem[] {
    return this.env.model.getters.getVisibleSheetIds().map((sheetId) => {
      const sheet = this.env.model.getters.getSheet(sheetId);
      return { id: sheet.id, name: sheet.name };
    });
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
        textColor: sheet.isVisible ? undefined : "#808080",
        execute: (env) => {
          if (!this.env.model.getters.isSheetVisible(sheetId)) {
            this.env.model.dispatch("SHOW_SHEET", { sheetId });
          }
          env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: from, sheetIdTo: sheetId });
        },
        isEnabled: (env) => (env.model.getters.isReadonly() ? sheet.isVisible : true),
        icon: sheet.color ? "o-spreadsheet-Icon.SMALL_DOT_RIGHT_ALIGN" : undefined,
        iconColor: sheet.color,
      });
      i++;
    }
    const target = ev.currentTarget as HTMLElement;
    const { left } = target.getBoundingClientRect();
    const top = this.bottomBarRef.el!.getBoundingClientRect().top;
    this.openContextMenu(left, top, "listSheets", registry);
  }

  openContextMenu(x: Pixel, y: Pixel, menuId: UID, registry: MenuItemRegistry) {
    this.menuState.isOpen = true;
    this.menuState.menuId = menuId;
    this.menuState.menuItems = registry.getMenuItems();
    this.menuState.position = { x, y };
  }

  onSheetContextMenu(sheetId: UID, registry: MenuItemRegistry, ev: MenuMouseEvent) {
    const target = ev.currentTarget as HTMLElement;
    const { top, left } = target.getBoundingClientRect();
    if (ev.closedMenuId === sheetId) {
      this.closeMenu();
      return;
    }
    this.openContextMenu(left, top, sheetId, registry);
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.menuState.menuId = undefined;
    this.menuState.menuItems = [];
    this.menuState.position = null;
  }

  closeContextMenuWithId(menuId: UID) {
    if (this.menuState.menuId === menuId) {
      this.closeMenu();
    }
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

  canStartDrag() {
    return !this.env.model.getters.isReadonly();
  }

  onSheetMouseDown(sheetId: UID, event: MouseEvent) {
    if (event.button !== 0 || this.env.model.getters.isReadonly()) return;
    this.closeMenu();
  }

  onDragEnd(sheetId: UID, originalIndex: number, finalIndex: number) {
    const delta = finalIndex - originalIndex;
    this.env.model.dispatch("MOVE_SHEET", {
      sheetId: sheetId,
      delta,
    });
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
