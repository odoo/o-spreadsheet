import { usePlugin } from "@odoo/owl";
import { useStore } from "../../../store_engine/store_hooks";
import { ChartDragStore } from "../../../stores/chart_drag_store";
import { ViewportsStore } from "../../../stores/viewports_store";
import { FigureUI } from "../../../types/figure";
import { Rect } from "../../../types/rendering";
import { Store } from "../../../types/store_engine";
import { cssPropertiesToCss } from "../../helpers/css";
import { OSComponent } from "../../os_component";
import { FigureComponent } from "../figure/figure";
import { DraggedFigurePlugin } from "./figure_dnd_owl_plugin";

type ContainerType = "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "dnd";

interface Container {
  type: ContainerType;
  figures: FigureUI[];
  style: string;
  inverseViewportStyle: string;
}

export class FiguresDragAndDropContainer extends OSComponent {
  static template = "o-spreadsheet-FiguresDragAndDropContainer";
  static components = { FigureComponent };

  private viewStore!: Store<ViewportsStore>;
  private chartDragStore!: Store<ChartDragStore>;

  figureDndPlugin = usePlugin(DraggedFigurePlugin);

  setup() {
    this.viewStore = useStore(ViewportsStore);
    this.chartDragStore = useStore(ChartDragStore);
  }

  get container(): Container | undefined {
    // if (this.figureDndPlugin.dnd.selectedFigures) {
    return {
      type: "dnd",
      figures: this.figureDndPlugin.dnd.selectedFigures || [],
      style: this.getContainerStyle("dnd"),
      inverseViewportStyle: this.getInverseViewportPositionStyle("dnd"),
    };
    // }

    // return undefined;
  }

  private getContainerStyle(container: ContainerType): string {
    return this.rectToCss(this.getContainerRect(container));
  }

  private rectToCss(rect: Rect): string {
    return cssPropertiesToCss({
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  private getContainerRect(container: ContainerType): Rect {
    const { width: viewWidth, height: viewHeight } = this.viewStore.sheetViewDimension;

    const x = 0;
    const width = viewWidth - x;
    const y = 0;
    const height = viewHeight - y;

    return { x, y, width, height };
  }

  get selectedRectStyle(): string {
    return this.figureDndPlugin.dnd.selectedRect
      ? this.rectToCss(this.figureDndPlugin.dnd.selectedRect)
      : "";
  }

  private getInverseViewportPositionStyle(container: ContainerType): string {
    // const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;

    const left = 0;
    const top = 0;

    if (container === "dnd") {
      // left = -scrollX;
      // top = -scrollY;
    }

    return cssPropertiesToCss({
      left: `${left}px`,
      top: `${top}px`,
    });
  }

  getFigureStyle(figureUI: FigureUI): string {
    if (figureUI.id !== this.figureDndPlugin.dnd.draggedFigure?.id) {
      return "";
    }
    return cssPropertiesToCss({
      opacity: this.chartDragStore.highlightedFigureId ? "0.6" : "0.9",
      cursor: "grabbing",
    });
  }

  getFigureClass(figureUI: FigureUI): string {
    if (figureUI.id !== this.chartDragStore.highlightedFigureId) {
      return "";
    }
    return "o-add-to-carousel";
  }
}
