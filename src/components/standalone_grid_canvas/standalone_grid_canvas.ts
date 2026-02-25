import { DOMDimension, GridRenderingContext, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { SCROLLBAR_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillStart, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { Store, useLocalStore } from "../../store_engine";
import { RendererStore } from "../../stores/renderer_store";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { HorizontalScrollBar, VerticalScrollBar } from "../scrollbar/";
import { FigureRendererStore } from "./figure_renderer_store";

interface Props {
  sheetId: UID;
  zone: Zone;
  renderingCtx?: Partial<GridRenderingContext>;
  dpr?: number;
  drawFiguresOnCanvas?: boolean;
  canvasSize?: DOMDimension;
}

export class StandaloneGridCanvas extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneGridCanvas";
  static props = {
    sheetId: String,
    zone: Object,
    renderingCtx: { type: Object, optional: true },
    dpr: { type: Number, optional: true },
    drawFiguresOnCanvas: { type: Boolean, optional: true },
    canvasSize: { type: Object, optional: true },
  };
  static components = { VerticalScrollBar, HorizontalScrollBar };

  canvasRef = useRef("canvas");

  rendererStore!: Store<RendererStore>;
  figureRendererStore!: Store<FigureRendererStore>;

  private viewports!: ViewportCollection;

  state = useState({ aaaa: 0 });
  onMouseWheel!: (ev: WheelEvent) => void;

  setup() {
    this.rendererStore = useLocalStore(RendererStore, ["Background", "Chart", "Headers"]);
    // Note: if we ever want to change the value of props.drawFiguresOnCanvas, we'd need to manually dispose the figureRendererStore
    if (this.props.drawFiguresOnCanvas) {
      this.figureRendererStore = useLocalStore(FigureRendererStore, this.rendererStore);
    }
    useGridDrawing({
      refName: "canvas",
      model: this.env.model,
      dpr: this.props.dpr,
      partialRenderingCtx: () => ({
        ...(this.props.renderingCtx || {}),
        viewports: this.viewports,
      }),
      rendererStore: this.rendererStore,
      changeCanvasSizeOnZoom: true,
    });
    onWillStart(async () => await this.loadImages(this.props));
    onWillUpdateProps(async (nextProps: Props) => await this.loadImages(nextProps));
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      const { scrollX, scrollY } = this.viewports.getSheetScrollInfo(this.props.sheetId);
      this.viewports.setSheetViewOffset(this.props.sheetId, scrollX + deltaX, scrollY + deltaY);
      this.state.aaaa++; // Force update to redraw the grid with the new viewport offset
    });

    const sheetId = this.props.sheetId;
    const zone = this.props.zone;
    const firstRowStart = this.env.model.getters.getRowDimensions(sheetId, zone.top).start;
    const lastRowEnd = this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end;
    const firstColStart = this.env.model.getters.getColDimensions(sheetId, zone.left).start;
    const lastColEnd = this.env.model.getters.getColDimensions(sheetId, zone.right).end;

    const viewports = new ViewportCollection(this.env.model.getters, "standalone", this.props.zone);
    viewports.sheetViewWidth =
      (this.props.canvasSize?.width || lastColEnd - firstColStart) - SCROLLBAR_WIDTH;
    viewports.sheetViewHeight =
      (this.props.canvasSize?.height || lastRowEnd - firstRowStart) - SCROLLBAR_WIDTH;
    viewports.setSheetViewOffset(sheetId, firstColStart, firstRowStart);
    this.viewports = viewports;
  }

  private async loadImages(props: Props) {
    const sheetView = this.viewports;

    const imagePaths = sheetView
      .getVisibleFigures(props.sheetId)
      .filter((figure) => figure.tag === "image")
      .map((figure) => this.env.model.getters.getImagePath(figure.id))
      .filter((path) => path && !this.figureRendererStore.loadedImages[path]);

    await Promise.all(
      imagePaths.map(async (path) => {
        const response = await fetch(path);
        const blob = await response.blob();
        this.figureRendererStore.addLoadedImage(path, await createImageBitmap(blob));
      })
    );
  }

  get scrollBarProps() {
    return {
      viewports: this.viewports,
      selectionState: this.env.model.getters.getSelectionState(),
      onScroll: (offsetX: number, offsetY: number) => {
        this.viewports.setSheetViewOffset(this.props.sheetId, offsetX, offsetY);
        this.state.aaaa++; // Force update to redraw the grid with the new viewport offset
      },
    };
  }
}
