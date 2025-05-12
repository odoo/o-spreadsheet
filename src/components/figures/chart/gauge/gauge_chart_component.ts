import { Component, onWillUnmount, useEffect, useRef } from "@odoo/owl";
import { drawGaugeChart } from "../../../../helpers/figures/charts/gauge_chart_rendering";
import { FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { GaugeChartRuntime } from "../../../../types/chart";

const ANIMATION_DURATION = 1000;

interface Props {
  figureUI: FigureUI;
}

export class GaugeChartComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartComponent";
  private canvas = useRef("chartContainer");

  get runtime(): GaugeChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.figureUI.id) as GaugeChartRuntime;
  }

  setup() {
    let animation: Animation | null = null;
    useEffect(
      () => {
        if (this.env.isDashboard()) {
          animation?.stop();
          animation = this.drawGaugeWithAnimation();
        } else {
          drawGaugeChart(this.canvasEl, this.runtime);
        }
      },
      () => {
        const rect = this.canvasEl.getBoundingClientRect();
        return [rect.width, rect.height, this.runtime, this.canvas.el, window.devicePixelRatio];
      }
    );
    onWillUnmount(() => {
      animation?.stop();
    });
  }

  private drawGaugeWithAnimation() {
    drawGaugeChart(this.canvasEl, { ...this.runtime, animationValue: 0 });

    const gaugeValue = this.runtime.gaugeValue?.value || 0;
    const upperBound = this.runtime.maxValue.value;
    const finalValue = Math.sign(gaugeValue) * Math.min(Math.abs(gaugeValue), Math.abs(upperBound));
    if (finalValue === 0) {
      return null;
    }

    const animation = new Animation(0, finalValue, ANIMATION_DURATION, (animationValue) =>
      drawGaugeChart(this.canvasEl, { ...this.runtime, animationValue })
    );
    animation.start();
    return animation;
  }

  get canvasEl() {
    return this.canvas.el as HTMLCanvasElement;
  }
}

GaugeChartComponent.props = {
  figureUI: Object,
};

/**
 * Animation interpolating values using the ease-out quartic curve function (chartJS default easing)
 */
class Animation {
  private startTime: number;
  private animationFrameId: number | null = null;

  constructor(
    private startValue: number,
    private endValue: number,
    private duration: number,
    private callback: (value: number) => void
  ) {
    this.startTime = performance.now();
  }

  start() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate(timestamp: number) {
    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const currentValue = this.interpolateEaseOutQuart(this.startValue, this.endValue, progress);
    this.callback(currentValue);

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.stop();
    }
  }

  private interpolateEaseOutQuart(start: number, end: number, progress: number): number {
    return start + (end - start) * (1 - (1 - progress) ** 4);
  }
}
