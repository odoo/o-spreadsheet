import { onMounted, onWillUpdateProps, usePlugin } from "@odoo/owl";
import { render } from "../../../helpers/owl3_helpers";
import { useStore } from "../../../store_engine/store_hooks";
import { ChartDragStore } from "../../../stores/chart_drag_store";
import { ViewportsStore } from "../../../stores/viewports_store";
import { AnchorOffset, Figure, FigureUI, ResizeDirection } from "../../../types/figure";
import { UID } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { Store } from "../../../types/store_engine";
import { cssPropertiesToCss, rectToCss } from "../../helpers/css";
import { isCtrlKey, isMobileOS } from "../../helpers/dom_helpers";
import { OSComponent } from "../../os_component";
import { FigureComponent } from "../figure/figure";
import { DraggedFigurePlugin } from "../figure_dnd_container/figure_dnd_owl_plugin";

type ContainerType = "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "none";

interface Container {
  type: ContainerType;
  figures: FigureUI[];
  style: string;
  inverseViewportStyle: string;
}

/**
 * Each figure ⭐ is positioned inside a container `div` placed and sized
 * according to the split pane the figure is part of, or a separate container for the figure
 * currently drag & dropped. Any part of the figure outside of the container is hidden
 * thanks to its `overflow: hidden` property.
 *
 * Additionally, the figure is placed inside a "inverse viewport" `div` 🟥.
 * Its position represents the viewport position in the grid: its top/left
 * corner represents the top/left corner of the grid.
 *
 * It allows to position the figure inside this div regardless of the
 * (possibly freezed) viewports and the scrolling position.
 *
 * --: container limits
 * 🟥: inverse viewport
 * ⭐: figure top/left position
 *
 *                     container
 *                         ↓
 * |🟥--------------------------------------------
 * |  \                                          |
 * |   \                                         |
 * |    \                                        |
 * |     \          visible area                 |  no scroll
 * |      ⭐                                     |
 * |                                             |
 * |                                             |
 * -----------------------------------------------
 *
 * the scrolling of the pane is applied as an inverse offset
 * to the div which will in turn move the figure up and down
 * inside the container.
 * Hence, once the figure position is (resp. partly) out of
 * the container dimensions, it will be (resp. partly) hidden.
 *
 * The same reasoning applies to the horizontal axis.
 *
 *  🟥 ························
 *    \                       ↑
 *     \                      |
 *      \                     | inverse viewport = -1 * scroll of pane
 *       \                    |
 *        ⭐ <- not visible   |
 *                            ↓
 * -----------------------------------------------
 * |                                             |
 * |                                             |
 * |                                             |
 * |               visible area                  |
 * |                                             |
 * |                                             |
 * |                                             |
 * -----------------------------------------------
 *
 * In the case the d&d figure container, the container is the same as the "topLeft" container for
 * frozen pane (unaffected by scroll and always visible). The figure coordinates are transformed
 * for this container at the start of the d&d, and transformed back at the end to adapt to the scroll
 * that occurred during the drag & drop, and to position the figure on the correct pane.
 *
 */
export class FiguresContainer extends OSComponent {
  static template = "o-spreadsheet-FiguresContainer";
  static components = { FigureComponent };

  private viewStore!: Store<ViewportsStore>;
  private chartDragStore!: Store<ChartDragStore>;
  private draggedFigurePlugin = usePlugin(DraggedFigurePlugin);

  setup() {
    this.viewStore = useStore(ViewportsStore);
    this.chartDragStore = useStore(ChartDragStore);
    onMounted(() => {
      // horrible, but necessary
      // the following line ensures that we render the figures with the correct
      // viewport.  The reason is that whenever we initialize the grid
      // component, we do not know yet the actual size of the viewport, so the
      // first owl rendering is done with an empty viewport.  Only then we can
      // compute which figures should be displayed, so we have to force a
      // new rendering
      render(this);
    });
    onWillUpdateProps(() => {
      const sheetId = this.model().getters.getActiveSheetId();
      const draggedFigureId = this.draggedFigurePlugin.dnd.draggedFigure?.id;
      if (draggedFigureId && !this.model().getters.getFigure(sheetId, draggedFigureId)) {
        this.draggedFigurePlugin.stopDragAndDrop();
      }
    });
  }

  private getVisibleFigures(): FigureUI[] {
    return this.viewStore.visibleFigures;
  }

  get containers(): Container[] {
    const visibleFigures = this.getVisibleFigures();
    const containers: Container[] = [];

    for (const containerType of [
      "topLeft",
      "topRight",
      "bottomLeft",
      "bottomRight",
    ] as ContainerType[]) {
      const containerFigures = visibleFigures.filter(
        (figure) => this.getFigureContainer(figure) === containerType
      );

      if (containerFigures.length > 0) {
        containers.push({
          type: containerType,
          figures: containerFigures,
          style: this.getContainerStyle(containerType),
          inverseViewportStyle: this.getInverseViewportPositionStyle(containerType),
        });
      }
    }

    return containers;
  }

  private getContainerStyle(container: ContainerType): string {
    return cssPropertiesToCss(rectToCss(this.getContainerRect(container)));
  }

  private getContainerRect(container: ContainerType): Rect {
    const { width: viewWidth, height: viewHeight } = this.viewStore.sheetViewDimension;
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;

    const x = ["bottomRight", "topRight"].includes(container) ? viewportX : 0;
    const width = viewWidth - x;
    const y = ["bottomRight", "bottomLeft"].includes(container) ? viewportY : 0;
    const height = viewHeight - y;

    return { x, y, width, height };
  }

  private getInverseViewportPositionStyle(container: ContainerType): string {
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;

    let left = 0;
    let top = 0;

    if (["bottomRight", "topRight"].includes(container)) {
      left = -scrollX - viewportX;
    }
    if (["bottomRight", "bottomLeft"].includes(container)) {
      top = -scrollY - viewportY;
    }

    return cssPropertiesToCss({
      left: `${left}px`,
      top: `${top}px`,
    });
  }

  private getFigureContainer(figureUI: FigureUI): ContainerType {
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;
    if (this.draggedFigurePlugin.dnd.selectedFigures?.some((f) => f.id === figureUI.id)) {
      return "none";
    } else if (figureUI.x < viewportX && figureUI.y < viewportY) {
      return "topLeft";
    } else if (figureUI.x < viewportX) {
      return "bottomLeft";
    } else if (figureUI.y < viewportY) {
      return "topRight";
    } else {
      return "bottomRight";
    }
  }

  private isMenuClick(ev: MouseEvent): boolean {
    const target = ev.target;
    if (target && target instanceof Element) {
      return !!target.closest(".o-figure-menu");
    }
    return false;
  }

  startDraggingFigure(figureUI: FigureUI, ev: MouseEvent) {
    if (ev.button > 0 || this.model().getters.isReadonly() || this.isMenuClick(ev)) {
      // not main button, probably a context menu and no d&d in readonly mode
      return;
    }
    const selected = this.model().getters.getSelectedFigureIds().includes(figureUI.id);
    if (!selected) {
      const selectResult = this.model().dispatch("SELECT_FIGURE", {
        figureId: figureUI.id,
        selectMultiple: ev.shiftKey || isCtrlKey(ev),
      });
      if (!selectResult.isSuccessful) {
        return;
      }
    }

    if (isMobileOS() || this.model().getters.isCurrentSheetLocked()) {
      return;
    }

    const onMouseUpWithoutDrag = () => {
      if (selected) {
        if (ev.shiftKey || isCtrlKey(ev)) {
          this.model().dispatch("UNSELECT_FIGURE", { figureId: figureUI.id });
        } else {
          this.model().dispatch("SELECT_FIGURE", { figureId: figureUI.id });
        }
      }
    };

    const onDragEnd = (droppedFigures: Figure[], overlappingFigureId: UID | undefined) => {
      const sheetId = this.model().getters.getActiveSheetId();
      const overlappingFigure = overlappingFigureId
        ? this.model().getters.getFigure(sheetId, overlappingFigureId)
        : undefined;
      if (!overlappingFigure) {
        const payloads =
          droppedFigures?.map((f) => {
            return { sheetId, figureId: f.id, ...f };
          }) || [];
        this.model().dispatch("UPDATE_FIGURES", { figures: payloads });
      } else {
        const overlappingFigureId = overlappingFigure.id;
        const chartFigureIds = droppedFigures?.map((f) => f.id) || [];
        if (overlappingFigure.tag === "carousel") {
          this.model().dispatch("ADD_FIGURES_CHART_TO_CAROUSEL", {
            sheetId,
            carouselFigureId: overlappingFigureId,
            chartFigureIds: chartFigureIds,
          });
        } else if (overlappingFigure.tag === "chart") {
          this.model().dispatch("MERGE_CHART_FIGURES_INTO_CAROUSEL", {
            sheetId,
            baseFigureId: overlappingFigureId,
            chartFigureIds: [overlappingFigureId, ...chartFigureIds],
          });
        }
      }
    };
    this.draggedFigurePlugin.startDraggingFigure(figureUI, ev, { onDragEnd, onMouseUpWithoutDrag });
  }

  /**
   * Initialize the resize of the selected figures with mouse movements
   *
   * @param dirX X direction of the resize. -1 : resize from the left border of the figure, 0 : no resize in X, 1 :
   * resize from the right border of the figure
   * @param dirY Y direction of the resize. -1 : resize from the top border of the figure, 0 : no resize in Y, 1 :
   * resize from the bottom border of the figure
   * @param ev Mouse Event
   */
  resizeAllSelectedFigures(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    ev.stopPropagation();

    const onDragEnd = (droppedFigures: Figure[]) => {
      const sheetId = this.model().getters.getActiveSheetId();
      const dispatchPayload = droppedFigures.map((figure) => {
        const update: Partial<Figure> & AnchorOffset = { ...figure };
        if (dirX) {
          update.width = figure.width;
        }
        if (dirY) {
          update.height = figure.height;
        }
        return {
          sheetId,
          figureId: figure.id,
          ...update,
        };
      });
      this.model().dispatch("UPDATE_FIGURES", { figures: dispatchPayload });
    };

    this.draggedFigurePlugin.resizeAllSelectedFigures(dirX, dirY, ev, { onDragEnd });
  }

  getFigureClass(figureUI: FigureUI): string {
    if (figureUI.id !== this.chartDragStore.highlightedFigureId) {
      return "";
    }
    return "o-add-to-carousel";
  }
}
