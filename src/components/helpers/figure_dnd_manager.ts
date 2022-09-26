import { FIGURE_BORDER_WIDTH, MIN_FIG_SIZE } from "../../constants";
import { Figure, Pixel, PixelPosition, SheetScrollInfo, UID } from "../../types";

const SNAP_MARGIN: Pixel = 5;

interface FigurePosition {
  id: UID;
  x: Pixel;
  width: Pixel;
  y: Pixel;
  height: Pixel;
}

type HorizontalBorderName = "top" | "bottom" | "vCenter";
type VerticalBorderName = "right" | "left" | "hCenter";

interface HorizontalBorderPosition {
  border: HorizontalBorderName;
  position: Pixel;
}

interface VerticalBorderPosition {
  border: VerticalBorderName;
  position: Pixel;
}

interface VerticalSnapLine {
  border: VerticalBorderName;
  matchedFigs: FigurePosition[];
  x: Pixel;
}

interface HorizontalSnapLine {
  border: HorizontalBorderName;
  matchedFigs: FigurePosition[];
  y: Pixel;
}

export abstract class FigureDndManager {
  protected dnd: FigurePosition;
  protected readonly initialFigure: FigurePosition;

  protected currentHorizontalSnapLine: HorizontalSnapLine | undefined = undefined;
  protected currentVerticalSnapLine: VerticalSnapLine | undefined = undefined;

  constructor(
    draggedFigure: FigurePosition,
    protected readonly otherFigures: Figure[],
    protected readonly initialMousePosition: PixelPosition
  ) {
    this.initialFigure = { ...draggedFigure };
    this.dnd = { ...draggedFigure };
  }

  getDnd() {
    return this.dnd;
  }

  /**
   * Get the position of horizontal borders for the given figure
   *
   * @param figure the figure
   * @param borders the list of border names to return the positions of
   */
  private getHorizontalFigureBordersPositions(
    figure: FigurePosition,
    borders: HorizontalBorderName[]
  ): HorizontalBorderPosition[] {
    const allBorders: HorizontalBorderPosition[] = [
      { border: "top", position: this.getBorderPosition(figure, "top") },
      { border: "vCenter", position: this.getBorderPosition(figure, "vCenter") },
      { border: "bottom", position: this.getBorderPosition(figure, "bottom") },
    ];
    return allBorders.filter((p) => borders.includes(p.border));
  }

  /**
   * Get the position of vertical borders for the given figure
   *
   * @param figure the figure
   * @param borders the list of border names to return the positions of
   */
  private getVerticalFigureBorders(
    figure: FigurePosition,
    borders: VerticalBorderName[]
  ): VerticalBorderPosition[] {
    const allBorders: VerticalBorderPosition[] = [
      { border: "left", position: this.getBorderPosition(figure, "left") },
      { border: "hCenter", position: this.getBorderPosition(figure, "hCenter") },
      { border: "right", position: this.getBorderPosition(figure, "right") },
    ];
    return allBorders.filter((p) => borders.includes(p.border));
  }

  /**
   * Get a horizontal snap line for the given figure, if the figure can snap to any other figure
   *
   * @param dnd figure to get the snap line for
   * @param bordersOfDraggedToMatch borders of the given figure to be considered to find a snap match
   * @param bordersOfOthersToMatch borders of the other figures to be considered to find a snap match
   */
  protected getHorizontalSnapLine(
    dnd: FigurePosition,
    bordersOfDraggedToMatch: HorizontalBorderName[],
    bordersOfOthersToMatch: HorizontalBorderName[]
  ): HorizontalSnapLine | undefined {
    const dndBorders = this.getHorizontalFigureBordersPositions(dnd, bordersOfDraggedToMatch);
    let match: { match: HorizontalSnapLine; offset: number } | undefined = undefined;
    for (const matchedFig of this.otherFigures) {
      const matchedBorders = this.getHorizontalFigureBordersPositions(
        matchedFig,
        bordersOfOthersToMatch
      );

      for (const dndBorder of dndBorders) {
        for (const matchedBorder of matchedBorders) {
          if (this.canSnap(dndBorder.position, matchedBorder.position)) {
            const offset = Math.abs(dndBorder.position - matchedBorder.position);

            if (match && offset === match.offset) {
              match.match.matchedFigs.push(matchedFig);
            } else if (!match || offset <= match.offset) {
              match = {
                match: {
                  border: dndBorder.border,
                  matchedFigs: [matchedFig],
                  y: matchedBorder.position,
                },
                offset,
              };
            }
          }
        }
      }
    }
    return match?.match;
  }

  /**
   * Get a vertical snap line for the given figure, if the figure can snap to any other figure
   *
   * @param dnd figure to get the snap line for
   * @param bordersOfDraggedToMatch borders of the given figure to be considered to find  snap match
   * @param bordersOfOthersToMatch borders of the other figures to be considered to find a snap match
   */
  protected getVerticalSnapLine(
    dnd: FigurePosition,
    bordersOfDraggedToMatch: VerticalBorderName[],
    bordersOfOthersToMatch: VerticalBorderName[]
  ): VerticalSnapLine | undefined {
    const dndBorders = this.getVerticalFigureBorders(dnd, bordersOfDraggedToMatch);
    let match: { match: VerticalSnapLine; offset: number } | undefined = undefined;
    for (const matchedFig of this.otherFigures) {
      const matchedBorders = this.getVerticalFigureBorders(matchedFig, bordersOfOthersToMatch);

      for (const dndBorder of dndBorders) {
        for (const matchedBorder of matchedBorders) {
          if (this.canSnap(dndBorder.position, matchedBorder.position)) {
            const offset = Math.abs(dndBorder.position - matchedBorder.position);

            if (match && offset === match.offset) {
              match.match.matchedFigs.push(matchedFig);
            } else if (!match || offset < match.offset) {
              match = {
                match: {
                  border: dndBorder.border,
                  matchedFigs: [matchedFig],
                  x: matchedBorder.position,
                },
                offset,
              };
            }
          }
        }
      }
    }
    return match?.match;
  }

  /** Check if two borders are close enough to snap */
  private canSnap(borderPosition1: Pixel, borderPosition2: Pixel) {
    return Math.abs(borderPosition1 - borderPosition2) <= SNAP_MARGIN;
  }

  hasHorizontalSnap(): boolean {
    return !!this.currentHorizontalSnapLine;
  }

  hasVerticalSnap(): boolean {
    return !!this.currentVerticalSnapLine;
  }

  getCurrentHorizontalSnapLine(): HorizontalSnapLine | undefined {
    return this.currentHorizontalSnapLine;
  }

  getCurrentVerticalSnapLine(): VerticalSnapLine | undefined {
    return this.currentVerticalSnapLine;
  }

  /** Get the position of a border of a figure */
  protected getBorderPosition(
    fig: FigurePosition,
    border: HorizontalBorderName | VerticalBorderName
  ): Pixel {
    switch (border) {
      case "top":
        return fig.y;
      case "bottom":
        return fig.y + fig.height + FIGURE_BORDER_WIDTH;
      case "vCenter":
        return fig.y + Math.ceil((fig.height + FIGURE_BORDER_WIDTH) / 2);
      case "left":
        return fig.x;
      case "right":
        return fig.x + fig.width + FIGURE_BORDER_WIDTH;
      case "hCenter":
        return fig.x + Math.ceil((fig.width + FIGURE_BORDER_WIDTH) / 2);
    }
  }
}

export class FigureDnDMoveManager extends FigureDndManager {
  constructor(
    draggedFigure: FigurePosition,
    otherFigures: Figure[],
    initialMousePosition: PixelPosition,
    private readonly mainViewportPosition: PixelPosition
  ) {
    super(draggedFigure, otherFigures, initialMousePosition);
  }

  drag(mousePosition: PixelPosition, scrollInfo: SheetScrollInfo) {
    const initialMouseX = this.initialMousePosition.x;
    const mouseX = mousePosition.x;
    const viewportX = this.mainViewportPosition.x;

    const initialMouseY = this.initialMousePosition.y;
    const mouseY = mousePosition.y;
    const viewportY = this.mainViewportPosition.y;

    let deltaX = initialMouseX - mouseX;
    // Put the figure on the frozen pane if the mouse is over the pane
    if (mouseX > viewportX && initialMouseX < viewportX) {
      deltaX -= scrollInfo.offsetX;
    } else if (mouseX < viewportX && initialMouseX > viewportX) {
      deltaX += scrollInfo.offsetX;
    }

    let deltaY = initialMouseY - mouseY;

    // Put the figure on the frozen pane if the mouse is over the pane
    if (mouseY > viewportY && initialMouseY < viewportY) {
      deltaY -= scrollInfo.offsetY;
    } else if (mouseY < viewportY && initialMouseY > viewportY) {
      deltaY += scrollInfo.offsetY;
    }

    const x = Math.max(this.initialFigure.x - deltaX, 0);
    const y = Math.max(this.initialFigure.y - deltaY, 0);

    const dnd = { ...this.dnd, x, y };
    let dndX = x;
    const vSnap = this.getVerticalSnapLine(
      dnd,
      ["left", "right", "hCenter"],
      ["left", "right", "hCenter"]
    );
    if (vSnap) {
      const offset = this.getBorderPosition(this.dnd, vSnap.border) - this.dnd.x;
      dndX = vSnap.x - offset;
    }

    let dndY = y;
    const hSnap = this.getHorizontalSnapLine(
      dnd,
      ["top", "bottom", "vCenter"],
      ["top", "bottom", "vCenter"]
    );
    if (hSnap) {
      const offset = this.getBorderPosition(this.dnd, hSnap.border) - this.dnd.y;
      dndY = hSnap.y - offset;
    }

    this.currentHorizontalSnapLine = hSnap;
    this.currentVerticalSnapLine = vSnap;
    this.dnd.x = Math.round(dndX);
    this.dnd.y = Math.round(dndY);
  }
}

export class FigureDnDResizeManager extends FigureDndManager {
  resize(dirX: -1 | 0 | 1, dirY: -1 | 0 | 1, mousePosition: PixelPosition) {
    this.currentHorizontalSnapLine = undefined;
    this.currentVerticalSnapLine = undefined;

    const deltaX = dirX * (mousePosition.x - this.initialMousePosition.x);
    const deltaY = dirY * (mousePosition.y - this.initialMousePosition.y);

    let { width, height, x, y } = this.initialFigure;
    width = Math.max(this.initialFigure.width + deltaX, MIN_FIG_SIZE);
    height = Math.max(this.initialFigure.height + deltaY, MIN_FIG_SIZE);
    if (dirX < 0) {
      x = this.initialFigure.x - deltaX;
    }
    if (dirY < 0) {
      y = this.initialFigure.y - deltaY;
    }

    const dnd = { ...this.dnd, x, y, width, height };
    const vSnap = this.getVerticalSnapLine(dnd, [dirX < 0 ? "left" : "right"], ["left", "right"]);
    if (vSnap) {
      if (dirX > 0) {
        dnd.width = vSnap.x - dnd.x - FIGURE_BORDER_WIDTH;
      } else if (dirX < 0) {
        const rightPositionBeforeSnap = dnd.x + dnd.width;
        dnd.x = vSnap.x;
        dnd.width = rightPositionBeforeSnap - dnd.x;
      }
    }

    const hSnap = this.getHorizontalSnapLine(dnd, [dirY < 0 ? "top" : "bottom"], ["top", "bottom"]);
    if (hSnap) {
      if (dirY > 0) {
        dnd.height = hSnap.y - dnd.y - FIGURE_BORDER_WIDTH;
      } else if (dirY < 0) {
        const bottomPositionBeforeSnap = dnd.y + dnd.height;
        dnd.y = hSnap.y;
        dnd.height = bottomPositionBeforeSnap - dnd.y;
      }
    }

    this.currentHorizontalSnapLine = dirY ? hSnap : undefined;
    this.currentVerticalSnapLine = dirX ? vSnap : undefined;
    this.dnd.x = Math.round(dnd.x);
    this.dnd.y = Math.round(dnd.y);
    this.dnd.height = Math.round(dnd.height);
    this.dnd.width = Math.round(dnd.width);
  }
}
