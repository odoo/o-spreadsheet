import {
  centeredContentMargin,
  nextWheelZoomLevel,
  rescaleDimensionsForZoom,
  ZOOM_WHEEL_STEP,
  zoomedScrollOffset,
} from "../../../src/components/helpers/zoom";
import { MAX_ZOOM, MIN_ZOOM } from "../../../src/constants";

describe("nextWheelZoomLevel", () => {
  test("zooms in on negative deltaY", () => {
    expect(nextWheelZoomLevel(1, -100)).toBeCloseTo(1 * (1 + ZOOM_WHEEL_STEP));
  });

  test("zooms out on positive deltaY", () => {
    expect(nextWheelZoomLevel(1, 100)).toBeCloseTo(1 * (1 - ZOOM_WHEEL_STEP));
  });

  test("ignores deltaY magnitude, only its sign matters", () => {
    expect(nextWheelZoomLevel(1, -1)).toBe(nextWheelZoomLevel(1, -1000));
    expect(nextWheelZoomLevel(1, 1)).toBe(nextWheelZoomLevel(1, 1000));
  });

  test("clamps to MAX_ZOOM when zooming in past the limit", () => {
    expect(nextWheelZoomLevel(MAX_ZOOM, -100)).toBe(MAX_ZOOM);
  });

  test("clamps to MIN_ZOOM when zooming out past the limit", () => {
    expect(nextWheelZoomLevel(MIN_ZOOM, 100)).toBe(MIN_ZOOM);
  });
});

describe("zoomedScrollOffset", () => {
  test("keeps the cursor point fixed when zooming in", () => {
    const offset = zoomedScrollOffset({ scrollX: 0, scrollY: 0 }, { x: 100, y: 200 }, 1, 2);
    expect(offset).toEqual({ offsetX: 50, offsetY: 100 });
  });

  test("is a no-op when the zoom level doesn't change", () => {
    const offset = zoomedScrollOffset({ scrollX: 42, scrollY: 17 }, { x: 100, y: 200 }, 1.5, 1.5);
    expect(offset).toEqual({ offsetX: 42, offsetY: 17 });
  });

  test("round-trips back to the original scroll when zooming back to the original level", () => {
    const scroll = { scrollX: 30, scrollY: 60 };
    const cursor = { x: 120, y: 80 };
    const zoomedIn = zoomedScrollOffset(scroll, cursor, 1, 1.5);
    const backToOriginal = zoomedScrollOffset(
      { scrollX: zoomedIn.offsetX, scrollY: zoomedIn.offsetY },
      cursor,
      1.5,
      1
    );
    expect(backToOriginal.offsetX).toBeCloseTo(scroll.scrollX);
    expect(backToOriginal.offsetY).toBeCloseTo(scroll.scrollY);
  });
});

describe("centeredContentMargin", () => {
  test("centers content that's narrower than the available width", () => {
    expect(centeredContentMargin(1000, 400, 1)).toBe(300);
  });

  test("shrinks as the zoom level grows the content", () => {
    expect(centeredContentMargin(1000, 400, 2)).toBe(100);
  });

  test("clamps to 0 once the content fills or overflows the available width", () => {
    expect(centeredContentMargin(1000, 400, 3)).toBe(0);
    expect(centeredContentMargin(1000, 400, 10)).toBe(0);
  });
});

describe("zoomedScrollOffset with a centered-content margin", () => {
  // e.g. the dashboard: content narrower than the zoom root gets auto-centered, so the margin
  // between the zoom-root origin and the actual content shrinks as zoom grows the content.
  const availableWidth = 1000;
  const contentWidth = 400;

  function sheetPointUnderCursor(cursorX: number, scrollX: number, zoom: number): number {
    const margin = centeredContentMargin(availableWidth, contentWidth, zoom);
    return scrollX + (cursorX - margin) / zoom;
  }

  test("keeps the sheet point under the cursor fixed even though the centering margin changes with zoom", () => {
    const scroll = { scrollX: 0, scrollY: 0 };
    const cursor = { x: 650, y: 0 }; // inside the (initially) centered content, off-center
    const oldZoom = 1;
    const newZoom = 1.5;
    const sheetPointBefore = sheetPointUnderCursor(cursor.x, scroll.scrollX, oldZoom);

    const offset = zoomedScrollOffset(scroll, cursor, oldZoom, newZoom, {
      old: centeredContentMargin(availableWidth, contentWidth, oldZoom),
      new: centeredContentMargin(availableWidth, contentWidth, newZoom),
    });

    const sheetPointAfter = sheetPointUnderCursor(cursor.x, offset.offsetX, newZoom);
    expect(sheetPointAfter).toBeCloseTo(sheetPointBefore);
  });

  test("without the margin, the sheet point under the cursor drifts once the margin changes with zoom", () => {
    const scroll = { scrollX: 0, scrollY: 0 };
    const cursor = { x: 650, y: 0 };
    const oldZoom = 1;
    const newZoom = 1.5;
    const sheetPointBefore = sheetPointUnderCursor(cursor.x, scroll.scrollX, oldZoom);

    // same call, but without accounting for the (changing) centering margin
    const offset = zoomedScrollOffset(scroll, cursor, oldZoom, newZoom);

    const sheetPointAfter = sheetPointUnderCursor(cursor.x, offset.offsetX, newZoom);
    expect(sheetPointAfter).not.toBeCloseTo(sheetPointBefore);
  });
});

describe("rescaleDimensionsForZoom", () => {
  test("shrinks the logical dimension when zooming in", () => {
    const dims = rescaleDimensionsForZoom({ width: 1000, height: 500 }, 1, 2);
    expect(dims).toEqual({ width: 500, height: 250 });
  });

  test("grows the logical dimension when zooming out", () => {
    const dims = rescaleDimensionsForZoom({ width: 1000, height: 500 }, 1, 0.5);
    expect(dims).toEqual({ width: 2000, height: 1000 });
  });

  test("is a no-op when the zoom level doesn't change", () => {
    const dims = rescaleDimensionsForZoom({ width: 1000, height: 500 }, 1.3, 1.3);
    expect(dims).toEqual({ width: 1000, height: 500 });
  });

  test("round-trips back to the original dimension when zooming back to the original level", () => {
    const dims = { width: 800, height: 600 };
    const zoomedIn = rescaleDimensionsForZoom(dims, 1, 1.75);
    const backToOriginal = rescaleDimensionsForZoom(zoomedIn, 1.75, 1);
    expect(backToOriginal.width).toBeCloseTo(dims.width);
    expect(backToOriginal.height).toBeCloseTo(dims.height);
  });
});
