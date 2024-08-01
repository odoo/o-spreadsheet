import type {
  ArcElement,
  Color,
  DoughnutController as DoughnutControllerType,
  Element,
} from "chart.js";
import type { PixelPosition, Rect } from "../../../types";
import type { NeedleOptions, ValueLabelOptions } from "../../../types/chart";

// @ts-ignore
if (window.Chart) {
  // @ts-ignore
  const DoughnutController: typeof DoughnutControllerType = window.Chart?.DoughnutController;
  /**
   * Example :
   * const chart = new Chart(ctx, {
   *   type: "gauge",
   *   data: {
   *     datasets: [
   *       {
   *         borderWidth: 5,
   *         data: [10, 20, 10],
   *         value: 23,
   *         backgroundColor: [
   *           "#dc3545", //red
   *           "#ffc107", //orange
   *           "#28a745", //green
   *         ],
   *       },
   *     ],
   *   },
   *   options: {
   *     plugins: {
   *       title: {
   *         display: true,
   *         text: "Custom Chart Title",
   *         padding: {
   *           top: 10,
   *           bottom: 30,
   *         },
   *         font : {
   *           size : 30
   *         }
   *       },
   *     },
   *     valueLabel: {
   *       display: true,
   *       format: (value) => {
   *         return value.toFixed(2) + "%";
   *       },
   *       font : {
   *         size : 35,
   *         family : "Arial",
   *         color : "#FC0",
   *       },
   *       backgroundColor : "#ccc",
   *       borderColor : "#090",
   *       borderRadius : 50
   *     },
   *     needle: {
   *       display: true,
   *       width: 50,
   *       color: "#DC5",
   *       backgroundColor : "#ccc",
   *     },
   *   },
   * });
   */
  class GaugeController extends DoughnutController {
    static id = "gauge";
    static defaults = {
      ...DoughnutController.defaults,
      circumference: 180,
      rotation: 270,
    };
    static overrides = {
      aspectRatio: 2,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
      },
    };

    get chartHeight() {
      return Math.abs(this.chart.chartArea.top - this.chart.chartArea.bottom);
    }
    get chartWidth() {
      return Math.abs(this.chart.chartArea.left - this.chart.chartArea.right);
    }

    get needleOptions(): NeedleOptions {
      const { config } = this.chart;
      const options = config.options;
      // @ts-ignore
      return options?.needle || {};
    }

    get valueLabelOptions(): ValueLabelOptions {
      const { config } = this.chart;
      const options = config.options;
      // @ts-ignore
      return options?.valueLabel || {};
    }

    get minValue(): number {
      const dataset = this.getDataset();
      // @ts-ignore
      return dataset.minValue || 0;
    }

    private getValueAngleInPercent(value: number) {
      const dataset = this.getDataset();
      const data = (dataset.data as number[]) || [];
      const max = Math.max(...data);
      const min = this.minValue;
      return (value - min) / (max - min);
    }

    private drawValueLabel(params: RenderingParams) {
      const { ctx } = this.chart;
      if (this.valueLabelOptions.display === false) {
        return;
      }

      // draw background rectangle
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = params.valueLabel.backgroundColor;
      ctx.strokeStyle = params.valueLabel.borderColor;
      ctx.roundRect(
        params.valueLabel.rect.x,
        params.valueLabel.rect.y,
        params.valueLabel.rect.width,
        params.valueLabel.rect.height,
        params.valueLabel.borderRadius
      );
      ctx.stroke();
      ctx.fill();

      // draw value text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = params.valueLabel.font;
      ctx.fillStyle = params.valueLabel.textColor;
      ctx.fillText(
        params.valueLabel.valueText,
        params.valueLabel.textPosition.x,
        params.valueLabel.textPosition.y
      );
      ctx.restore();
    }

    private drawNeedle(params: RenderingParams) {
      const { ctx } = this.chart;
      if (this.needleOptions.display === false) {
        return;
      }
      // translate & rotate next paths
      ctx.save();
      ctx.translate(params.needle.position.x, params.needle.position.y);
      ctx.rotate(-Math.PI / 2 + Math.PI * params.needle.percent);
      // draw circle
      ctx.beginPath();
      ctx.fillStyle = params.needle.backgroundColor;
      ctx.strokeStyle = params.needle.borderColor;
      ctx.ellipse(0, 0, params.needle.width / 2, params.needle.width / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      // draw needle
      ctx.fillStyle = params.needle.backgroundColor;
      ctx.strokeStyle = params.needle.borderColor;
      ctx.beginPath();
      ctx.moveTo(-params.needle.width / 2, 0);
      ctx.lineTo(0, -params.needle.height + 10);
      ctx.lineTo(+params.needle.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    private computeRenderingParams(): RenderingParams {
      const { ctx, config } = this.chart;
      const options = config.options!;

      options.layout = options.layout || {};
      options.layout.padding = options.layout.padding || {};

      const formatter = this.valueLabelOptions.formatter;
      const fmt = typeof formatter === "function" ? formatter : (value) => value;

      const dataset = this.getDataset();
      // @ts-ignore value is a custom property for gauge charts
      const value = dataset.value || 0;
      const valueText = fmt(value).toString();
      const percent = this.getValueAngleInPercent(value);

      const fontFamily = this.valueLabelOptions.font?.family || "Arial";
      const optionsFontSize = this.valueLabelOptions.font?.size || 0;
      const fontSize = optionsFontSize >= 1 ? optionsFontSize : 30;
      const font = `${fontSize}px ${fontFamily}`;
      const padding = {
        right: 0,
        left: 0,
        top: 0,
        bottom: 0,
        ...this.valueLabelOptions.padding,
      };
      padding.left = padding.left >= 0 ? padding.left : 10;
      padding.right = padding.right >= 0 ? padding.right : 10;
      padding.top = padding.top >= 0 ? padding.top : 10;
      padding.bottom = padding.bottom >= 0 ? padding.bottom : 10;

      const chartArea = this.chart.chartArea;
      const offsetX = this.offsetX || 0;
      const offsetY = this.offsetY || 0;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      const center = {
        x: centerX + offsetX,
        y: centerY + offsetY,
      };

      const textPosition = {
        x: center.x,
        y: center.y,
      };
      ctx.save();
      ctx.font = font;
      const metrics = ctx.measureText(valueText);
      ctx.restore();
      const textHeight = metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent;

      return {
        needle: {
          borderColor: this.needleOptions.borderColor || "#000",
          backgroundColor: this.needleOptions.backgroundColor || "#000",
          width: this.needleOptions.width || 10,
          height: Math.min(this.chartHeight, this.chartWidth / 2),
          position: {
            x: textPosition.x,
            y: textPosition.y,
          },
          percent,
        },
        valueLabel: {
          textColor: this.valueLabelOptions.font?.color || "#FFF",
          backgroundColor: this.valueLabelOptions.backgroundColor || "#000",
          borderColor: this.valueLabelOptions.borderColor || "#000",
          borderRadius: this.valueLabelOptions.borderRadius || 10,
          rect: {
            x: center.x - metrics.width / 2 - padding.left,
            y: center.y + textHeight / 2 + padding.top,
            width: metrics.width + padding.left + padding.right,
            height: -(textHeight + 6 + padding.top + padding.bottom),
          },
          valueText,
          textPosition,
          textHeight,
          font,
        },
      };
    }

    draw() {
      super.draw();
      const params = this.computeRenderingParams();
      this.drawNeedle(params);
      this.drawValueLabel(params);
    }

    updateElements(
      elements: Element<ArcElement, Record<string, any>>[],
      start: number,
      count: number,
      mode: "resize" | "reset" | "none" | "hide" | "show" | "default" | "active"
    ): void {
      super.updateElements(elements, start, count, mode);
      const dataset = this.getDataset();

      const data = this.getDataset().data as number[];
      // @ts-ignore
      const minValue: number = dataset.minValue;
      // @ts-ignore
      const rotation = this.chart.options.rotation || 0;
      // @ts-ignore
      const circumference = this.chart.options.circumference || 0;

      for (let arcIndex = 0; arcIndex < data.length; arcIndex++) {
        const previousValue = arcIndex === 0 ? minValue : data[arcIndex - 1];
        const startAngleInPercent = this.getValueAngleInPercent(previousValue);
        const endAngleInPercent = this.getValueAngleInPercent(data[arcIndex]);
        const startAngle =
          degreesToRadians(rotation + circumference * startAngleInPercent) - Math.PI / 2;
        const endAngle =
          degreesToRadians(rotation + circumference * endAngleInPercent) - Math.PI / 2;
        const arcCircumference = endAngle - startAngle;
        const arc = elements[arcIndex];
        const propertiesUpdates = {
          startAngle,
          endAngle,
          circumference: arcCircumference,
        };
        this.updateElement(arc, arcIndex, propertiesUpdates, mode);
      }
    }
  }

  function degreesToRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
  }

  interface RenderingParams {
    needle: {
      borderColor: Color;
      backgroundColor: Color;
      width: number;
      height: number;
      position: PixelPosition;
      percent: number;
    };
    valueLabel: {
      textColor: Color;
      backgroundColor: Color;
      borderColor: Color;
      borderRadius: number;
      rect: Rect;
      valueText: string;
      textPosition: PixelPosition;
      textHeight: number;
      font: string;
    };
  }
  // @ts-ignore
  window.Chart.register(GaugeController);
}
