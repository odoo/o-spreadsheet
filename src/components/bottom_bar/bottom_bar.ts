import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import * as EDIT_ACTION from "../../actions/edit_actions";
import * as ACTION_FORMAT from "../../actions/format_actions";
import * as INSERT_ACTION from "../../actions/insert_actions";
import { BACKGROUND_GRAY_COLOR, GRAY_300, HEADER_WIDTH } from "../../constants";
import { deepEquals, getZoneArea } from "../../helpers";
import { MenuItemRegistry } from "../../registries/menu_items_registry";
import { Store, useStore } from "../../store_engine";
import { SelectionStore } from "../../stores/draw_selection_store";
import { _t } from "../../translation";
import { ComposerFocusType, MenuMouseEvent, Pixel, SpreadsheetChildEnv, UID } from "../../types";
import { ActionButton } from "../action_button/action_button";
import { Ripple } from "../animation/ripple";
import { ColorPickerWidget } from "../color_picker/color_picker_widget";
import { CellComposerStore } from "../composer/composer/cell_composer_store";
import { CellComposerProps, Composer } from "../composer/composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer/composer_focus_store";
import { css } from "../helpers/css";
import { Menu, MenuState } from "../menu/menu";
import { SelectionButton } from "../selection/selection_button";
import { BottomBarSheet } from "./bottom_bar_sheet/bottom_bar_sheet";
import { BottomBarStatistic } from "./bottom_bar_statistic/bottom_bar_statistic";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const MENU_MAX_HEIGHT = 250;

css/* scss */ `
  .o-spreadsheet-bottom-bar {
    position: sticky;
    bottom: 0;
    background-color: ${BACKGROUND_GRAY_COLOR};
    // padding-left: ${HEADER_WIDTH / 2}px;
    font-size: 15px;
    border-top: 1px solid lightgrey;

    .o-sheet-item {
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    .o-add-sheet,
    .o-list-sheets {
      flex: 0 0 auto;
    }

    .o-bottom-bar-fade-out {
      // background-image: linear-gradient(-90deg, #cfcfcf, transparent 1%);
      box-shadow: 0px 0px 10px 3px #aaaaaa;
      border-left: 1px solid #c1c1c1;
      z-index: 1;
    }

    .o-bottom-bar-fade-in {
      // background-image: linear-gradient(90deg, #cfcfcf, transparent 1%);
      box-shadow: 0px 0px 10px 3px #aaaaaa;
      border-left: 1px solid #c1c1c1;
      z-index: 1;
    }
    .o-all-sheets {
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

    .mobile-edition {
      width: 100%;
    }

    .mobile-composer {
      border: lightgrey solid 1px;
      border-radius: 5px;
      line-height: 24px;
      display: flex;
      .o-icon {
        width: 24px;
        height: 24px;
      }
    }

    /*  shoult be more global and not copied from top bar */
    .o-divider {
      border-right: 1px solid ${GRAY_300};
      margin: 0 6px;
    }

    .o-color-picker {
      width: 100% !important;
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
  static template = "o-spreadsheet-mobile-BottomBar";
  static props = {
    onClick: Function,
  };
  static components = {
    Menu,
    Ripple,
    BottomBarSheet,
    BottomBarStatistic,
    Composer,
    SelectionButton,
    ActionButton,
    ColorPickerWidget,
  };

  FORMAT = ACTION_FORMAT;
  INSERT = INSERT_ACTION;
  EDIT = EDIT_ACTION;

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
    menuTitle: _t("Sheets"),
  });

  sheetList = this.getVisibleSheets();
  private composerStore!: Store<CellComposerStore>;
  private composerFocusStore!: Store<ComposerFocusStore>;
  private composerInterface!: ComposerInterface;
  selectionStore!: Store<SelectionStore>;

  setup() {
    const composerStore = useStore(CellComposerStore);
    this.selectionStore = useStore(SelectionStore);
    this.composerStore = composerStore;
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.composerInterface = {
      id: "gridComposer",
      get editionMode() {
        return composerStore.editionMode;
      },
      startEdition: this.composerStore.startEdition,
      setCurrentContent: this.composerStore.setCurrentContent,
      stopEdition: this.composerStore.stopEdition,
    };
    this.composerFocusStore.focusComposer(this.composerInterface, { focusMode: "inactive" });
    onWillUpdateProps(() => {
      this.updateScrollState();
      const visibleSheets = this.getVisibleSheets();
      // Cancel sheet dragging when there is a change in the sheets
      if (!deepEquals(this.sheetList, visibleSheets)) {
        // this.dragAndDrop.cancel();
      }
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

  onSheetMouseDown(sheetId: UID, event: MouseEvent) {
    if (event.button !== 0 || this.env.model.getters.isReadonly()) return;
    this.closeMenu();

    // const visibleSheets = this.getVisibleSheets();
    // const sheetRects = this.getSheetItemRects();

    // const sheets = visibleSheets.map((sheet, index) => ({
    //   id: sheet.id,
    //   size: sheetRects[index].width,
    //   position: sheetRects[index].x,
    // }));
    // this.dragAndDrop.start("horizontal", {
    //   draggedItemId: sheetId,
    //   initialMousePosition: event.clientX,
    //   items: sheets,
    //   scrollableContainerEl: this.sheetListRef.el!,
    //   onDragEnd: (sheetId: UID, finalIndex: number) => this.onDragEnd(sheetId, finalIndex),
    // });
  }

  // private onDragEnd(sheetId: UID, finalIndex: number) {
  //   const originalIndex = this.getVisibleSheets().findIndex((sheet) => sheet.id === sheetId);
  //   const delta = finalIndex - originalIndex;
  //   if (sheetId && delta !== 0) {
  //     this.env.model.dispatch("MOVE_SHEET", {
  //       sheetId: sheetId,
  //       delta: delta,
  //     });
  //   }
  // }

  getSheetStyle(sheetId: UID): string {
    return "";
    // return this.dragAndDrop.itemsStyle[sheetId] || "";
  }

  // private getSheetItemRects(): Rect[] {
  //   return Array.from(this.bottomBarRef.el!.querySelectorAll<HTMLElement>(`.o-sheet`))
  //     .map((sheetEl) => sheetEl.getBoundingClientRect())
  //     .map((rect) => ({
  //       x: rect.x,
  //       width: rect.width - 1, // -1 to compensate negative margin
  //       y: rect.y,
  //       height: rect.height,
  //     }));
  // }

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

  get isComposerVisible(): boolean {
    return (
      this.env.model.getters.getSelectedZones().length === 1 &&
      getZoneArea(this.env.model.getters.getSelectedZone()) === 1
    );
  }

  get composerProps(): CellComposerProps {
    return {
      focus: this.focus,
      composerStore: this.composerStore,
      onComposerContentFocused: () =>
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "contentFocus",
        }),
      isDefaultFocus: false,
    };
  }

  get focus(): ComposerFocusType {
    return this.composerFocusStore.activeComposer === this.composerInterface
      ? this.composerFocusStore.focusMode
      : "inactive";
  }
}
