import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { toZone } from "../../../helpers/zones";
import { clickableCellRegistry } from "../../../registries/cell_clickable_registry";
import { useStore } from "../../../store_engine/store_hooks";
import {
  DataLayerRenderer,
  getDataLayerCellPosition,
} from "../../../stores/data_layer_renderer_store";
import { DataLayerDefinition } from "../../../types/data_layer";
import { FigureUI } from "../../../types/figure";
import { CellPosition, CSSProperties } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { FilterMenu } from "../../filters/filter_menu/filter_menu";
import { FullScreenFigureStore } from "../../full_screen_figure/full_screen_figure_store";
import { Popover } from "../../popover/popover";
import { HoveredTableStore } from "../../tables/hovered_table_store";

interface Props {
  figureUI: FigureUI;
  editFigureStyle?: (properties: CSSProperties) => void;
  isFullScreen?: boolean;
  openContextMenu?: (anchorRect: Rect, onClose?: () => void) => void;
}

export class DataLayerFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataLayerFigure";
  static props = {
    figureUI: Object,
    editFigureStyle: { type: Function, optional: true },
    isFullScreen: { type: Boolean, optional: true },
    openContextMenu: { type: Function, optional: true },
  };
  static components = { FilterMenu, Popover };

  private canvasRef = useRef("dataLayerCanvas");

  private filterPopover = useState<{
    isOpen: boolean;
    anchorRect: Rect;
    filterPosition: { col: number; row: number };
    sheetId?: string;
  }>({
    isOpen: false,
    anchorRect: { x: 0, y: 0, width: 0, height: 0 },
    filterPosition: { col: 0, row: 0 },
  });

  private dataLayerRenderer!: Store<DataLayerRenderer>;
  private hoveredTableStore!: Store<HoveredTableStore>;
  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  setup(): void {
    this.dataLayerRenderer = useStore(DataLayerRenderer);
    this.hoveredTableStore = useStore(HoveredTableStore);
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);

    useEffect(() => {
      this.renderDataLayer();
    });
  }

  get definition(): DataLayerDefinition {
    return this.env.model.getters.getDataLayer(this.props.figureUI.id);
  }

  onDoubleClick() {
    this.env.model.dispatch("SELECT_FIGURE", { figureId: this.props.figureUI.id });
    this.env.openSidePanel("DataLayerPanel", { figureId: this.props.figureUI.id });
  }

  toggleFullScreen() {
    this.fullScreenFigureStore.toggleFullScreenFigure(this.props.figureUI.id);
  }

  private getCellFromMouseEvent(event: MouseEvent): CellPosition | undefined {
    const canvas = this.canvasRef.el as HTMLCanvasElement | null;
    if (!canvas) {
      return undefined;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;
    const def = this.definition;
    const zone = toZone(def.rangeXc);
    const rect = { x: 0, y: 0, width: canvasRect.width, height: canvasRect.height };
    return getDataLayerCellPosition(this.env.model.getters, def.sheetId, zone, rect, x, y);
  }

  onClick(event: MouseEvent) {
    const position = this.getCellFromMouseEvent(event);
    if (!position) {
      return;
    }
    const icon = this.getClickableIconAtPosition(position);
    if (icon?.onClick) {
      if (icon.type === "filter_icon" && this.props.isFullScreen) {
        this.filterPopover.isOpen = true;
        this.filterPopover.anchorRect = {
          x: event.clientX,
          y: event.clientY,
          width: 0,
          height: 0,
        };
        this.filterPopover.filterPosition = { col: position.col, row: position.row };
        this.filterPopover.sheetId = position.sheetId;
      } else {
        icon.onClick(position, this.env);
      }
      return;
    }
    const clickableItem = this.getClickableItemAtPosition(position);
    if (clickableItem) {
      clickableItem.execute(position, this.env);
    }
  }

  onMouseMove(event: MouseEvent) {
    const canvas = this.canvasRef.el as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const position = this.getCellFromMouseEvent(event);
    const icon = position ? this.getClickableIconAtPosition(position) : undefined;
    const clickable = position
      ? icon?.onClick || this.getClickableItemAtPosition(position)
      : undefined;
    canvas.style.cursor = clickable ? "pointer" : "";
    if (position) {
      this.hoveredTableStore.hover(position);
    }
  }

  onMouseLeave() {
    this.hoveredTableStore.clear();
  }

  onContextMenu(event: MouseEvent) {
    const position = this.getCellFromMouseEvent(event);
    if (position) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.env.model.getters.getActiveSheetId(),
        sheetIdTo: position.sheetId,
      });
      this.env.model.selection.selectCell(position.col, position.row);
      this.props.openContextMenu?.({
        x: event.clientX,
        y: event.clientY,
        width: 0,
        height: 0,
      });
    }
  }

  closeFilterPopover() {
    this.filterPopover.isOpen = false;
  }

  private getClickableIconAtPosition(position: CellPosition) {
    const icons = this.env.model.getters.getCellIcons(position);
    return icons.find((icon) => icon?.onClick);
  }

  private getClickableItemAtPosition(position: CellPosition) {
    const getters = this.env.model.getters;
    const items = clickableCellRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
    for (const item of items) {
      if (item.condition(position, getters)) {
        return item;
      }
    }
    return undefined;
  }

  private renderDataLayer() {
    // Read reactive state so OWL re-runs this effect when hover changes
    void this.hoveredTableStore.col;
    void this.hoveredTableStore.row;

    const canvas = this.canvasRef.el as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.scale(dpr, dpr);
    const def = this.definition;
    const zone = toZone(def.rangeXc);
    const paddingBg = this.env.model.getters.getSpreadsheetTheme().backgroundColor;
    this.dataLayerRenderer.render(
      ctx,
      def.sheetId,
      zone,
      { x: 0, y: 0, width: rect.width, height: rect.height },
      {
        paddingBackground: paddingBg,
        hideGridLines: this.env.isDashboard(),
        hideFilterIcons: !this.props.isFullScreen,
      }
    );
  }
}
