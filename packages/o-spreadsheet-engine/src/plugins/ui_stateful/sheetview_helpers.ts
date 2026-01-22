import { isDefined, range } from "../../helpers";
import { InternalViewport } from "../../helpers/internal_viewport";
import { CustomGetters } from "../../types/getters";
import { HeaderIndex, Pixel, UID, Zone } from "../../types/misc";
import { DOMCoordinates, Rect } from "../../types/rendering";

// ADRM TODO: duplicate
export type SheetViewports = {
  topLeft: InternalViewport | undefined;
  bottomLeft: InternalViewport | undefined;
  topRight: InternalViewport | undefined;
  bottomRight: InternalViewport;
};

export interface SheetViewContext {
  getters: CustomGetters;
  sheetId: UID;
  viewports: SheetViewports;
  sheetViewWidth: Pixel;
  sheetViewHeight: Pixel;
  gridOffsetX: Pixel;
  gridOffsetY: Pixel;
  zoomLevel: number;
}

/**
 *
 * Computes the visible coordinates & dimensions of a given zone inside the viewport
 *
 */
/**
 * Computes the coordinates and size to draw the zone on the canvas
 */
export function getVisibleRect(ctx: SheetViewContext, zone: Zone): Rect {
  const rect = getVisibleRectWithoutHeaders(ctx, zone);
  return { ...rect, x: rect.x + ctx.gridOffsetX, y: rect.y + ctx.gridOffsetY };
}

/**
 * Computes the coordinates and size to draw the zone without taking the grid offset into account
 */
export function getVisibleRectWithoutHeaders(ctx: SheetViewContext, zone: Zone): Rect {
  return mapViewportsToRect(ctx, (viewport) => viewport.getVisibleRect(zone));
}

export function getRect(ctx: SheetViewContext, zone: Zone): Rect {
  const rect = mapViewportsToRect(ctx, (viewport) => viewport.getFullRect(zone));
  return { ...rect, x: rect.x + ctx.gridOffsetX, y: rect.y + ctx.gridOffsetY };
}

export function getSheetViewVisibleCols(ctx: SheetViewContext): HeaderIndex[] {
  const viewports = getSubViewports(ctx);

  //TODO ake another commit to eimprove ctx
  return [...new Set(viewports.map((v) => range(v.left, v.right + 1)).flat())].filter(
    (col) => col >= 0 && !ctx.getters.isHeaderHidden(ctx.sheetId, "COL", col)
  );
}

export function getSheetViewVisibleRows(ctx: SheetViewContext): HeaderIndex[] {
  const viewports = getSubViewports(ctx);
  return [...new Set(viewports.map((v) => range(v.top, v.bottom + 1)).flat())].filter(
    (row) => row >= 0 && !ctx.getters.isHeaderHidden(ctx.sheetId, "ROW", row)
  );
}

export function getAllActiveViewportsZonesAndRect(
  ctx: SheetViewContext
): { zone: Zone; rect: Rect }[] {
  return getSubViewports(ctx).map((viewport) => {
    return {
      zone: viewport,
      rect: {
        x: viewport.offsetCorrectionX + ctx.gridOffsetX,
        y: viewport.offsetCorrectionY + ctx.gridOffsetY,
        ...viewport.getMaxSize(),
      },
    };
  });
}

export function getMainViewportCoordinates(ctx: SheetViewContext): DOMCoordinates {
  // ADRM TODO: is the info not in the viewports ?
  const sheetId = ctx.sheetId;
  const { xSplit, ySplit } = ctx.getters.getPaneDivisions(sheetId);
  const x = ctx.getters.getColDimensions(sheetId, xSplit).start;
  const y = ctx.getters.getRowDimensions(sheetId, ySplit).start;
  return { x, y };
}

export function mapViewportsToRect(
  ctx: SheetViewContext,
  rectCallBack: (viewport: InternalViewport) => Rect | undefined
): Rect {
  let x: Pixel = Infinity;
  let y: Pixel = Infinity;
  let width: Pixel = 0;
  let height: Pixel = 0;
  let hasViewports: boolean = false;
  for (const viewport of getSubViewports(ctx)) {
    const rect = rectCallBack(viewport);
    if (rect) {
      hasViewports = true;
      x = Math.min(x, rect.x);
      y = Math.min(y, rect.y);
      width = Math.max(width, rect.x + rect.width);
      height = Math.max(height, rect.y + rect.height);
    }
  }
  if (!hasViewports) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return { x, y, width: width - x, height: height - y };
}

export function getSubViewports(ctx: SheetViewContext): InternalViewport[] {
  return Object.values(ctx.viewports).filter(isDefined);
}
