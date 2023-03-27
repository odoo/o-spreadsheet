import { Component, onWillUnmount, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { BACKGROUND_GRAY_COLOR, HEADER_WIDTH, TEXT_HEADER_COLOR } from "../../constants";
import { deepEquals } from "../../helpers";
import { MenuItemRegistry } from "../../registries/menu_items_registry";
import { MenuMouseEvent, Pixel, Rect, SpreadsheetChildEnv, UID } from "../../types";
import { Ripple } from "../animation/ripple";
import { BottomBarSheet } from "../bottom_bar_sheet/bottom_bar_sheet";
import { BottomBarStatistic } from "../bottom_bar_statistic/bottom_bar_statistic";
import { css, cssPropertiesToCss } from "../helpers/css";
import { DOMDndHelper } from "../helpers/dom_dnd_helper";
import { Menu, MenuState } from "../menu/menu";
import { CSSProperties } from "./../../types/misc";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const MENU_MAX_HEIGHT = 250;

css/* scss */ `
  .o-spreadsheet-bottom-bar {
    color: ${TEXT_HEADER_COLOR};
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
        }
      }
    }
  }
`;

interface BottomBarSheetItem {
  id: UID;
  name: string;
}

interface SheetState {
  sheetList: BottomBarSheetItem[];
  isDnd: boolean;
  sheetDndPositions: Record<UID, number> | undefined;
}

interface Props {
  onClick: () => void;
}

interface BottomBarMenuState extends MenuState {
  menuId: UID | undefined;
}

export class BottomBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBar";
  static components = { Menu, Ripple, BottomBarSheet, BottomBarStatistic };

  private bottomBarRef = useRef("bottomBar");
  private sheetListRef = useRef("sheetList");

  private dndHelper: DOMDndHelper | undefined;
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
  sheetState: SheetState = useState({
    sheetList: this.getVisibleSheets(),
    isDnd: false,
    sheetDndPositions: undefined,
  });

  setup() {
    onWillUpdateProps(() => {
      this.updateScrollState();
      const visibleSheets = this.getVisibleSheets();
      // Cancel sheet dragging when there is a change in the sheets
      if (this.sheetState.isDnd && !deepEquals(this.sheetState.sheetList, visibleSheets)) {
        this.stopDragging();
      }
      this.sheetState.sheetList = visibleSheets;
    });
    onWillUnmount(() => {
      this.dndHelper?.destroy();
    });
  }

  isDragged(sheetId: UID): boolean {
    return this.sheetState.isDnd && this.dndHelper?.draggedItemId === sheetId;
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

  private getVisibleSheets(): BottomBarSheetItem[] {
    return this.env.model.getters.getVisibleSheetIds().map((sheetId) => {
      const sheet = this.env.model.getters.getSheet(sheetId);
      return { id: sheet.id, name: sheet.name };
    });
  }

  getSheets() {
    return this.sheetState.sheetList;
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

  onSheetMouseDown(sheetId: UID, event: MouseEvent) {
    if (event.button !== 0) return;
    this.closeMenu();

    const mouseX = event.clientX;

    document.body.style.cursor = "move";
    const visibleSheets = this.getVisibleSheets();
    const sheetRects = this.getSheetItemRects();

    const sheets = visibleSheets.map((sheet, index) => ({
      id: sheet.id,
      size: sheetRects[index].width,
      position: sheetRects[index].x,
    }));
    this.dndHelper = new DOMDndHelper({
      draggedItemId: sheetId,
      mouseX,
      items: sheets,
      containerEl: this.sheetListRef.el!,
      onChange: (newPositions) => {
        this.sheetState.isDnd = true;
        this.sheetState.sheetDndPositions = newPositions;
      },
      onCancel: () => this.stopDragging(),
      onDragEnd: (sheetId: UID, finalIndex: number) => this.onDragEnd(sheetId, finalIndex),
    });
  }

  private onDragEnd(sheetId: UID, finalIndex: number) {
    const originalIndex = this.sheetState.sheetList.findIndex((sheet) => sheet.id === sheetId);
    const delta = finalIndex - originalIndex;
    if (sheetId && delta !== 0) {
      this.env.model.dispatch("MOVE_SHEET", {
        sheetId: sheetId,
        delta: delta,
      });
    }
    this.stopDragging();
  }

  getSheetStyle(sheetId: UID): string {
    const style: CSSProperties = {};
    if (this.sheetState.isDnd) {
      style.position = "relative";
      style.left = (this.sheetState.sheetDndPositions?.[sheetId] || 0) + "px";
      style.transition = "left 0.5s";
      style.cursor = "move";
    }
    if (this.isDragged(sheetId)) {
      style.transition = "left 0s";
      style["z-index"] = "1000";
    }
    return cssPropertiesToCss(style);
  }

  private stopDragging() {
    document.body.style.cursor = "";
    this.sheetState.sheetList = this.getVisibleSheets();
    this.sheetState.isDnd = false;
    this.sheetState.sheetDndPositions = undefined;
    this.dndHelper = undefined;
  }

  private getSheetItemRects(): Rect[] {
    return Array.from(this.bottomBarRef.el!.querySelectorAll<HTMLElement>(`.o-sheet`))
      .map((sheetEl) => sheetEl.getBoundingClientRect())
      .map((rect) => ({
        x: rect.x,
        width: rect.width - 1, // -1 to compensate negative margin
        y: rect.y,
        height: rect.height,
      }));
  }

  getSheetClasses(sheetId: UID) {
    let classes = "";
    if (this.isDragged(sheetId)) classes += "dragged ";
    if (this.sheetState.isDnd) classes += "dragging ";
    return classes;
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
