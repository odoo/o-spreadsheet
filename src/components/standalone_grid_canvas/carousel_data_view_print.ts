import {
  onMounted,
  onWillUnmount,
  PluginInstance,
  providePlugins,
  useEffect,
  usePlugin,
  useProps,
  xml,
} from "@odoo/owl";
import { RendererPlugin } from "../../owl_plugins/renderer_plugin";
import { ViewportsPlugin, ViewportsPluginInstance } from "../../owl_plugins/viewports_owl_plugin";
import { useLocalStore } from "../../store_engine/store_hooks";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { GridRenderingContext, Rect } from "../../types/rendering";
import { Store } from "../../types/store_engine";
import { OSComponent } from "../os_component";
import { types } from "../props_validation";
import { StandaloneViewportStore } from "../standalone_viewport/standalone_viewport_store";

export class CarouselDataViewPrint extends OSComponent {
  static template = xml/* xml */ ``;

  props = useProps({
    range: types.Range(),
    columnWeights: types.array<number>().optional(),
    rect: types.object<Rect>(),
    rendererPlugin: types.object<PluginInstance<typeof RendererPlugin>>(),
  });

  viewPlugin!: ViewportsPluginInstance;
  gridRender!: Store<GridRenderer>;

  setup(): void {
    providePlugins([ViewportsPlugin]);
    const store = useLocalStore(
      StandaloneViewportStore,
      this.props.range,
      this.props.columnWeights
    );
    this.gridRender = useLocalStore(GridRenderer, { shouldRender: false });
    this.viewPlugin = usePlugin(ViewportsPlugin);
    useEffect(() => {
      store.setContainerSize(this.props.rect.width, this.props.rect.height);
    });

    onMounted(() => this.props.rendererPlugin.register(this));
    onWillUnmount(() => this.props.rendererPlugin.unRegister(this));
  }

  get renderingLayers() {
    return ["Chart"] as const;
  }

  drawLayer(renderingContext: GridRenderingContext) {
    const { ctx } = renderingContext;
    ctx.save();
    ctx.translate(this.props.rect.x, this.props.rect.y);

    ctx.beginPath();
    ctx.rect(0, 0, this.props.rect.width, this.props.rect.height);
    ctx.clip();

    const subRenderingCtx: GridRenderingContext = {
      ...renderingContext,
      sheetId: this.viewPlugin.displayedSheetId(),
      viewports: this.viewPlugin.viewports(),
    };
    this.gridRender.drawLayer(subRenderingCtx, "Background", undefined);
    ctx.restore();
  }
}
