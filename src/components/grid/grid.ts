import { onMounted, props, proxy, signal } from "@odoo/owl";
import { insertSheet, insertTable } from "../../actions/insert_actions";
import {
  CREATE_IMAGE,
  INSERT_COLUMNS_BEFORE_ACTION,
  INSERT_LINK,
  INSERT_ROWS_BEFORE_ACTION,
  PASTE_AS_VALUE_ACTION,
} from "../../actions/menu_items_actions";
import { canUngroupHeaders } from "../../actions/view_actions";
import { AUTOFILL_EDGE_LENGTH, HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import {
  getOSheetClipboardIdFromHTML,
  parseOSClipboardContent,
} from "../../helpers/clipboard/clipboard_helpers";
import { openLink } from "../../helpers/links";
import { isStaticTable } from "../../helpers/table_helpers";
import { interactiveCut } from "../../helpers/ui/cut_interactive";
import {
  handleCopyPasteResult,
  interactivePaste,
  interactivePasteFromOS,
} from "../../helpers/ui/paste_interactive";
import { isInside } from "../../helpers/zones";
import {
  Component,
  useChildSubEnv,
  useExternalListener,
  useLayoutEffect,
} from "../../owl3_compatibility_layer";
import { cellMenuRegistry } from "../../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../../registries/menus/col_menu_registry";
import {
  groupHeadersMenuRegistry,
  unGroupHeadersMenuRegistry,
} from "../../registries/menus/header_group_registry";
import { rowMenuRegistry } from "../../registries/menus/row_menu_registry";
import { useStore } from "../../store_engine/store_hooks";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { ArrayFormulaHighlight } from "../../stores/array_formula_highlight";
import { ClientFocusStore } from "../../stores/client_focus_store";
import { HighlightStore } from "../../stores/highlight_store";
import { CellValueType } from "../../types/cells";
import { ClipboardMIMEType } from "../../types/clipboard";
import { Client } from "../../types/collaborative/session";
import { AllowedImageMimeTypes } from "../../types/image";
import {
  Align,
  Dimension,
  Direction,
  GridClickModifiers,
  HeaderIndex,
  Pixel,
} from "../../types/misc";
import { DOMCoordinates, DOMDimension, Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { Table } from "../../types/table";
import { Autofill } from "../autofill/autofill";
import { ClientTag } from "../collaborative_client_tag/collaborative_client_tag";
import { ComposerSelection } from "../composer/composer/abstract_composer_store";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { GridComposer } from "../composer/grid_composer/grid_composer";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { HeadersOverlay } from "../headers_overlay/headers_overlay";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect, keyboardEventToShortcutString } from "../helpers/dom_helpers";
import { useDragAndDropBeyondTheViewport } from "../helpers/drag_and_drop_grid_hook";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import {
  moveAnchorWithinSelection,
  updateSelectionWithArrowKeys,
} from "../helpers/selection_helpers";
import { useTouchHandlers } from "../helpers/touch_handlers_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { ZoomedMouseEvent } from "../helpers/zoom";
import { Highlight } from "../highlight/highlight/highlight";
import { MenuPopover, MenuState } from "../menu_popover/menu_popover";
import { useModel } from "../owl_plugins/model_plugin";
import { PaintFormatStore } from "../paint_format_button/paint_format_store";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";
import { HorizontalScrollBar } from "../scrollbar/scrollbar_horizontal";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { Selection } from "../selection/selection";
import { SidePanelStore } from "../side_panel/side_panel/side_panel_store";
import { TableResizer } from "../tables/table_resizer/table_resizer";
import { DelayedHoveredCellStore } from "./delayed_hovered_cell_store";

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

// -----------------------------------------------------------------------------
// JS
// -----------------------------------------------------------------------------
export class Grid extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Grid";
  static components = {
    GridComposer,
    GridOverlay,
    GridPopover,
    HeadersOverlay,
    MenuPopover,
    Autofill,
    ClientTag,
    Highlight,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
    TableResizer,
    Selection,
  };

  protected props = props({
    exposeFocus: types.function<[focus: () => void]>([types.function([])]),
    getGridSize: types.function<[], DOMDimension>([], types.DOMDimension()),
  });

  readonly HEADER_HEIGHT = HEADER_HEIGHT;
  readonly HEADER_WIDTH = HEADER_WIDTH;
  private model = useModel();
  private menuState!: MenuState;
  private gridRef = signal<HTMLElement | null>(null);
  private canvasRef = signal<HTMLElement | null>(null);
  private highlightStore!: Store<HighlightStore>;
  private cellPopovers!: Store<CellPopoverStore>;
  private composerFocusStore!: Store<ComposerFocusStore>;
  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;
  private paintFormatStore!: Store<PaintFormatStore>;
  private clientFocusStore!: Store<ClientFocusStore>;

  dragNDropGrid = useDragAndDropBeyondTheViewport(this.model());

  onMouseWheel!: (ev: WheelEvent) => void;
  hoveredCell!: Store<DelayedHoveredCellStore>;
  sidePanel!: Store<SidePanelStore>;

  setup() {
    this.highlightStore = useStore(HighlightStore);
    this.menuState = proxy({
      isOpen: false,
      anchorRect: null,
      menuItems: [],
    });
    this.hoveredCell = useStore(DelayedHoveredCellStore);
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    this.sidePanel = useStore(SidePanelStore);
    this.paintFormatStore = useStore(PaintFormatStore);
    this.clientFocusStore = useStore(ClientFocusStore);
    useStore(ArrayFormulaHighlight);

    useChildSubEnv({ getPopoverContainerRect: () => this.getGridRect() });
    useExternalListener(document.body, "cut", this.copy.bind(this, true));
    useExternalListener(document.body, "copy", this.copy.bind(this, false));
    useExternalListener(document.body, "paste", this.paste);
    onMounted(() => this.focusDefaultElement());
    this.props.exposeFocus(() => this.focusDefaultElement());
    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => ({
        dpr: window.devicePixelRatio || 1,
        viewports: this.model().getters.getViewportCollection(),
        ...this.model().getters.getSelectionState(),
      }),
    });
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });
    this.cellPopovers = useStore(CellPopoverStore);

    useLayoutEffect(
      (isMainPanelOpen, isSecondaryPanelOpen) => {
        if (!isMainPanelOpen && !isSecondaryPanelOpen) {
          this.DOMFocusableElementStore.focus();
        }
      },
      () => [this.sidePanel.isMainPanelOpen, this.sidePanel.isSecondaryPanelOpen]
    );

    useTouchHandlers(this.gridRef, {
      updateScroll: this.moveCanvas.bind(this),
      canMoveUp: () => {
        const { scrollY } = this.model().getters.getActiveSheetScrollInfo();
        return scrollY > 0;
      },
      canMoveDown: () => {
        const { maxOffsetY } = this.model().getters.getMaximumSheetOffset();
        const { scrollY } = this.model().getters.getActiveSheetScrollInfo();
        return scrollY < maxOffsetY;
      },
      getZoom: () => this.model().getters.getViewportZoomLevel(),
      setZoom: (zoom: number) => this.model().dispatch("SET_ZOOM", { zoom }),
    });
  }

  get highlights() {
    return this.highlightStore.highlights;
  }

  get gridOverlayDimensions() {
    const scrollbarWidth = this.model().getters.getScrollBarWidth();
    return cssPropertiesToCss({
      top: `${HEADER_HEIGHT}px`,
      left: `${HEADER_WIDTH}px`,
      height: `calc(100% - ${HEADER_HEIGHT + scrollbarWidth}px)`,
      width: `calc(100% - ${HEADER_WIDTH + scrollbarWidth}px)`,
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
    Enter: () => this.editOrMoveInSelection("down"),
    "Shift+Enter": () => this.editOrMoveInSelection("up"),
    Tab: () => this.moveInSelection("right"),
    "Shift+Tab": () => this.moveInSelection("left"),
    F2: () => {
      this.focusComposerFromActiveCell();
    },
    Delete: () => {
      this.model().dispatch("DELETE_UNFILTERED_CONTENT", {
        sheetId: this.model().getters.getActiveSheetId(),
        target: this.model().getters.getSelectedZones(),
      });
    },
    Backspace: () => {
      this.model().dispatch("DELETE_UNFILTERED_CONTENT", {
        sheetId: this.model().getters.getActiveSheetId(),
        target: this.model().getters.getSelectedZones(),
      });
    },
    Escape: () => {
      /** TODO: Clean once we introduce proper focus on sub components. Grid should not have to handle all this logic */
      if (this.cellPopovers.isOpen) {
        this.cellPopovers.close();
      } else if (this.menuState.isOpen) {
        this.closeMenu();
      } else if (this.paintFormatStore.isActive) {
        this.paintFormatStore.cancel();
      } else {
        this.model().dispatch("CLEAN_CLIPBOARD_HIGHLIGHT");
      }
    },
    "Ctrl+A": () => this.model().selection.loopSelection(),
    "Ctrl+Z": () => this.model().dispatch("REQUEST_UNDO"),
    "Ctrl+Y": () => this.model().dispatch("REQUEST_REDO"),
    F4: () => this.model().dispatch("REQUEST_REDO"),
    "Ctrl+B": () =>
      this.model().dispatch("SET_FORMATTING", {
        sheetId: this.model().getters.getActiveSheetId(),
        target: this.model().getters.getSelectedZones(),
        style: { bold: !this.model().getters.getCurrentStyle().bold },
      }),
    "Ctrl+I": () =>
      this.model().dispatch("SET_FORMATTING", {
        sheetId: this.model().getters.getActiveSheetId(),
        target: this.model().getters.getSelectedZones(),
        style: { italic: !this.model().getters.getCurrentStyle().italic },
      }),
    "Ctrl+U": () =>
      this.model().dispatch("SET_FORMATTING", {
        sheetId: this.model().getters.getActiveSheetId(),
        target: this.model().getters.getSelectedZones(),
        style: { underline: !this.model().getters.getCurrentStyle().underline },
      }),
    "Ctrl+O": () => CREATE_IMAGE(this.model(), this.env),
    "Alt+=": () => {
      const sheetId = this.model().getters.getActiveSheetId();

      const mainSelectedZone = this.model().getters.getSelectedZone();
      const { anchor } = this.model().getters.getSelection();
      const sums = this.model().getters.getAutomaticSums(sheetId, mainSelectedZone, anchor.cell);
      if (
        this.model().getters.isSingleCellOrMerge(sheetId, mainSelectedZone) ||
        (this.model().getters.isEmpty(sheetId, mainSelectedZone) && sums.length <= 1)
      ) {
        const zone = sums[0]?.zone;
        const zoneXc = zone ? this.model().getters.zoneToXC(sheetId, sums[0].zone) : "";
        const formula = `=SUM(${zoneXc})`;
        this.onComposerCellFocused(formula, { start: 5, end: 5 + zoneXc.length });
      } else {
        this.model().dispatch("SUM_SELECTION");
      }
    },
    "Alt+Enter": () => {
      const cell = this.model().getters.getActiveCell();
      if (cell.link) {
        openLink(cell.link, this.model(), this.env);
      }
    },
    "Ctrl+Home": () => {
      const sheetId = this.model().getters.getActiveSheetId();
      const { col, row } = this.model().getters.getNextVisibleCellPosition({
        sheetId,
        col: 0,
        row: 0,
      });
      this.model().selection.selectCell(col, row);
    },
    "Ctrl+End": () => {
      const sheetId = this.model().getters.getActiveSheetId();
      const col = this.model().getters.findVisibleHeader(
        sheetId,
        "COL",
        this.model().getters.getNumberCols(sheetId) - 1,
        0
      )!;
      const row = this.model().getters.findVisibleHeader(
        sheetId,
        "ROW",
        this.model().getters.getNumberRows(sheetId) - 1,
        0
      )!;
      this.model().selection.selectCell(col, row);
    },
    "Shift+ ": () => {
      const sheetId = this.model().getters.getActiveSheetId();
      const newZone = {
        ...this.model().getters.getSelectedZone(),
        left: 0,
        right: this.model().getters.getNumberCols(sheetId) - 1,
      };
      const position = this.model().getters.getActivePosition();
      this.model().selection.selectZone({ cell: position, zone: newZone });
    },
    "Ctrl+ ": () => {
      const sheetId = this.model().getters.getActiveSheetId();
      const newZone = {
        ...this.model().getters.getSelectedZone(),
        top: 0,
        bottom: this.model().getters.getNumberRows(sheetId) - 1,
      };
      const position = this.model().getters.getActivePosition();
      this.model().selection.selectZone({ cell: position, zone: newZone });
    },
    "Ctrl+D": () => {
      handleCopyPasteResult(this.model(), this.env, { type: "COPY_PASTE_CELLS_ABOVE" });
    },
    "Ctrl+R": () => {
      handleCopyPasteResult(this.model(), this.env, { type: "COPY_PASTE_CELLS_ON_LEFT" });
    },
    "Ctrl+Enter": () => {
      handleCopyPasteResult(this.model(), this.env, { type: "COPY_PASTE_CELLS_ON_ZONE" });
    },
    "Ctrl+H": () => this.sidePanel.open("FindAndReplace", {}),
    "Ctrl+F": () => this.sidePanel.open("FindAndReplace", {}),
    "Ctrl+Shift+E": () => this.setHorizontalAlign("center"),
    "Ctrl+Shift+L": () => this.setHorizontalAlign("left"),
    "Ctrl+Shift+R": () => this.setHorizontalAlign("right"),
    "Ctrl+Shift+V": () => PASTE_AS_VALUE_ACTION(this.model(), this.env),
    "Ctrl+Shift+<": () => this.clearFormatting(), // for qwerty
    "Ctrl+<": () => this.clearFormatting(), // for azerty
    "Ctrl+Shift+ ": () => {
      this.model().selection.selectAll();
    },
    "Ctrl+Alt+=": () => {
      const activeCols = this.model().getters.getActiveCols();
      const activeRows = this.model().getters.getActiveRows();
      const isSingleSelection = this.model().getters.getSelectedZones().length === 1;
      const areFullCols = activeCols.size > 0 && isSingleSelection;
      const areFullRows = activeRows.size > 0 && isSingleSelection;
      if (areFullCols && !areFullRows) {
        INSERT_COLUMNS_BEFORE_ACTION(this.model());
      } else if (areFullRows && !areFullCols) {
        INSERT_ROWS_BEFORE_ACTION(this.model());
      }
    },
    "Ctrl+Alt+-": () => {
      const columns = [...this.model().getters.getActiveCols()];
      const rows = [...this.model().getters.getActiveRows()];
      if (columns.length > 0 && rows.length === 0) {
        this.model().dispatch("REMOVE_COLUMNS_ROWS", {
          sheetId: this.model().getters.getActiveSheetId(),
          sheetName: this.model().getters.getActiveSheetName(),
          dimension: "COL",
          elements: columns,
        });
      } else if (rows.length > 0 && columns.length === 0) {
        this.model().dispatch("REMOVE_COLUMNS_ROWS", {
          sheetId: this.model().getters.getActiveSheetId(),
          sheetName: this.model().getters.getActiveSheetName(),
          dimension: "ROW",
          elements: rows,
        });
      }
    },
    "Shift+PageDown": () => {
      this.model().dispatch("ACTIVATE_NEXT_SHEET");
    },
    "Shift+PageUp": () => {
      this.model().dispatch("ACTIVATE_PREVIOUS_SHEET");
    },
    "Shift+F11": () => {
      insertSheet.execute?.(this.model(), this.env);
    },
    "Alt+T": () => {
      insertTable.execute?.(this.model(), this.env);
    },
    PageDown: () => this.model().dispatch("SHIFT_VIEWPORT_DOWN"),
    PageUp: () => this.model().dispatch("SHIFT_VIEWPORT_UP"),
    "Ctrl+Shift+K": () => {
      this.closeMenu();
      INSERT_LINK(this.model(), this.env);
    },
    "Alt+Shift+ArrowRight": () => this.processHeaderGroupingKey("right"),
    "Alt+Shift+ArrowLeft": () => this.processHeaderGroupingKey("left"),
    "Alt+Shift+ArrowUp": () => this.processHeaderGroupingKey("up"),
    "Alt+Shift+ArrowDown": () => this.processHeaderGroupingKey("down"),
  };

  private focusComposerFromActiveCell() {
    const cell = this.model().getters.getActiveCell();
    cell.type === CellValueType.empty
      ? this.onComposerCellFocused()
      : this.onComposerContentFocused();
  }

  private editOrMoveInSelection(direction: "up" | "down") {
    if (this.isSingleCellOrMergeSelection()) {
      this.focusComposerFromActiveCell();
      return;
    }
    moveAnchorWithinSelection(this.model().getters, this.model().selection, direction);
  }

  private moveInSelection(direction: "left" | "right") {
    if (this.isSingleCellOrMergeSelection()) {
      this.model().selection.moveAnchorCell(direction, 1);
      return;
    }
    moveAnchorWithinSelection(this.model().getters, this.model().selection, direction);
  }

  private isSingleCellOrMergeSelection(): boolean {
    const sheetId = this.model().getters.getActiveSheetId();
    const selectedZone = this.model().getters.getSelectedZone();
    return this.model().getters.isSingleCellOrMerge(sheetId, selectedZone);
  }

  focusDefaultElement() {
    if (
      !this.model().getters.getSelectedFigureIds().length &&
      this.composerFocusStore.activeComposer.editionMode === "inactive"
    ) {
      this.DOMFocusableElementStore.focus();
    }
  }

  get gridEl(): HTMLElement {
    const el = this.gridRef();
    if (!el) {
      throw new Error("Grid el is not defined.");
    }
    return el;
  }

  getAutofillPosition() {
    const zone = this.model().getters.getSelectedZone();
    const rect = this.model().getters.getVisibleRect(zone);
    return {
      x: rect.x + rect.width - AUTOFILL_EDGE_LENGTH / 2,
      y: rect.y + rect.height - AUTOFILL_EDGE_LENGTH / 2,
    };
  }

  get isAutofillVisible(): boolean {
    if (this.model().getters.isCurrentSheetLocked()) {
      return false;
    }
    const zone = this.model().getters.getSelectedZone();
    const rect = this.model().getters.getVisibleRect({
      left: zone.right,
      right: zone.right,
      top: zone.bottom,
      bottom: zone.bottom,
    });
    return !(rect.width === 0 || rect.height === 0);
  }

  onGridResized() {
    const { height, width } = this.props.getGridSize();
    this.model().dispatch("RESIZE_SHEETVIEW", {
      width: width - HEADER_WIDTH,
      height: height - HEADER_HEIGHT,
      gridOffsetX: HEADER_WIDTH,
      gridOffsetY: HEADER_HEIGHT,
    });
  }

  private moveCanvas(deltaX: number, deltaY: number) {
    const { scrollX, scrollY } = this.model().getters.getActiveSheetScrollInfo();
    this.model().dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX + deltaX,
      offsetY: scrollY + deltaY,
    });
  }

  private processSpaceKey(ev: KeyboardEvent) {
    if (this.model().getters.hasBooleanValidationInZones(this.model().getters.getSelectedZones())) {
      ev.preventDefault();
      ev.stopPropagation();
      this.model().dispatch("TOGGLE_CHECKBOX", {
        sheetId: this.model().getters.getActiveSheetId(),
        target: this.model().getters.getSelectedZones(),
      });
    }
  }

  getClientPositionKey(client: Client) {
    return `${client.id}-${client.position?.sheetId}-${client.position?.col}-${client.position?.row}`;
  }

  isCellHovered(col: HeaderIndex, row: HeaderIndex): boolean {
    return this.hoveredCell.col === col && this.hoveredCell.row === row;
  }

  get focusedClients() {
    return this.clientFocusStore.focusedClients;
  }

  private getGridRect(): Rect {
    const zoom = this.model().getters.getViewportZoomLevel();
    const { width, height } = this.model().getters.getSheetViewDimensionWithHeaders();
    return {
      ...getElBoundingRect(this.gridRef()),
      width: width * zoom,
      height: height * zoom,
    };
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  onCellClicked(
    col: HeaderIndex,
    row: HeaderIndex,
    modifiers: GridClickModifiers,
    zoomedMouseEvent: ZoomedMouseEvent<PointerEvent>
  ) {
    zoomedMouseEvent.ev.preventDefault();
    if (this.composerFocusStore.activeComposer.editionMode === "editing") {
      this.composerFocusStore.activeComposer.stopEdition();
    }
    if (modifiers.expandZone) {
      this.model().selection.setAnchorCorner(col, row);
    } else if (modifiers.addZone) {
      this.model().selection.addCellToSelection(col, row);
    } else {
      this.model().selection.selectCell(col, row);
    }

    if (this.env.isMobile()) {
      return;
    }

    let prevCol = col;
    let prevRow = row;

    const onMouseMove = (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => {
      // When selecting cells during the edition, we don't want to avoid the default
      // browser behaviour that will select the text inside the composer
      // (see related commit msg for more information)
      ev.preventDefault();
      if ((col !== prevCol && col !== -1) || (row !== prevRow && row !== -1)) {
        prevCol = col === -1 ? prevCol : col;
        prevRow = row === -1 ? prevRow : row;
        this.model().selection.setAnchorCorner(prevCol, prevRow);
      }
    };
    const onMouseUp = () => {
      this.model().selection.commitSelection();
      if (this.paintFormatStore.isActive) {
        this.paintFormatStore.pasteFormat(this.model().getters.getSelectedZones());
      }
    };
    this.dragNDropGrid.start(zoomedMouseEvent, onMouseMove, onMouseUp);
  }

  onCellDoubleClicked(col: HeaderIndex, row: HeaderIndex) {
    const sheetId = this.model().getters.getActiveSheetId();
    ({ col, row } = this.model().getters.getMainCellPosition({ sheetId, col, row }));
    const cell = this.model().getters.getEvaluatedCell({ sheetId, col, row });
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

    updateSelectionWithArrowKeys(ev, this.model().selection);

    if (this.paintFormatStore.isActive) {
      this.paintFormatStore.pasteFormat(this.model().getters.getSelectedZones());
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
    // Space key is handled separately because the default and the propagation
    // of the event should be stopped conditionally (presence of a validation rule)
    if (keyDownString === " ") {
      this.processSpaceKey(ev);
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
    const lastZone = this.model().getters.getSelectedZone();
    const { left: col, top: row } = lastZone;
    let type: ContextMenuType = "CELL";
    this.composerFocusStore.activeComposer.stopEdition();
    if (this.model().getters.getActiveCols().has(col)) {
      type = "COL";
    } else if (this.model().getters.getActiveRows().has(row)) {
      type = "ROW";
    }
    const { x, y, width } = this.model().getters.getVisibleRectWithZoom(lastZone);
    const gridRect = this.getGridRect();
    this.toggleContextMenu(type, gridRect.x + x + width, gridRect.y + y);
  }

  onCellRightClicked(col: HeaderIndex, row: HeaderIndex, { x, y }: DOMCoordinates) {
    const zones = this.model().getters.getSelectedZones();
    const lastZone = zones[zones.length - 1];
    let type: ContextMenuType = "CELL";
    if (!isInside(col, row, lastZone)) {
      this.model().selection.getBackToDefault();
      this.model().selection.selectCell(col, row);
    } else {
      if (this.model().getters.getActiveCols().has(col)) {
        type = "COL";
      } else if (this.model().getters.getActiveRows().has(row)) {
        type = "ROW";
      }
    }
    this.toggleContextMenu(type, x, y);
  }

  /**
   * expects x and y coordinates in true pixels (not zoomed)
   */
  toggleContextMenu(type: ContextMenuType, x: Pixel, y: Pixel) {
    if (this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }
    this.menuState.isOpen = true;
    this.menuState.anchorRect = { x, y, width: 0, height: 0 };
    this.menuState.menuItems = registries[type].getMenuItems();
  }

  async copy(cut: boolean, ev: ClipboardEvent) {
    if (!this.gridEl.contains(document.activeElement)) {
      return;
    }

    /* If we are currently editing a cell, let the default behavior */
    if (this.composerFocusStore.activeComposer.editionMode !== "inactive") {
      return;
    }
    if (cut) {
      interactiveCut(this.model(), this.env);
    } else {
      this.model().dispatch("COPY");
    }
    const osContent = await this.model().getters.getClipboardTextAndImageContent();
    await this.env.clipboard.write(osContent);
    ev.preventDefault();
  }

  async paste(ev: ClipboardEvent) {
    if (!this.gridEl.contains(document.activeElement)) {
      return;
    }

    ev.preventDefault();

    const clipboardData = ev.clipboardData;
    if (!clipboardData) {
      return;
    }
    const image = [...clipboardData.files]?.find((file) =>
      AllowedImageMimeTypes.includes(file.type as (typeof AllowedImageMimeTypes)[number])
    );
    const osClipboard = {
      content: {
        [ClipboardMIMEType.PlainText]: clipboardData?.getData(ClipboardMIMEType.PlainText),
        [ClipboardMIMEType.Html]: clipboardData?.getData(ClipboardMIMEType.Html),
      },
    };
    if (image) {
      // TODO: support import of multiple images
      osClipboard.content[image.type] = image;
    }

    const target = this.model().getters.getSelectedZones();
    const isCutOperation = this.model().getters.isCutOperation();

    const clipboardId = this.model().getters.getClipboardId();
    const htmlClipboardId = getOSheetClipboardIdFromHTML(
      osClipboard.content[ClipboardMIMEType.Html]
    );
    if (clipboardId === htmlClipboardId) {
      interactivePaste(this.model(), this.env, target);
    } else {
      const osClipboardContent = parseOSClipboardContent(osClipboard.content);
      await interactivePasteFromOS(this.model(), this.env, target, osClipboardContent);
    }
    if (isCutOperation) {
      await this.env.clipboard.write({ [ClipboardMIMEType.PlainText]: "" });
    }
  }

  private clearFormatting() {
    this.model().dispatch("CLEAR_FORMATTING", {
      sheetId: this.model().getters.getActiveSheetId(),
      target: this.model().getters.getSelectedZones(),
    });
  }

  private setHorizontalAlign(align: Align) {
    this.model().dispatch("SET_FORMATTING", {
      sheetId: this.model().getters.getActiveSheetId(),
      target: this.model().getters.getSelectedZones(),
      style: { align },
    });
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.focusDefaultElement();
  }

  private processHeaderGroupingKey(direction: Direction) {
    if (this.model().getters.getSelectedZones().length !== 1) {
      return;
    }

    const selectingRows = this.model().getters.getActiveRows().size > 0;
    const selectingCols = this.model().getters.getActiveCols().size > 0;

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
    const sheetId = this.model().getters.getActiveSheetId();

    const zone = this.model().getters.getSelectedZone();
    const start = dimension === "COL" ? zone.left : zone.top;
    const end = dimension === "COL" ? zone.right : zone.bottom;

    switch (direction) {
      case "right":
        this.model().dispatch("GROUP_HEADERS", { sheetId, dimension: dimension, start, end });
        break;
      case "left":
        this.model().dispatch("UNGROUP_HEADERS", { sheetId, dimension: dimension, start, end });
        break;
      case "down":
        this.model().dispatch("UNFOLD_HEADER_GROUPS_IN_ZONE", { sheetId, dimension, zone });
        break;
      case "up":
        this.model().dispatch("FOLD_HEADER_GROUPS_IN_ZONE", { sheetId, dimension, zone });
        break;
    }
  }

  private processHeaderGroupingEventOnWholeSheet(direction: Direction) {
    const sheetId = this.model().getters.getActiveSheetId();
    if (direction === "up") {
      this.model().dispatch("FOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "ROW" });
      this.model().dispatch("FOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "COL" });
    } else if (direction === "down") {
      this.model().dispatch("UNFOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "ROW" });
      this.model().dispatch("UNFOLD_ALL_HEADER_GROUPS", { sheetId, dimension: "COL" });
    }
  }

  private processHeaderGroupingEventOnGrid(direction: Direction) {
    const sheetId = this.model().getters.getActiveSheetId();
    const zone = this.model().getters.getSelectedZone();
    switch (direction) {
      case "down":
        this.model().dispatch("UNFOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "ROW",
          zone: zone,
        });
        this.model().dispatch("UNFOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "COL",
          zone: zone,
        });
        break;
      case "up":
        this.model().dispatch("FOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "ROW",
          zone: zone,
        });
        this.model().dispatch("FOLD_HEADER_GROUPS_IN_ZONE", {
          sheetId,
          dimension: "COL",
          zone: zone,
        });
        break;
      case "right": {
        const { x, y, width } = this.model().getters.getVisibleRectWithZoom(zone);
        const gridRect = this.getGridRect();
        this.toggleContextMenu("GROUP_HEADERS", x + width + gridRect.x, y + gridRect.y);
        break;
      }
      case "left": {
        if (!canUngroupHeaders(this.model(), "COL") && !canUngroupHeaders(this.model(), "ROW")) {
          return;
        }
        const { x, y, width } = this.model().getters.getVisibleRectWithZoom(zone);
        const gridRect = this.getGridRect();
        this.toggleContextMenu("UNGROUP_HEADERS", x + width + gridRect.x, y + gridRect.y);
        break;
      }
    }
  }

  onComposerCellFocused(content?: string, selection?: ComposerSelection) {
    this.composerFocusStore.focusActiveComposer({ content, selection, focusMode: "cellFocus" });
  }

  onComposerContentFocused() {
    this.composerFocusStore.focusActiveComposer({ focusMode: "contentFocus" });
  }

  get staticTables(): Table[] {
    const sheetId = this.model().getters.getActiveSheetId();
    return this.model().getters.getCoreTables(sheetId).filter(isStaticTable);
  }

  get displaySelectionHandler() {
    return this.env.isMobile() && this.composerFocusStore.activeComposer.editionMode === "inactive";
  }
}
