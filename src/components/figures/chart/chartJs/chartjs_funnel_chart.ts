import {
  BarController,
  BarControllerChartOptions,
  BarControllerDatasetOptions,
  BarElement,
  CartesianParsedData,
  CartesianScaleTypeRegistry,
  Chart,
  ChartComponent,
  TooltipPositionerFunction,
} from "chart.js";
import { AnyObject } from "chart.js/dist/types/basic";

export function getFunnelChartController(): ChartComponent & {
  prototype: BarController;
  new (chart: Chart, datasetIndex: number): BarController;
} {
  if (!globalThis.Chart) {
    throw new Error("Chart.js library is not loaded");
  }
  return class FunnelChartController extends globalThis.Chart.BarController {
    static id = "funnel";
    static defaults = {
      ...globalThis.Chart?.BarController.defaults,
      dataElementType: "funnel",
      animation: {
        duration: (ctx: any) => {
          if (ctx.type !== "data") {
            return 1000;
          }
          const value = ctx.raw[1];
          const maxValue = Math.max(...ctx.dataset.data.map((data: [number, number]) => data[1]));
          return 1000 * (value / maxValue);
        },
      },
    };

    /** Called at each chart render to update the elements of the chart (FunnelChartElement) with the updated data */
    updateElements(rects, start, count, mode) {
      super.updateElements(rects, start, count, mode);
      for (let i = start; i < start + count; i++) {
        const rect = rects[i];
        // Add the next element to the element's props so we can get the bottom width of the trapezoid
        this.updateElement(rect, i, { nextElement: rects[i + 1] }, mode);
      }
    }
  };
}

export function getFunnelChartElement(): ChartComponent & {
  prototype: BarElement;
  new (cfg: AnyObject): BarElement;
} {
  if (!globalThis.Chart) {
    throw new Error("Chart.js library is not loaded");
  }
  /**
   * Similar to a bar chart element, but it's a trapezoid rather than a rectangle. The top is of width
   * `width`, and the bottom is of width `nextElementWidth`.
   */
  return class FunnelChartElement extends globalThis.Chart.BarElement {
    static id = "funnel";

    /** Overwrite this to draw a trapezoid rather then a rectangle */
    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();

      const props = ["x", "y", "width", "height", "nextElement", "base", "options"];
      const { x, y, height, nextElement, base, options } = this.getProps(props) as any;
      const width = getElementWidth(this);
      const nextElementWidth = nextElement ? getElementWidth(nextElement) : 0;
      const offset = (width - nextElementWidth) / 2;

      const startX = Math.min(x, base);
      const startY = y - height / 2;

      ctx.fillStyle = options.backgroundColor;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + width, startY);
      ctx.lineTo(startX + width - offset, startY + height);
      ctx.lineTo(startX + offset, startY + height);
      ctx.closePath();
      ctx.fill();
      if (options.borderWidth) {
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = options.borderWidth;
        ctx.stroke();
      }

      ctx.restore();
    }

    /** Check if the mouse is inside the trapezoid */
    inRange(mouseX: number, mouseY: number) {
      const props = ["x", "y", "width", "height", "nextElement", "base", "options"];
      const { x, y, height, nextElement, base } = this.getProps(props) as any;
      const width = getElementWidth(this);
      const nextElementWidth = nextElement ? getElementWidth(nextElement) : 0;

      const startX = Math.min(x, base);
      const startY = y - height / 2;
      if (mouseY < startY || mouseY > startY + height) {
        return false;
      }
      const offset = (width - nextElementWidth) / 2;
      const left = startX + (offset * (mouseY - startY)) / height;
      const right = startX + width - (offset * (mouseY - startY)) / height;
      if (mouseX < left || mouseX > right) {
        return false;
      }

      return true;
    }
  };
}

/**
 * Get an element width.
 *
 * The property width is undefined during animations, we need to compute it manually.
 */
function getElementWidth(element: BarElement) {
  const { x, base } = element.getProps(["x", "base"]) as any;
  const left = Math.min(x, base);
  const right = Math.max(x, base);
  return right - left;
}

/**
 * Position the tooltip inside the trapezoid.
 * The default position for tooltips of bar elements is at the end of rectangle, which is not ideal for trapezoids.
 */
export const funnelTooltipPositioner: TooltipPositionerFunction<"funnel"> = function (elements) {
  if (!elements.length) {
    return { x: 0, y: 0 };
  }

  const element = elements[0].element;
  const { x, y, base, width, height } = element.getProps(["x", "y", "width", "height", "base"]);
  const startX = Math.min(x, base);
  const startY = y - height / 2;

  return {
    x: startX + (width * 2) / 3,
    y: startY + height / 2,
  };
};

declare module "chart.js" {
  interface ChartTypeRegistry {
    funnel: {
      chartOptions: BarControllerChartOptions;
      datasetOptions: BarControllerDatasetOptions;
      defaultDataPoint: number | [number, number] | null;
      metaExtensions: {};
      parsedDataType: CartesianParsedData;
      scales: keyof CartesianScaleTypeRegistry;
    };
  }

  export interface TooltipPositionerMap {
    funnelTooltipPositioner: TooltipPositionerFunction<"funnel"> | undefined;
  }
}
