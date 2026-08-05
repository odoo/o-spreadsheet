import { onMounted, onWillUnmount, useEffect, useProps, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useChildStoreProvider, useLocalStore, useStore } from "../../store_engine/store_hooks";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { GridRenderingContext, Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { types } from "../props_validation";
import { StandaloneViewportStore } from "../standalone_viewport/standalone_viewport_store";

export class CarouselDataViewPrint extends Component<SpreadsheetChildEnv> {
  static template = xml/* xml */ ``;

  props = useProps({
    range: types.Range(),
    columnWeights: types.array<number>().optional(),
    rect: types.object<Rect>(),
    rendererStore: types.object<Store<RendererStore>>(),
  });

  viewportsStore!: Store<ViewportsStore>;
  gridRender!: Store<GridRenderer>;

  setup(): void {
    useChildStoreProvider([ViewportsStore]);
    const store = useLocalStore(
      StandaloneViewportStore,
      this.props.range,
      this.props.columnWeights
    );
    this.gridRender = useLocalStore(GridRenderer, null);
    this.viewportsStore = useStore(ViewportsStore);
    useEffect(() => {
      store.setContainerSize(this.props.rect.width, this.props.rect.height);
    });

    onMounted(() => this.props.rendererStore.register(this));
    onWillUnmount(() => this.props.rendererStore.unRegister(this));
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
      sheetId: this.viewportsStore.displayedSheetId,
      viewports: this.viewportsStore.viewports,
    };
    this.gridRender.drawLayer(subRenderingCtx, "Background", undefined);
    ctx.restore();
  }
}
