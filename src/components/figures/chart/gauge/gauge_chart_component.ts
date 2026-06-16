import { onMounted, onWillUnmount, props, signal } from "@odoo/owl";
import { drawGaugeChart } from "../../../../helpers/figures/charts/gauge_chart_rendering";
import { deepEquals } from "../../../../helpers/misc";
import { Component, useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { EASING_FN } from "../../../../registries/cell_animation_registry";
import { useStore } from "../../../../store_engine/store_hooks";
import { ViewportsStore } from "../../../../stores/viewports_store";
import { GaugeChartRuntime } from "../../../../types/chart/gauge_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { types } from "../../../props_validation";
import { ChartAnimationStore } from "../chartJs/chartjs_animation_store";

const ANIMATION_DURATION = 1000;

export class GaugeChartComponent extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GaugeChartComponent";

  protected props = props({
    chartId: types.string(),
    isFullScreen: types.boolean().optional(),
  });

  private canvas = signal<HTMLCanvasElement | null>(null);

  private animationStore: Store<ChartAnimationStore> | undefined;
  private viewStore!: Store<ViewportsStore>;

  get runtime(): GaugeChartRuntime {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as GaugeChartRuntime;
  }

  setup() {
    this.viewStore = useStore(ViewportsStore);
    if (this.env.model.getters.isDashboard()) {
      this.animationStore = useStore(ChartAnimationStore);
    }

    let animation: Animation | null = null;
    let lastRuntime: GaugeChartRuntime | undefined = undefined;
    useLayoutEffect(
      () => {
        if (
          this.env.model.getters.isDashboard() &&
          lastRuntime === undefined && // first render
          this.animationStore?.animationPlayed[this.animationChartId] !== "gauge"
        ) {
          animation = this.drawGaugeWithAnimation();
          this.animationStore?.disableAnimationForChart(this.animationChartId, "gauge");
        } else if (
          this.env.model.getters.isDashboard() &&
          lastRuntime !== undefined && // not first render
          !deepEquals(this.runtime, lastRuntime)
        ) {
          animation = this.drawGaugeWithAnimation();
          this.animationStore?.disableAnimationForChart(this.animationChartId, "gauge");
        } else {
          const zoom = this.viewStore.zoomLevel;
          drawGaugeChart(this.canvasEl, this.runtime, zoom);
        }

        lastRuntime = this.runtime;
        return () => animation?.stop();
      },
      () => {
        const canvas = this.canvas();
        if (!canvas) {
          return [];
        }
        const rect = canvas.getBoundingClientRect();
        return [rect.width, rect.height, this.runtime, canvas, window.devicePixelRatio];
      }
    );
    const resizeObserver = new ResizeObserver(() => {
      if (animation) {
        animation.stop();
        animation = null;
      }
      drawGaugeChart(this.canvasEl, this.runtime, this.viewStore.zoomLevel);
    });
    onMounted(() => {
      const canvas = this.canvas();
      if (canvas) {
        resizeObserver.observe(canvas);
      }
    });
    onWillUnmount(() => resizeObserver.disconnect());
  }

  drawGaugeWithAnimation() {
    drawGaugeChart(this.canvasEl, { ...this.runtime, animationValue: 0 }, undefined);

    const gaugeValue = this.runtime.gaugeValue?.value || 0;
    const upperBound = this.runtime.maxValue.value;
    const finalValue = Math.sign(gaugeValue) * Math.min(Math.abs(gaugeValue), Math.abs(upperBound));
    if (finalValue === 0) {
      return null;
    }

    const lowerBound = this.runtime.minValue.value;
    const animation = new Animation(lowerBound, finalValue, ANIMATION_DURATION, (animationValue) =>
      drawGaugeChart(this.canvasEl, { ...this.runtime, animationValue }, undefined)
    );
    animation.start();
    return animation;
  }

  get canvasEl() {
    return this.canvas()!;
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
