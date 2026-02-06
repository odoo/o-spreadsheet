import { drawGaugeChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/gauge_chart_rendering";
import { GaugeChartRuntime, GaugeChartStyle } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { deepEquals } from "../../../../helpers";
import { GaugeChart } from "../../../../helpers/figures/charts/gauge_chart";
import { EASING_FN } from "../../../../registries/cell_animation_registry";
import { Store, useStore } from "../../../../store_engine";
import { UID } from "../../../../types";
import { ChartAnimationStore } from "../chartJs/chartjs_animation_store";

const ANIMATION_DURATION = 1000;

interface Props {
  chartId: UID;
  isFullScreen?: boolean;
}

export class GaugeChartComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartComponent";
  static props = {
    chartId: String,
    isFullScreen: { type: Boolean, optional: true },
  };

  private canvas = useRef("chartContainer");

  private animationStore: Store<ChartAnimationStore> | undefined;

  get runtime(): GaugeChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as GaugeChartRuntime;
  }

  get style(): GaugeChartStyle {
    const chart = this.env.model.getters.getChart(this.props.chartId) as GaugeChart;
    return this.env.model.getters.getStyleOfSingleCellChart(chart.background, chart.dataRange);
  }

  setup() {
    if (this.env.model.getters.isDashboard()) {
      this.animationStore = useStore(ChartAnimationStore);
    }

    let animation: Animation | null = null;
    let lastRuntime: GaugeChartRuntime | undefined = undefined;
    useEffect(
      () => {
        if (
          this.env.isDashboard() &&
          lastRuntime === undefined && // first render
          this.animationStore?.animationPlayed[this.animationChartId] !== "gauge"
        ) {
          animation = this.drawGaugeWithAnimation();
          this.animationStore?.disableAnimationForChart(this.animationChartId, "gauge");
        } else if (
          this.env.isDashboard() &&
          lastRuntime !== undefined && // not first render
          !deepEquals(this.runtime, lastRuntime)
        ) {
          animation = this.drawGaugeWithAnimation();
          this.animationStore?.disableAnimationForChart(this.animationChartId, "gauge");
        } else {
          drawGaugeChart(this.canvasEl, this.runtime, this.style);
        }

        lastRuntime = this.runtime;
        return () => animation?.stop();
      },
      () => {
        const rect = this.canvasEl.getBoundingClientRect();
        return [
          rect.width,
          rect.height,
          this.runtime,
          this.style,
          this.canvas.el,
          window.devicePixelRatio,
        ];
      }
    );
  }

  drawGaugeWithAnimation() {
    drawGaugeChart(this.canvasEl, { ...this.runtime, animationValue: 0 }, this.style, undefined);

    const gaugeValue = this.runtime.gaugeValue?.value || 0;
    const upperBound = this.runtime.maxValue.value;
    const finalValue = Math.sign(gaugeValue) * Math.min(Math.abs(gaugeValue), Math.abs(upperBound));
    if (finalValue === 0) {
      return null;
    }

    const lowerBound = this.runtime.minValue.value;
    const animation = new Animation(lowerBound, finalValue, ANIMATION_DURATION, (animationValue) =>
      drawGaugeChart(this.canvasEl, { ...this.runtime, animationValue }, this.style, undefined)
    );
    animation.start();
    return animation;
  }

  get canvasEl() {
    return this.canvas.el as HTMLCanvasElement;
  }

  get animationChartId() {
    return this.props.isFullScreen ? this.props.chartId + "-fullscreen" : this.props.chartId;
  }
}

/**
 * Animation interpolating values using the ease-out quartic curve function (chartJS default easing)
 */
class Animation {
  private startTime: number | undefined = undefined;
  private animationFrameId: number | null = null;

  constructor(
    private startValue: number,
    private endValue: number,
    private duration: number,
    private callback: (value: number) => void
  ) {}

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
    if (!this.startTime) {
      this.startTime = timestamp;
    }
    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const currentValue =
      this.startValue + (this.endValue - this.startValue) * EASING_FN.easeOutQuart(progress);
    this.callback(currentValue);

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.stop();
    }
  }
}
