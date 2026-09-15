import {
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
