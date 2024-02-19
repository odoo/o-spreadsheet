import {
  Component,
  onMounted,
  useChildSubEnv,
  useEffect,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import {
  CREATE_IMAGE,
  INSERT_COLUMNS_BEFORE_ACTION,
  INSERT_LINK,
  INSERT_ROWS_BEFORE_ACTION,
  PASTE_AS_VALUE_ACTION,
} from "../../actions/menu_items_actions";
import { canUngroupHeaders } from "../../actions/view_actions";
import {
  AUTOFILL_EDGE_LENGTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  SCROLLBAR_WIDTH,
} from "../../constants";
import { isInside } from "../../helpers/index";
import { openLink } from "../../helpers/links";
import { interactiveCut } from "../../helpers/ui/cut_interactive";
import { interactivePaste, interactivePasteFromOS } from "../../helpers/ui/paste_interactive";
import { cellMenuRegistry } from "../../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../../registries/menus/col_menu_registry";
import {
  groupHeadersMenuRegistry,
  unGroupHeadersMenuRegistry,
} from "../../registries/menus/header_group_registry";
import { rowMenuRegistry } from "../../registries/menus/row_menu_registry";
import { Store, useStore } from "../../store_engine";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { HighlightStore } from "../../stores/highlight_store";
import { _t } from "../../translation";
import {
  Align,
  CellValueType,
  Client,
  ClipboardMIMEType,
  DOMCoordinates,
  DOMDimension,
  Dimension,
  Direction,
  GridClickModifiers,
  HeaderIndex,
  Pixel,
  Rect,
  Ref,
  SpreadsheetChildEnv,
} from "../../types/index";
import { Autofill } from "../autofill/autofill";
import { ClientTag } from "../collaborative_client_tag/collaborative_client_tag";
import { ComposerSelection, ComposerStore } from "../composer/composer/composer_store";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { GridComposer } from "../composer/grid_composer/grid_composer";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { HeadersOverlay } from "../headers_overlay/headers_overlay";
import { cssPropertiesToCss } from "../helpers";
import { keyboardEventToShortcutString } from "../helpers/dom_helpers";
import { dragAndDropBeyondTheViewport } from "../helpers/drag_and_drop";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
import { updateSelectionWithArrowKeys } from "../helpers/selection_helpers";
import { useWheelHandler } from "../helpers/wheel_hook";
import { Highlight } from "../highlight/highlight/highlight";
import { Menu, MenuState } from "../menu/menu";
import { CellPopoverStore } from "../popover";
import { Popover } from "../popover/popover";
import { HorizontalScrollBar, VerticalScrollBar } from "../scrollbar/";
import { SidePanelStore } from "../side_panel/side_panel/side_panel_store";
import { HoveredCellStore } from "./hovered_cell_store";

/**
 * The Grid component is the main part of the spreadsheet UI. It is responsible
 * for displaying the actual grid, rendering it, managing events, ...
 *
 * The grid is rendered on a canvas. 3 sub components are (sometimes) displayed
 * on top of the canvas:
 * - a composer (to edit the cell content)
 * - a horizontal resizer (to resize columns)
 * - a vertical resizer (same, for rows)
 */

export type ContextMenuType =
  | "ROW"
  | "COL"
  | "CELL"
  | "FILTER"
  | "GROUP_HEADERS"
  | "UNGROUP_HEADERS";

const registries = {
  ROW: rowMenuRegistry,
  COL: colMenuRegistry,
  CELL: cellMenuRegistry,
  GROUP_HEADERS: groupHeadersMenuRegistry,
  UNGROUP_HEADERS: unGroupHeadersMenuRegistry,
};

interface Props {
  exposeFocus: (focus: () => void) => void;
}

// -----------------------------------------------------------------------------
// JS
// -----------------------------------------------------------------------------
export class Grid extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Grid";
  static props = {
    exposeFocus: Function,
  };
  static components = {
    GridComposer,
    GridOverlay,
    GridPopover,
    HeadersOverlay,
    Menu,
    Autofill,
    ClientTag,
    Highlight,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
  };
  readonly HEADER_HEIGHT = HEADER_HEIGHT;
  readonly HEADER_WIDTH = HEADER_WIDTH;
  private menuState!: MenuState;
  private gridRef!: Ref<HTMLElement>;
  private highlightStore!: Store<HighlightStore>;
  private cellPopovers!: Store<CellPopoverStore>;
  private composerStore!: Store<ComposerStore>;
  private composerFocusStore!: Store<ComposerFocusStore>;
  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Store<HoveredCellStore>;
  sidePanel!: Store<SidePanelStore>;

  setup() {
    this.highlightStore = useStore(HighlightStore);
    this.menuState = useState({
      isOpen: false,
      position: null,
      menuItems: [],
    });
    this.gridRef = useRef("grid");
    this.canvasPosition = useAbsoluteBoundingRect(this.gridRef);
    this.hoveredCell = useStore(HoveredCellStore);
    this.composerStore = useStore(ComposerStore);
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    this.sidePanel = useStore(SidePanelStore);

    useChildSubEnv({ getPopoverContainerRect: () => this.getGridRect() });
    useExternalListener(document.body, "cut", this.copy.bind(this, true));
    useExternalListener(document.body, "copy", this.copy.bind(this, false));
    useExternalListener(document.body, "paste", this.paste);
    onMounted(() => this.focusDefaultElement());
    this.props.exposeFocus(() => this.focusDefaultElement());
    useGridDrawing("canvas", this.env.model, () =>
      this.env.model.getters.getSheetViewDimensionWithHeaders()
    );
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });
    this.cellPopovers = useStore(CellPopoverStore);

    useEffect(
      () => {
        if (!this.sidePanel.isOpen) {
          this.DOMFocusableElementStore.focus();
        }
      },
      () => [this.sidePanel.isOpen]
    );
  }

  onCellHovered({ col, row }) {
    this.hoveredCell.hover({ col, row });
  }

  get highlights() {
    return this.highlightStore.highlights;
  }

  get gridOverlayDimensions() {
    return cssPropertiesToCss({
      top: `${HEADER_HEIGHT}px`,
      left: `${HEADER_WIDTH}px`,
      height: `calc(100% - ${HEADER_HEIGHT + SCROLLBAR_WIDTH}px)`,
      width: `calc(100% - ${HEADER_WIDTH + SCROLLBAR_WIDTH}px)`,
    });
  }

  onClosePopover() {
    if (this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }
    this.focusDefaultElement();
  }

  // this map will handle most of the actions that should happen on key down. The arrow keys are managed in the key
  // down itself
  private keyDownMapping: { [key: string]: Function } = {
    Enter: () => {
      const cell = this.env.model.getters.getActiveCell();
      cell.type === CellValueType.empty
        ? this.onComposerCellFocused()
        : this.onComposerContentFocused();
    },
    Tab: () => this.env.model.selection.moveAnchorCell("right", 1),
    "Shift+Tab": () => this.env.model.selection.moveAnchorCell("left", 1),
    F2: () => {
      const cell = this.env.model.getters.getActiveCell();
      cell.type === CellValueType.empty
        ? this.onComposerCellFocused()
        : this.onComposerContentFocused();
    },
    Delete: () => {
      this.env.model.dispatch("DELETE_CONTENT", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
      });
    },
    Backspace: () => {
      this.env.model.dispatch("DELETE_CONTENT", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
      });
    },
    Escape: () => {
      /** TODO: Clean once we introduce proper focus on sub components. Grid should not have to handle all this logic */
      if (this.cellPopovers.isOpen) {
        this.cellPopovers.close();
      } else if (this.menuState.isOpen) {
        this.closeMenu();
      } else if (this.env.model.getters.isPaintingFormat()) {
        this.env.model.dispatch("CANCEL_PAINT_FORMAT");
      } else {
        this.env.model.dispatch("CLEAN_CLIPBOARD_HIGHLIGHT");
      }
    },
    "Ctrl+A": () => this.env.model.selection.loopSelection(),
    "Ctrl+Z": () => this.env.model.dispatch("REQUEST_UNDO"),
    "Ctrl+Y": () => this.env.model.dispatch("REQUEST_REDO"),
    F4: () => this.env.model.dispatch("REQUEST_REDO"),
    "Ctrl+B": () =>
      this.env.model.dispatch("SET_FORMATTING", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
        style: { bold: !this.env.model.getters.getCurrentStyle().bold },
      }),
    "Ctrl+I": () =>
      this.env.model.dispatch("SET_FORMATTING", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
        style: { italic: !this.env.model.getters.getCurrentStyle().italic },
      }),
    "Ctrl+U": () =>
      this.env.model.dispatch("SET_FORMATTING", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
        style: { underline: !this.env.model.getters.getCurrentStyle().underline },
      }),
    "Ctrl+O": () => CREATE_IMAGE(this.env),
    "Alt+=": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();

      const mainSelectedZone = this.env.model.getters.getSelectedZone();
      const { anchor } = this.env.model.getters.getSelection();
      const sums = this.env.model.getters.getAutomaticSums(sheetId, mainSelectedZone, anchor.cell);
      if (
        this.env.model.getters.isSingleCellOrMerge(sheetId, mainSelectedZone) ||
        (this.env.model.getters.isEmpty(sheetId, mainSelectedZone) && sums.length <= 1)
      ) {
        const zone = sums[0]?.zone;
        const zoneXc = zone ? this.env.model.getters.zoneToXC(sheetId, sums[0].zone) : "";
        const formula = `=SUM(${zoneXc})`;
        this.onComposerCellFocused(formula, { start: 5, end: 5 + zoneXc.length });
      } else {
        this.env.model.dispatch("SUM_SELECTION");
      }
    },
    "Alt+Enter": () => {
      const cell = this.env.model.getters.getActiveCell();
      if (cell.link) {
        openLink(cell.link, this.env);
      }
    },
    "Ctrl+Home": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const { col, row } = this.env.model.getters.getNextVisibleCellPosition({
        sheetId,
        col: 0,
        row: 0,
      });
      this.env.model.selection.selectCell(col, row);
    },
    "Ctrl+End": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const col = this.env.model.getters.findVisibleHeader(
        sheetId,
        "COL",
        this.env.model.getters.getNumberCols(sheetId) - 1,
        0
      )!;
      const row = this.env.model.getters.findVisibleHeader(
        sheetId,
        "ROW",
        this.env.model.getters.getNumberRows(sheetId) - 1,
        0
      )!;
      this.env.model.selection.selectCell(col, row);
    },
    "Shift+ ": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        left: 0,
        right: this.env.model.getters.getNumberCols(sheetId) - 1,
      };
      const position = this.env.model.getters.getActivePosition();
      this.env.model.selection.selectZone({ cell: position, zone: newZone });
    },
    "Ctrl+ ": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        top: 0,
        bottom: this.env.model.getters.getNumberRows(sheetId) - 1,
      };
      const position = this.env.model.getters.getActivePosition();
      this.env.model.selection.selectZone({ cell: position, zone: newZone });
    },
    "Ctrl+D": async () => this.env.model.dispatch("COPY_PASTE_CELLS_ABOVE"),
    "Ctrl+R": async () => this.env.model.dispatch("COPY_PASTE_CELLS_ON_LEFT"),
    "Ctrl+Shift+E": () => this.setHorizontalAlign("center"),
    "Ctrl+Shift+L": () => this.setHorizontalAlign("left"),
    "Ctrl+Shift+R": () => this.setHorizontalAlign("right"),
    "Ctrl+Shift+V": () => PASTE_AS_VALUE_ACTION(this.env),
    "Ctrl+Shift+<": () => this.clearFormatting(), // for qwerty
    "Ctrl+<": () => this.clearFormatting(), // for azerty
    "Ctrl+Shift+ ": () => {
      this.env.model.selection.selectAll();
    },
    "Ctrl+Alt+=": () => {
      const activeCols = this.env.model.getters.getActiveCols();
      const activeRows = this.env.model.getters.getActiveRows();
      const isSingleSelection = this.env.model.getters.getSelectedZones().length === 1;
      const areFullCols = activeCols.size > 0 && isSingleSelection;
      const areFullRows = activeRows.size > 0 && isSingleSelection;
      if (areFullCols && !areFullRows) {
        INSERT_COLUMNS_BEFORE_ACTION(this.env);
      } else if (areFullRows && !areFullCols) {
        INSERT_ROWS_BEFORE_ACTION(this.env);
      }
    },
    "Ctrl+Alt+-": () => {
      const columns = [...this.env.model.getters.getActiveCols()];
      const rows = [...this.env.model.getters.getActiveRows()];
      if (columns.length > 0 && rows.length === 0) {
        this.env.model.dispatch("REMOVE_COLUMNS_ROWS", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          dimension: "COL",
          elements: columns,
        });
      } else if (rows.length > 0 && columns.length === 0) {
        this.env.model.dispatch("REMOVE_COLUMNS_ROWS", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          dimension: "ROW",
          elements: rows,
        });
      }
    },
    "Shift+PageDown": () => {
      this.env.model.dispatch("ACTIVATE_NEXT_SHEET");
    },
    "Shift+PageUp": () => {
      this.env.model.dispatch("ACTIVATE_PREVIOUS_SHEET");
    },
    PageDown: () => this.env.model.dispatch("SHIFT_VIEWPORT_DOWN"),
    PageUp: () => this.env.model.dispatch("SHIFT_VIEWPORT_UP"),
    "Ctrl+K": () => INSERT_LINK(this.env),
    "Alt+Shift+ArrowRight": () => this.processHeaderGroupingKey("right"),
    "Alt+Shift+ArrowLeft": () => this.processHeaderGroupingKey("left"),
    "Alt+Shift+ArrowUp": () => this.processHeaderGroupingKey("up"),
    "Alt+Shift+ArrowDown": () => this.processHeaderGroupingKey("down"),
  };

  focusDefaultElement() {
    if (
      !this.env.model.getters.getSelectedFigureId() &&
      this.composerStore.editionMode === "inactive"
    ) {
      this.DOMFocusableElementStore.focus();
    }
  }

  get gridEl(): HTMLElement {
    if (!this.gridRef.el) {
      throw new Error("Grid el is not defined.");
    }
    return this.gridRef.el;
  }

  getAutofillPosition() {
    const zone = this.env.model.getters.getSelectedZone();
    const rect = this.env.model.getters.getVisibleRect(zone);
    return {
      left: rect.x + rect.width - AUTOFILL_EDGE_LENGTH / 2,
      top: rect.y + rect.height - AUTOFILL_EDGE_LENGTH / 2,
    };
  }

  get isAutofillVisible(): boolean {
    const zone = this.env.model.getters.getSelectedZone();
    const rect = this.env.model.getters.getVisibleRect({
      left: zone.right,
      right: zone.right,
      top: zone.bottom,
      bottom: zone.bottom,
    });
    return !(rect.width === 0 || rect.height === 0);
  }

  onGridResized({ height, width }: DOMDimension) {
    this.env.model.dispatch("RESIZE_SHEETVIEW", {
      width: width,
      height: height,
      gridOffsetX: HEADER_WIDTH,
      gridOffsetY: HEADER_HEIGHT,
    });
  }

  private moveCanvas(deltaX: number, deltaY: number) {
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetDOMScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX + deltaX,
      offsetY: scrollY + deltaY,
    });
  }

  getClientPositionKey(client: Client) {
    return `${client.id}-${client.position?.sheetId}-${client.position?.col}-${client.position?.row}`;
  }

  isCellHovered(col: HeaderIndex, row: HeaderIndex): boolean {
    return this.hoveredCell.col === col && this.hoveredCell.row === row;
  }

  private getGridRect(): Rect {
    return { ...this.canvasPosition, ...this.env.model.getters.getSheetViewDimensionWithHeaders() };
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  onCellClicked(col: HeaderIndex, row: HeaderIndex, modifiers: GridClickModifiers) {
    if (modifiers.closePopover && this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }
    if (this.composerStore.editionMode === "editing") {
      this.composerStore.stopEdition();
    }
    if (modifiers.expandZone) {
      this.env.model.selection.setAnchorCorner(col, row);
    } else if (modifiers.addZone) {
      this.env.model.selection.addCellToSelection(col, row);
    } else {
      this.env.model.selection.selectCell(col, row);
    }
    let prevCol = col;
    let prevRow = row;

    const onMouseMove = (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => {
      // When selecting cells during the edition, we don't want to avoid the default
      // browser behaviour that will select the text inside the composer
      // (see related commit msg for more information)
      ev.preventDefault();
      if ((col !== prevCol && col != -1) || (row !== prevRow && row != -1)) {
        prevCol = col === -1 ? prevCol : col;
        prevRow = row === -1 ? prevRow : row;
        this.env.model.selection.setAnchorCorner(prevCol, prevRow);
      }
    };
    const onMouseUp = () => {
      if (this.env.model.getters.isPaintingFormat()) {
        this.env.model.dispatch("PASTE", {
          target: this.env.model.getters.getSelectedZones(),
        });
      }
    };
    dragAndDropBeyondTheViewport(this.env, onMouseMove, onMouseUp);
  }

  onCellDoubleClicked(col: HeaderIndex, row: HeaderIndex) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    ({ col, row } = this.env.model.getters.getMainCellPosition({ sheetId, col, row }));
    const cell = this.env.model.getters.getEvaluatedCell({ sheetId, col, row });
    if (cell.type === CellValueType.empty) {
      this.onComposerCellFocused();
    } else {
      this.onComposerContentFocused();
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard interactions
  // ---------------------------------------------------------------------------

  processArrows(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }

    updateSelectionWithArrowKeys(ev, this.env.model.selection);

    if (this.env.model.getters.isPaintingFormat()) {
      this.env.model.dispatch("PASTE", {
        target: this.env.model.getters.getSelectedZones(),
      });
    }
  }

  onKeydown(ev: KeyboardEvent) {
    const keyDownString = keyboardEventToShortcutString(ev);
    const handler = this.keyDownMapping[keyDownString];
    if (handler) {
      ev.preventDefault();
      ev.stopPropagation();
      handler();
      return;
    }

    if (ev.key.startsWith("Arrow")) {
      this.processArrows(ev);
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Context Menu
  // ---------------------------------------------------------------------------

  onInputContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    const lastZone = this.env.model.getters.getSelectedZone();
    const { left: col, top: row } = lastZone;
    let type: ContextMenuType = "CELL";
    this.composerStore.stopEdition();
    if (this.env.model.getters.getActiveCols().has(col)) {
      type = "COL";
    } else if (this.env.model.getters.getActiveRows().has(row)) {
      type = "ROW";
    }
    const { x, y, width } = this.env.model.getters.getVisibleRect(lastZone);
    const gridRect = this.getGridRect();
    this.toggleContextMenu(type, gridRect.x + x + width, gridRect.y + y);
  }

  onCellRightClicked(col: HeaderIndex, row: HeaderIndex, { x, y }: DOMCoordinates) {
    const zones = this.env.model.getters.getSelectedZones();
    const lastZone = zones[zones.length - 1];
    let type: ContextMenuType = "CELL";
    if (!isInside(col, row, lastZone)) {
      this.env.model.selection.getBackToDefault();
      this.env.model.selection.selectCell(col, row);
    } else {
      if (this.env.model.getters.getActiveCols().has(col)) {
        type = "COL";
      } else if (this.env.model.getters.getActiveRows().has(row)) {
        type = "ROW";
      }
    }
    this.toggleContextMenu(type, x, y);
  }

  toggleContextMenu(type: ContextMenuType, x: Pixel, y: Pixel) {
    if (this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }
    this.menuState.isOpen = true;
    this.menuState.position = { x, y };
    this.menuState.menuItems = registries[type].getMenuItems();
  }

  copy(cut: boolean, ev: ClipboardEvent) {
    if (!this.gridEl.contains(document.activeElement)) {
      return;
    }

    const clipboardData = ev.clipboardData;
    if (!clipboardData) {
      this.displayWarningCopyPasteNotSupported();
      return;
    }

    /* If we are currently editing a cell, let the default behavior */
    if (this.composerStore.editionMode !== "inactive") {
      return;
    }
    if (cut) {
      interactiveCut(this.env);
    } else {
      this.env.model.dispatch("COPY");
    }
    const content = this.env.model.getters.getClipboardContent();
    for (const type in content) {
      clipboardData.setData(type, content[type]);
    }
    ev.preventDefault();
  }

  async paste(ev: ClipboardEvent) {
    if (!this.gridEl.contains(document.activeElement)) {
      return;
    }

    const clipboardData = ev.clipboardData;
    if (!clipboardData) {
      this.displayWarningCopyPasteNotSupported();
      return;
    }

    if (clipboardData.types.indexOf(ClipboardMIMEType.PlainText) > -1) {
      const content = clipboardData.getData(ClipboardMIMEType.PlainText);
      const target = this.env.model.getters.getSelectedZones();
      const clipboardString = this.env.model.getters.getClipboardTextContent();
      const isCutOperation = this.env.model.getters.isCutOperation();
      if (clipboardString === content) {
        // the paste actually comes from o-spreadsheet itself
        interactivePaste(this.env, target);
      } else {
        interactivePasteFromOS(this.env, target, content);
      }
      if (isCutOperation) {
        await this.env.clipboard.write({ [ClipboardMIMEType.PlainText]: "" });
      }
    }
  }

  private displayWarningCopyPasteNotSupported() {
    this.env.raiseError(_t("Copy/Paste is not supported in this browser."));
  }

  private clearFormatting() {
    this.env.model.dispatch("CLEAR_FORMATTING", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
    });
  }

  private setHorizontalAlign(align: Align) {
    this.env.model.dispatch("SET_FORMATTING", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
      style: { align },
    });
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.focusDefaultElement();
  }

  private processHeaderGroupingKey(direction: Direction) {
    if (this.env.model.getters.getSelectedZones().length !== 1) {
      return;
    }

    const selectingRows = this.env.model.getters.getActiveRows().size > 0;
    const selectingCols = this.env.model.getters.getActiveCols().size > 0;

    if (selectingCols && selectingRows) {
      this.processHeaderGroupingEventOnWholeSheet(direction);
    } else if (selectingCols) {
      this.processHeaderGroupingEventOnHeaders(direction, "COL");
    } else if (selectingRows) {
      this.processHeaderGroupingEventOnHeaders(direction, "ROW");
    } else {
      this.processHeaderGroupingEventOnGrid(direction);
    }
  }

  private processHeaderGroupingEventOnHeaders(direction: Direction, dimension: Dimension) {
    const sheetId = this.env.model.getters.getActiveSheetId();

    const zone = this.env.model.getters.getSelectedZone();
    const start = dimension === "COL" ? zone.left : zone.top;
    const end = dimension === "COL" ? zone.right : zone.bottom;

    switch (direction) {
      case "right":
        this.env.model.dispatch("GROUP_HEADERS", { sheetId, dimension: dimension, start, end });
        break;
      case "left":
        this.env.model.dispatch("UNGROUP_HEADERS", { sheetId, dimension: dimension, start, end });
        break;
      case "down":
        this.env.model.dispatch("UNFOLD_HEADER_GROUPS_IN_ZONE", { sheetId, dimension, zone });
        break;
      case "up":
        this.env.model.dispatch("FOLD_HEADER_GROUPS_IN_ZONE", { sheetId, dimension, zone });
        break;
    }
  }

  private processHeaderGroupingEventOnWholeSheet(direction: Direction) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (direction === "up") {
      this.env.model.dispatch("FOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "ROW" });
      this.env.model.dispatch("FOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "COL" });
    } else if (direction === "down") {
      this.env.model.dispatch("UNFOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "ROW" });
      this.env.model.dispatch("UNFOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "COL" });
    }
  }

  private processHeaderGroupingEventOnGrid(direction: Direction) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zone = this.env.model.getters.getSelectedZone();
    switch (direction) {
      case "down":
        this.env.model.dispatch("UNFOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "ROW",
          zone: zone,
        });
        this.env.model.dispatch("UNFOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "COL",
          zone: zone,
        });
        break;
      case "up":
        this.env.model.dispatch("FOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "ROW",
          zone: zone,
        });
        this.env.model.dispatch("FOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "COL",
          zone: zone,
        });
        break;
      case "right": {
        const { x, y, width } = this.env.model.getters.getVisibleRect(zone);
        const gridRect = this.getGridRect();
        this.toggleContextMenu("GROUP_HEADERS", x + width + gridRect.x, y + gridRect.y);
        break;
      }
      case "left": {
        if (!canUngroupHeaders(this.env, "COL") && !canUngroupHeaders(this.env, "ROW")) {
          return;
        }
        const { x, y, width } = this.env.model.getters.getVisibleRect(zone);
        const gridRect = this.getGridRect();
        this.toggleContextMenu("UNGROUP_HEADERS", x + width + gridRect.x, y + gridRect.y);
        break;
      }
    }
  }

  onComposerCellFocused(content?: string, selection?: ComposerSelection) {
    this.composerFocusStore.focusGridComposerCell(content, selection);
  }

  onComposerContentFocused() {
    this.composerFocusStore.focusGridComposerContent();
  }
}
