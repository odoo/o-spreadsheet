import { onWillUnmount, signal, usePlugin, useProps } from "@odoo/owl";
import { drawGaugeChart } from "../../../../helpers/figures/charts/gauge_chart_rendering";
import { deepEquals } from "../../../../helpers/misc";
import { useEffectAfterPatch } from "../../../../helpers/owl3_helpers";
import { DevicePixelRatioPlugin } from "../../../../owl_plugins/device_pixel_ratio_owl_plugin";
import { ZoomPlugin } from "../../../../owl_plugins/zoom_plugin";
import { EASING_FN } from "../../../../registries/cell_animation_registry";
import { useStore } from "../../../../store_engine/store_hooks";
import { GaugeAnimatedRuntime, GaugeChartRuntime } from "../../../../types/chart/gauge_chart";
import { Store } from "../../../../types/store_engine";
import { useResizeObserver } from "../../../helpers/listener_hook";
import { useElementRect } from "../../../helpers/position_hook";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { ChartAnimationStore } from "../chartJs/chartjs_animation_store";

const ANIMATION_DURATION = 1000;

export class GaugeChartComponent extends OSComponent {
  static template = "o-spreadsheet-GaugeChartComponent";

  protected props = useProps({
    chartId: types.string(),
    isFullScreen: types.boolean().optional(),
  });

  private canvas = signal.ref(HTMLCanvasElement);

  private animationStore: Store<ChartAnimationStore> | undefined;
  private zoomPlugin = usePlugin(ZoomPlugin);
  private devicePixelRatioPlugin = usePlugin(DevicePixelRatioPlugin);
  private canvasRect = useElementRect(this.canvas);

  get runtime(): GaugeChartRuntime {
    return this.model().getters.getChartRuntime(this.props.chartId) as GaugeChartRuntime;
  }

  setup() {
    if (this.model().getters.isDashboard()) {
      this.animationStore = useStore(ChartAnimationStore);
    }

    let animation: Animation | null = null;
    let lastRuntime: GaugeChartRuntime | undefined = undefined;
    useEffectAfterPatch(() => {
      if (
        this.model().getters.isDashboard() &&
        lastRuntime === undefined && // first render
        this.animationStore?.animationPlayed[this.animationChartId] !== "gauge"
      ) {
        animation = this.drawGaugeWithAnimation();
        this.animationStore?.disableAnimationForChart(this.animationChartId, "gauge");
      } else if (
        this.model().getters.isDashboard() &&
        lastRuntime !== undefined && // not first render
        !deepEquals(this.runtime, lastRuntime)
      ) {
        animation = this.drawGaugeWithAnimation();
        this.animationStore?.disableAnimationForChart(this.animationChartId, "gauge");
      } else {
        this.drawGaugeChart(this.runtime);
      }

      lastRuntime = this.runtime;
    });
    useResizeObserver(this.canvas, () => {
      if (animation) {
        animation.stop();
        animation = null;
      }
    });
    onWillUnmount(() => animation?.stop());
  }

  drawGaugeWithAnimation() {
    this.drawGaugeChart({ ...this.runtime, animationValue: 0 });

    const gaugeValue = this.runtime.gaugeValue?.value || 0;
    const upperBound = this.runtime.maxValue.value;
    const finalValue = Math.sign(gaugeValue) * Math.min(Math.abs(gaugeValue), Math.abs(upperBound));
    if (finalValue === 0) {
      return null;
    }

    const lowerBound = this.runtime.minValue.value;
    const animation = new Animation(lowerBound, finalValue, ANIMATION_DURATION, (animationValue) =>
      this.drawGaugeChart({ ...this.runtime, animationValue })
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

  drawGaugeChart(runtime: GaugeAnimatedRuntime) {
    drawGaugeChart(
      this.canvasEl,
      runtime,
      this.devicePixelRatioPlugin.devicePixelRatio(),
      this.zoomPlugin.zoomLevel(),
      this.canvasRect()
    );
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
