import type { DomPlatform } from "chart.js";

let zoomAwarePlatform: typeof DomPlatform | undefined;

/**
 * Chart.js measures the canvas container with getBoundingClientRect(), which includes the CSS zoom.
 * Use its layout size instead, like the Chart.js ResizeObserver does.
 */
export function getZoomAwareChartJsPlatform(): typeof DomPlatform | undefined {
  const BaseDomPlatform = globalThis.Chart?.DomPlatform;
  if (!BaseDomPlatform) {
    return undefined;
  }
  if (!(zoomAwarePlatform?.prototype instanceof BaseDomPlatform)) {
    zoomAwarePlatform = class ZoomAwarePlatform extends BaseDomPlatform {
      getMaximumSize(
        canvas: HTMLCanvasElement,
        width?: number,
        height?: number,
        aspectRatio?: number
      ) {
        const container = canvas.parentElement;
        if ((width === undefined || height === undefined) && container) {
          width = container.clientWidth;
          height = container.clientHeight;
        }
        return super.getMaximumSize(canvas, width, height, aspectRatio);
      }
    };
  }
  return zoomAwarePlatform;
}
